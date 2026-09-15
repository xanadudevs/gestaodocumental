// Os valores de "enum" são strings simples na base de dados, validadas aqui
// (mantém o schema simples e portável entre providers do Prisma).

export const Role = {
  ADMIN: "ADMIN",
  APPROVER: "APPROVER",
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
  INVOICE: "INVOICE",
  EMAIL: "EMAIL",
  CONTRACT: "CONTRACT",
  OTHER: "OTHER",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentStatus = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
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
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
