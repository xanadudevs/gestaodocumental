import type { Prisma, PrismaClient } from "@prisma/client";
import { DocumentFlow, DocumentStatus, DocumentType, LEVEL_ORDER, Level, Role } from "@/lib/enums";
import { ORG_CHART } from "@/lib/orgChart";

type Db = PrismaClient | Prisma.TransactionClient;

// Tipos de entrada e a origem habitual de cada um.
export const ENTRY_TYPES = [
  { type: DocumentType.INVOICE, origin: "Direção Financeira" },
  { type: DocumentType.EMAIL, origin: "Conselho de Administração" },
  { type: DocumentType.OFICIO_IN, origin: "Conselho de Administração" },
  { type: DocumentType.EXTERNAL, origin: "Conselho de Administração" },
  { type: DocumentType.OTHER, origin: "" },
] as const;

export const OUTGOING_TYPES: string[] = [DocumentType.INFORMACAO, DocumentType.OFICIO];

export function defaultOrigin(type: string) {
  return ENTRY_TYPES.find((t) => t.type === type)?.origin ?? "";
}

export function isOutgoing(doc: { flow: string }) {
  return doc.flow === DocumentFlow.OUT;
}

// Documentos antigos (antes do circuito novo) não têm referência.
export function isLegacy(doc: { reference: string | null }) {
  return !doc.reference;
}

export function levelRank(level: string | null | undefined) {
  return level ? LEVEL_ORDER.indexOf(level as Level) : -1;
}

export type Actor = { id: string; role: string; level: string | null };

export function isDirector(user: Actor) {
  return user.role === Role.ADMIN || levelRank(user.level) >= levelRank(Level.DIRECAO);
}

// Diretor da DANAD: quem recebe as entradas por omissão.
export async function findDirector(db: Db) {
  return (
    (await db.user.findFirst({
      where: { level: Level.DIRECAO, unit: { name: ORG_CHART.name } },
      orderBy: { createdAt: "asc" },
    })) ?? (await db.user.findFirst({ where: { role: Role.ADMIN }, orderBy: { createdAt: "asc" } }))
  );
}

export const DocumentActionType = {
  FORWARD: "FORWARD", // encaminhar (para baixo ou para o lado)
  OPINION: "OPINION", // dar parecer e devolver para cima
  SUBMIT: "SUBMIT", // autor submete informação/ofício para apreciação
  APPROVE: "APPROVE", // Diretor aprova (despacho)
  RETURN: "RETURN", // devolver ao autor para corrigir
  CLOSE: "CLOSE", // concluir uma entrada
  SEND: "SEND", // marcar informação/ofício aprovado como enviado
  EDIT: "EDIT", // editar o conteúdo (rascunho/devolvido)
} as const;
export type DocumentActionType = (typeof DocumentActionType)[keyof typeof DocumentActionType];

type DocForActions = {
  flow: string;
  status: string;
  reference: string | null;
  holderId: string | null;
  uploadedById: string;
};

// Ações que o utilizador pode fazer agora sobre o documento.
export function availableActions(doc: DocForActions, user: Actor): DocumentActionType[] {
  if (isLegacy(doc)) return [];
  const admin = user.role === Role.ADMIN;
  const holds = doc.holderId === user.id || admin;
  const author = doc.uploadedById === user.id || admin;
  const actions: DocumentActionType[] = [];

  if (!isOutgoing(doc)) {
    if ((doc.status === DocumentStatus.RECEIVED || doc.status === DocumentStatus.IN_PROGRESS) && holds) {
      actions.push(DocumentActionType.FORWARD);
      if (doc.status === DocumentStatus.IN_PROGRESS) actions.push(DocumentActionType.OPINION);
      if (isDirector(user)) actions.push(DocumentActionType.CLOSE);
    }
    return actions;
  }

  switch (doc.status) {
    case DocumentStatus.DRAFT:
    case DocumentStatus.RETURNED:
      if (author) actions.push(DocumentActionType.EDIT, DocumentActionType.SUBMIT);
      break;
    case DocumentStatus.IN_REVIEW:
      if (holds) {
        actions.push(DocumentActionType.OPINION, DocumentActionType.FORWARD, DocumentActionType.RETURN);
        if (isDirector(user)) actions.push(DocumentActionType.APPROVE);
      }
      break;
    case DocumentStatus.APPROVED:
      if (author || holds) actions.push(DocumentActionType.SEND);
      break;
  }
  return actions;
}

// Textos com vários parágrafos (um por linha não vazia).
export function paragraphs(text: unknown): string[] {
  if (typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
