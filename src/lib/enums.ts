// Os valores de "enum" são strings simples na base de dados, validadas aqui
// (mantém o schema simples e portável entre providers do Prisma).

export const Role = {
  ADMIN: "ADMIN",
  APPROVER: "APPROVER",
  // Gestor de Licenças (Apoio Administrativo): recebe os pedidos de
  // licença aprovados e marca o acesso como dado / licença como libertada.
  SUPPORT: "SUPPORT",
  USER: "USER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// Nível hierárquico pessoal do utilizador na organização, do mais júnior
// ao mais sénior. Independente do Role (que controla permissões no
// sistema) - o Level é só contexto organizacional.
export const Level = {
  TECNICO: "TECNICO",
  GESTAO: "GESTAO",
  COORDENACAO: "COORDENACAO",
  DIRECAO: "DIRECAO",
  CONSELHO: "CONSELHO",
} as const;
export type Level = (typeof Level)[keyof typeof Level];

export const LEVEL_ORDER: Level[] = [
  Level.TECNICO,
  Level.GESTAO,
  Level.COORDENACAO,
  Level.DIRECAO,
  Level.CONSELHO,
];

export const DocumentType = {
  // Entradas
  INVOICE: "INVOICE", // vem da Direção Financeira
  EMAIL: "EMAIL", // vem do Conselho de Administração
  OFICIO_IN: "OFICIO_IN", // ofício recebido (Conselho de Administração)
  EXTERNAL: "EXTERNAL", // documento externo (Conselho de Administração)
  CONTRACT: "CONTRACT",
  OTHER: "OTHER",
  // Saídas (feitas na DANAD, com template)
  INFORMACAO: "INFORMACAO",
  OFICIO: "OFICIO",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentFlow = {
  IN: "IN", // entrada: chega à Direção e circula para baixo
  OUT: "OUT", // saída: informação/ofício feito cá e que sobe para aprovação
} as const;
export type DocumentFlow = (typeof DocumentFlow)[keyof typeof DocumentFlow];

export const DocumentStatus = {
  // Entradas
  RECEIVED: "RECEIVED",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
  // Saídas
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  RETURNED: "RETURNED",
  APPROVED: "APPROVED",
  SENT: "SENT",
  // Documentos antigos
  PENDING: "PENDING",
  REJECTED: "REJECTED",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const AuditAction = {
  UPLOADED: "UPLOADED",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMMENTED: "COMMENTED",
  REASSIGNED: "REASSIGNED",
  REGISTERED: "REGISTERED",
  CREATED: "CREATED",
  EDITED: "EDITED",
  FORWARDED: "FORWARDED",
  OPINION: "OPINION",
  RETURNED: "RETURNED",
  CLOSED: "CLOSED",
  SENT: "SENT",
  ATTACHED: "ATTACHED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const LicenseType = {
  FULL: "FULL",
  VIEW: "VIEW",
} as const;
export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];

export const LicenseStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  GRANTED: "GRANTED",
  REVOKED: "REVOKED",
} as const;
export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus];

export const LicenseAction = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  GRANTED: "GRANTED",
  REVOKED: "REVOKED",
  EMAIL_FAILED: "EMAIL_FAILED",
} as const;
export type LicenseAction = (typeof LicenseAction)[keyof typeof LicenseAction];
