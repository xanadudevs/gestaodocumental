import { prisma } from "@/lib/prisma";
import { appUrl, escapeHtml, sendMail, type MailMessage } from "@/lib/mail";
import { productName } from "@/lib/licenses";
import { LICENSE_TYPE_LABELS } from "@/lib/labels";
import { LicenseAction } from "@/lib/enums";

type RequestForMail = {
  id: string;
  product: string;
  licenseType: string;
  beneficiaryName: string;
  beneficiaryEmail: string;
  jobTitle: string | null;
  superiorName: string;
  superiorEmail: string;
  justification: string;
  project: string | null;
  decisionReason: string | null;
  coordination: { name: string };
  direction: { name: string };
  coordinator: { name: string | null; email: string | null };
  requestedBy: { name: string | null; email: string | null };
};

export const licenseRequestMailInclude = {
  coordination: { select: { name: true } },
  direction: { select: { name: true } },
  coordinator: { select: { name: true, email: true } },
  requestedBy: { select: { name: true, email: true } },
} as const;

// Emails do Apoio Administrativo (pode ser uma lista separada por vírgulas).
export function supportEmails() {
  return (process.env.LICENSE_SUPPORT_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function title(r: RequestForMail) {
  return `${productName(r.product)} ${LICENSE_TYPE_LABELS[r.licenseType] ?? r.licenseType}`;
}

function details(r: RequestForMail) {
  const rows: [string, string][] = [
    ["Licença", title(r)],
    ["Beneficiário", r.beneficiaryName],
    ["Email profissional", r.beneficiaryEmail],
    ...(r.jobTitle ? [["Função", r.jobTitle] as [string, string]] : []),
    ["Superior hierárquico", `${r.superiorName} <${r.superiorEmail}>`],
    ["Coordenação", r.coordination.name],
    ["Direção", r.direction.name],
    ...(r.project ? [["Projeto", r.project] as [string, string]] : []),
    ["Justificação", r.justification],
    ["Coordenador", r.coordinator.name ?? r.coordinator.email ?? "—"],
    ["Pedido por", r.requestedBy.name ?? r.requestedBy.email ?? "—"],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html =
    '<table cellpadding="4" style="border-collapse:collapse;font-size:14px">' +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="color:#666;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`
      )
      .join("") +
    "</table>";
  return { text, html };
}

function build(r: RequestForMail, intro: string, cta: string | null, extra?: MailMessage["cc"]) {
  const url = appUrl(`/licencas/${r.id}`);
  const d = details(r);
  return {
    cc: extra,
    text: `${intro}\n\n${d.text}\n\n${cta ? `${cta}: ${url}` : url}`,
    html:
      `<p>${escapeHtml(intro)}</p>${d.html}` +
      `<p><a href="${escapeHtml(url)}">${escapeHtml(cta ?? "Ver pedido")}</a></p>`,
  };
}

export function requestedMail(r: RequestForMail): MailMessage | null {
  if (!r.coordinator.email) return null;
  return {
    to: r.coordinator.email,
    subject: `[Licenças] Pedido de ${title(r)} para ${r.beneficiaryName} - aguarda a sua aprovação`,
    ...build(
      r,
      `Foi submetido um pedido de licença ${title(r)} que aguarda a sua aprovação como coordenador.`,
      "Aprovar ou rejeitar o pedido"
    ),
  };
}

export function approvedMail(r: RequestForMail): MailMessage | null {
  const to = supportEmails();
  if (to.length === 0) return null;
  return {
    to,
    subject: `[Licenças] Dar acesso ${title(r)} a ${r.beneficiaryName}`,
    ...build(
      r,
      `O pedido de licença ${title(r)} foi aprovado pelo coordenador. Por favor, dê o acesso e marque-o como atribuído na aplicação.`,
      "Marcar acesso como dado",
      r.beneficiaryEmail
    ),
  };
}

export function rejectedMail(r: RequestForMail): MailMessage {
  const cc = r.requestedBy.email && r.requestedBy.email !== r.beneficiaryEmail ? r.requestedBy.email : undefined;
  return {
    to: r.beneficiaryEmail,
    subject: `[Licenças] Pedido de ${title(r)} rejeitado`,
    ...build(r, `O pedido de licença ${title(r)} foi rejeitado. Motivo: ${r.decisionReason ?? "—"}`, null, cc),
  };
}

export function grantedMail(r: RequestForMail): MailMessage {
  return {
    to: r.beneficiaryEmail,
    subject: `[Licenças] Acesso ${title(r)} atribuído`,
    ...build(r, `O seu acesso ${title(r)} já foi atribuído pelo Apoio Administrativo.`, null),
  };
}

// Envia o email sem nunca fazer falhar a operação principal - uma falha
// (ou a falta de destinatário) fica registada no histórico do pedido.
export async function notify(
  requestId: string,
  actorId: string,
  message: MailMessage | null,
  missingRecipient?: string
) {
  if (!message) {
    if (missingRecipient) {
      await prisma.licenseEvent.create({
        data: { requestId, actorId, action: LicenseAction.EMAIL_FAILED, meta: missingRecipient },
      });
    }
    return;
  }
  try {
    await sendMail(message);
  } catch (err) {
    console.error("[mail] falha ao enviar email", err);
    await prisma.licenseEvent.create({
      data: {
        requestId,
        actorId,
        action: LicenseAction.EMAIL_FAILED,
        meta: `${message.subject} (${err instanceof Error ? err.message : "erro"})`,
      },
    });
  }
}
