export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Fatura",
  EMAIL: "Email",
  OFICIO_IN: "Ofício recebido",
  EXTERNAL: "Documento externo",
  CONTRACT: "Contrato",
  OTHER: "Outro",
  INFORMACAO: "Informação",
  OFICIO: "Ofício",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Por distribuir",
  IN_PROGRESS: "Em tratamento",
  CLOSED: "Concluído",
  DRAFT: "Rascunho",
  IN_REVIEW: "Em apreciação",
  RETURNED: "Devolvido",
  APPROVED: "Aprovado",
  SENT: "Enviado",
  PENDING: "Pendente",
  REJECTED: "Rejeitado",
};

export const LEVEL_LABELS: Record<string, string> = {
  TECNICO: "Técnico",
  GESTAO: "Gestão",
  COORDENACAO: "Coordenação",
  DIRECAO: "Direção",
  CONSELHO: "Conselho",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  UPLOADED: "carregou o documento",
  SUBMITTED: "submeteu para apreciação",
  APPROVED: "aprovou o documento",
  REJECTED: "rejeitou o documento",
  COMMENTED: "comentou",
  REASSIGNED: "reatribuiu o aprovador",
  REGISTERED: "registou a entrada",
  CREATED: "criou o documento",
  EDITED: "editou o documento",
  FORWARDED: "encaminhou",
  OPINION: "deu parecer",
  RETURNED: "devolveu",
  CLOSED: "concluiu",
  SENT: "marcou como enviado",
  ATTACHED: "anexou ficheiro(s)",
};

export function formatUserOrg(user: { unit?: { name: string } | null; level?: string | null }) {
  const parts: string[] = [];
  if (user.unit) parts.push(user.unit.name);
  if (user.level) parts.push(LEVEL_LABELS[user.level] ?? user.level);
  return parts.join(" · ");
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  APPROVER: "Aprovador",
  SUPPORT: "Gestor de Licenças",
  USER: "Utilizador",
};

export const LICENSE_TYPE_LABELS: Record<string, string> = {
  FULL: "Full",
  VIEW: "View",
};

export const LICENSE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Aguarda coordenador",
  APPROVED: "Aguarda atribuição",
  REJECTED: "Rejeitado",
  GRANTED: "Ativa",
  REVOKED: "Libertada",
};

export const LICENSE_ACTION_LABELS: Record<string, string> = {
  REQUESTED: "pediu a licença",
  APPROVED: "aprovou o pedido",
  REJECTED: "rejeitou o pedido",
  GRANTED: "deu o acesso",
  REVOKED: "libertou a licença",
  EMAIL_FAILED: "— falhou o envio de email",
};
