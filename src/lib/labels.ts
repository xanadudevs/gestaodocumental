export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Fatura",
  EMAIL: "Email",
  CONTRACT: "Contrato",
  OTHER: "Outro",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  UPLOADED: "carregou o documento",
  SUBMITTED: "submeteu para aprovação",
  APPROVED: "aprovou o documento",
  REJECTED: "rejeitou o documento",
  COMMENTED: "comentou",
  REASSIGNED: "reatribuiu o aprovador",
};

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
