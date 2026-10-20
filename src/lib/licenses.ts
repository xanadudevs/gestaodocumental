import type { Prisma, PrismaClient } from "@prisma/client";
import { LicenseStatus, LicenseType } from "@/lib/enums";
import { ORG_CHART } from "@/lib/orgChart";
export { isAtLimit, limitFor, usageText } from "@/lib/licenseUsage";

export type LicenseProductConfig = {
  key: string;
  name: string;
  types: LicenseType[];
  // Máximo de licenças ativas (aprovadas ou já atribuídas) por Direção;
  // null = sem limite.
  maxPerDirection: number | null;
  // Quota por unidade (código -> licenças): substitui o máximo da Direção e
  // conta-se por coordenação. Unidades sem quota não podem pedir.
  maxPerUnit?: Record<string, number>;
  // Licenças do total que ficam de reserva (sem atribuir a nenhuma unidade).
  reserve?: number;
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
  {
    key: "COPILOT",
    name: "Copilot",
    types: [LicenseType.STANDARD],
    maxPerDirection: null,
    // 10 no total: 1 Diretor + 1 Assessoria (Direção) e 2 por coordenação.
    maxPerUnit: { DANAD: 2, UPACE: 2, UID: 2, UIA: 2, URN: 2 },
    countedTypes: [LicenseType.STANDARD],
  },
  {
    key: "OPENAI",
    name: "OpenAI",
    types: [LicenseType.STANDARD],
    maxPerDirection: null,
    // 15 no total: 3 por coordenação e 3 de reserva.
    maxPerUnit: { UPACE: 3, UID: 3, UIA: 3, URN: 3 },
    reserve: 3,
    countedTypes: [LicenseType.STANDARD],
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

// No organigrama (ver orgChart.ts) a raiz é a Direção (profundidade 0) e
// as coordenações estão por baixo (1). A Direção de uma unidade é o seu
// antepassado de topo.
export const DIRECTION_DEPTH = 0;

type Db = PrismaClient | Prisma.TransactionClient;

// Todos os pedidos são das coordenações da DANAD, por isso a Direção é
// sempre a raiz do organigrama (procurada pelo nome, para não depender de
// como a árvore está na base de dados).
export async function resolveDirection(db: Db, _unitId: string) {
  return db.unit.findFirst({ where: { name: ORG_CHART.name }, select: { id: true, name: true } });
}

// Licenças ocupadas de um produto: pela coordenação, nos produtos com quota
// por unidade, ou pela Direção toda nos restantes.
export async function countActiveLicenses(
  db: Db,
  scope: { directionId: string; coordinationId: string },
  productKey: string
) {
  const product = getLicenseProduct(productKey);
  return db.licenseRequest.count({
    where: {
      ...(product?.maxPerUnit ? { coordinationId: scope.coordinationId } : { directionId: scope.directionId }),
      product: productKey,
      status: { in: ACTIVE_LICENSE_STATUSES },
      licenseType: { in: product?.countedTypes ?? [] },
    },
  });
}

// Licenças ocupadas, indexadas por `${directionId}:${product}` (produtos com
// máximo por Direção) ou por `${coordinationId}:${product}` (produtos com
// quota por unidade).
export async function getDirectionUsage(db: Db): Promise<Record<string, number>> {
  const groups = await db.licenseRequest.groupBy({
    by: ["directionId", "coordinationId", "product", "licenseType"],
    where: { status: { in: ACTIVE_LICENSE_STATUSES } },
    _count: { _all: true },
  });
  const usage: Record<string, number> = {};
  for (const g of groups) {
    const product = getLicenseProduct(g.product);
    if (!product?.countedTypes.includes(g.licenseType as LicenseType)) continue;
    const key = `${product.maxPerUnit ? g.coordinationId : g.directionId}:${g.product}`;
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
