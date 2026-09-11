// SQLite (usado em dev) não suporta enums nativos no Prisma, por isso os
// valores de "enum" são strings simples na base de dados, validadas aqui.

export const Role = {
  ADMIN: "ADMIN",
  APPROVER: "APPROVER",
  USER: "USER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

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
