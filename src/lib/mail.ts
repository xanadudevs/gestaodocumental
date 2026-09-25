import nodemailer from "nodemailer";

// Envio de emails por SMTP (ex: Office 365 da SPMS: smtp.office365.com,
// porta 587). Sem SMTP_HOST configurado, os emails não são enviados - só
// ficam registados no log do servidor - para a app funcionar na mesma em
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

// Devolve true se o email foi enviado, false se o SMTP não está
// configurado. Lança erro se o envio falhar.
export async function sendMail(message: MailMessage): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.info(`[mail] SMTP não configurado - email não enviado: "${message.subject}" para ${message.to}`);
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
