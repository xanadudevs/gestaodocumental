import nodemailer from "nodemailer";

// Envio de emails, por ordem de preferência:
// 1. Microsoft Graph (Office 365) - com MS_GRAPH_TENANT_ID,
//    MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET e MS_GRAPH_SENDER. É a forma
//    recomendada para Office 365 (a Microsoft está a desligar o SMTP com
//    password simples).
// 2. SMTP (Gmail, Brevo, etc.) - com SMTP_HOST.
// Sem nenhum configurado, os emails não são enviados - só ficam
// registados no log do servidor - para a app funcionar na mesma em
// desenvolvimento.

export type MailMessage = {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

function graphConfig() {
  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  const sender = process.env.MS_GRAPH_SENDER;
  if (!tenantId || !clientId || !clientSecret || !sender) return null;
  return { tenantId, clientId, clientSecret, sender };
}

let graphToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(cfg: NonNullable<ReturnType<typeof graphConfig>>) {
  if (graphToken && graphToken.expiresAt > Date.now() + 60_000) return graphToken.value;
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Microsoft Graph: falha na autenticação (${data.error_description ?? data.error ?? res.status})`);
  }
  graphToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return graphToken.value;
}

function toRecipients(value: string | string[] | undefined) {
  const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return list.map((address) => ({ emailAddress: { address } }));
}

// Envia pela caixa de correio MS_GRAPH_SENDER (Graph /users/{id}/sendMail).
async function sendWithGraph(cfg: NonNullable<ReturnType<typeof graphConfig>>, message: MailMessage) {
  const token = await getGraphToken(cfg);
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: "HTML", content: message.html },
        toRecipients: toRecipients(message.to),
        ccRecipients: toRecipients(message.cc),
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Microsoft Graph: falha no envio (${data.error?.message ?? res.status})`);
  }
}

// Devolve true se o email foi enviado, false se não há envio de email
// configurado. Lança erro se o envio falhar.
export async function sendMail(message: MailMessage): Promise<boolean> {
  const graph = graphConfig();
  if (graph) {
    await sendWithGraph(graph, message);
    return true;
  }
  const t = getTransporter();
  if (!t) {
    console.info(`[mail] Email não configurado - não enviado: "${message.subject}" para ${message.to}`);
    return false;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    ...message,
  });
  return true;
}

export function appUrl(path: string) {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
