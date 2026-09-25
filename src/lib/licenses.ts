import type { Prisma, PrismaClient } from "@prisma/client";
import { LicenseStatus, LicenseType } from "@/lib/enums";

export type LicenseProductConfig = {
  key: string;
  name: string;
  types: LicenseType[];
  // Máximo de licenças ativas (aprovadas ou já atribuídas) por Direção.
  maxPerDirection: number;
  // Tipos de licença que contam para esse máximo.
  countedTypes: LicenseType[];
};

// Catálogo de licenças que se podem pedir. Para acrescentar um novo
// produto basta adicionar uma entrada aqui.
export const LICENSE_PRODUCTS: LicenseProductConfig[] = [
  {
    key: "FIGMA",
    name: "Figma",
    types: [LicenseType.FULL, LicenseType.VIEW],
    maxPerDirection: 22,
    countedTypes: [LicenseType.FULL, LicenseType.VIEW],
  },
];

export function getLicenseProduct(key: string) {
  return LICENSE_PRODUCTS.find((p) => p.key === key);
}

export function productName(key: string) {
  return getLicenseProduct(key)?.name ?? key;
}

// Estados em que uma licença ocupa um lugar no limite da Direção.
export const ACTIVE_LICENSE_STATUSES: string[] = [LicenseStatus.APPROVED, LicenseStatus.GRANTED];
// Estados em que já existe um pedido "em curso" para a mesma pessoa.
export const OPEN_LICENSE_STATUSES: string[] = [
  LicenseStatus.PENDING,
  LicenseStatus.APPROVED,
  LicenseStatus.GRANTED,
];

// No organigrama (ver orgChart.ts) a raiz é o Conselho de Administração
// (profundidade 0), depois as áreas (1), as Direções (2) e as
// Unidades/Coordenações (3). A Direção de uma unidade é o seu antepassado
// de profundidade 2.
export const DIRECTION_DEPTH = 2;

type Db = PrismaClient | Prisma.TransactionClient;

export async function resolveDirection(db: Db, unitId: string) {
  const chain: { id: string; name: string; parentId: string | null }[] = [];
  let currentId: string | null = unitId;
  while (currentId) {
    const unit: { id: string; name: string; parentId: string | null } | null = await db.unit.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    });
    if (!unit) return null;
    chain.unshift(unit);
    currentId = unit.parentId;
    if (chain.length > 20) return null; // proteção contra ciclos
  }
  return chain[DIRECTION_DEPTH] ?? null;
}

export async function countActiveLicenses(db: Db, directionId: string, productKey: string) {
  const product = getLicenseProduct(productKey);
  return db.licenseRequest.count({
    where: {
      directionId,
      product: productKey,
      status: { in: ACTIVE_LICENSE_STATUSES },
      licenseType: { in: product?.countedTypes ?? [] },
    },
  });
}

// Licenças ocupadas por Direção e produto, indexadas por
// `${directionId}:${product}`.
export async function getDirectionUsage(db: Db): Promise<Record<string, number>> {
  const groups = await db.licenseRequest.groupBy({
    by: ["directionId", "product", "licenseType"],
    where: { status: { in: ACTIVE_LICENSE_STATUSES } },
    _count: { _all: true },
  });
  const usage: Record<string, number> = {};
  for (const g of groups) {
    const product = getLicenseProduct(g.product);
    if (!product?.countedTypes.includes(g.licenseType as LicenseType)) continue;
    const key = `${g.directionId}:${g.product}`;
    usage[key] = (usage[key] ?? 0) + g._count._all;
  }
  return usage;
}

// Unidades onde se pode pedir uma licença (Direções e as suas
// Unidades/Coordenações), cada uma com a Direção a que pertence.
export function withDirections<T extends { id: string; name: string; depth: number }>(units: T[]) {
  let current: { id: string; name: string } | null = null;
  const result: (T & { direction: { id: string; name: string } | null })[] = [];
  for (const unit of units) {
    if (unit.depth < DIRECTION_DEPTH) {
      current = null;
      continue;
    }
    if (unit.depth === DIRECTION_DEPTH) current = { id: unit.id, name: unit.name };
    result.push({ ...unit, direction: current });
  }
  return result;
}
