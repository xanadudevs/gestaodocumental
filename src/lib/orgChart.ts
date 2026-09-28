import type { PrismaClient } from "@prisma/client";
import { Level, Role } from "@/lib/enums";

export type UnitNode = {
  name: string;
  // Sigla usada no dia a dia (ex: PACE), mostrada junto ao nome.
  acronym?: string;
  // Código usado na referência dos documentos, ex: UPACE em 01/DANAD - UPACE/2026
  code?: string;
  // Nome do coordenador: ao aplicar a estrutura, fica com esta unidade e o
  // nível Coordenação, e aparece logo escolhido nos pedidos de licença.
  coordinator?: string;
  children?: UnitNode[];
};

// Estrutura organizacional usada na aplicação: a Direção de Arquitetura,
// Negócio e Análise de Dados (DANAD) e as suas coordenações.
export const ORG_CHART: UnitNode = {
  name: "Direção de Arquitetura, Negócio e Análise de Dados",
  acronym: "DANAD",
  code: "DANAD",
  children: [
    {
      name: "Unidade de Planeamento, Arquitetura, Conformidade e Engenharia",
      acronym: "PACE",
      code: "UPACE",
      coordinator: "Filipe Mealha",
    },
    {
      name: "Unidade de Advanced Analytics, Inteligência Artificial e Robótica",
      acronym: "UIA",
      code: "UIA",
      coordinator: "Pedro Marques",
    },
    { name: "Unidade de Inovação Digital", acronym: "UID", code: "UID", coordinator: "Rafael Franco" },
    { name: "Unidade de Registos Nacionais", acronym: "URN", code: "URN", coordinator: "João Simões" },
  ],
};

function flatten(node: UnitNode, list: UnitNode[] = []) {
  list.push(node);
  for (const child of node.children ?? []) flatten(child, list);
  return list;
}

const ACRONYMS = new Map(flatten(ORG_CHART).map((n) => [n.name, n.acronym]));
const COORDINATORS = new Map(flatten(ORG_CHART).map((n) => [n.name, n.coordinator]));
const CODES = new Map(flatten(ORG_CHART).map((n) => [n.name, n.code]));

// Parte da referência que identifica a unidade: "DANAD" para a Direção,
// "DANAD - UPACE" para uma coordenação.
export function referenceUnitPart(unitName: string) {
  const root = ORG_CHART.code ?? ORG_CHART.acronym ?? ORG_CHART.name;
  if (unitName === ORG_CHART.name) return root;
  const code = CODES.get(unitName);
  return code ? `${root} - ${code}` : root;
}

// Sigla curta da unidade (rodapé do ofício), ex: "DANAD UIA".
export function unitSigla(unitName: string) {
  const root = ORG_CHART.acronym ?? "";
  if (unitName === ORG_CHART.name) return root;
  const acronym = ACRONYMS.get(unitName);
  return acronym ? `${root} ${acronym}` : root;
}

// Coordenações da Direção (as unidades por baixo da raiz do organigrama).
export const COORDINATION_NAMES = new Set((ORG_CHART.children ?? []).map((n) => n.name));

// Coordenador definido no organigrama para a unidade (se houver).
export function configuredCoordinator(unitName: string) {
  return COORDINATORS.get(unitName);
}

// Nome da unidade com a sigla, ex: "PACE — Unidade de Planeamento, ...".
export function unitLabel(name: string) {
  const acronym = ACRONYMS.get(name);
  return acronym ? `${acronym} — ${name}` : name;
}

export type OrgChartResult = {
  total: number;
  removed: number;
  kept: string[];
  coordinatorsCreated: string[];
  coordinatorsUpdated: string[];
  requestsFixed: number;
};

async function upsertUnit(
  prisma: PrismaClient,
  node: UnitNode,
  parentId: string | null,
  order: number,
  ids: Map<string, string>
): Promise<void> {
  // Procura pelo nome (os nomes são únicos no organigrama) para reaproveitar
  // unidades já existentes, mesmo que antes estivessem noutro sítio da árvore.
  const existing = await prisma.unit.findFirst({ where: { name: node.name }, orderBy: { id: "asc" } });
  const unit = existing
    ? await prisma.unit.update({ where: { id: existing.id }, data: { parentId, order } })
    : await prisma.unit.create({ data: { name: node.name, parentId, order } });
  ids.set(node.name, unit.id);

  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    await upsertUnit(prisma, children[i], unit.id, i, ids);
  }
}

// Remove as unidades que já não fazem parte do organigrama. Quem lá estava
// fica sem unidade. Unidades usadas em pedidos de licença não podem ser
// apagadas (o histórico aponta para elas): ficam, mas soltas da árvore.
async function pruneUnits(prisma: PrismaClient, keepIds: Set<string>) {
  const stale = await prisma.unit.findMany({
    where: { id: { notIn: [...keepIds] } },
    select: {
      id: true,
      name: true,
      _count: { select: { licenseRequestsCoordination: true, licenseRequestsDirection: true } },
    },
  });
  const inUse = stale.filter((u) => u._count.licenseRequestsCoordination + u._count.licenseRequestsDirection > 0);
  const removable = stale.filter((u) => !inUse.includes(u));

  if (inUse.length > 0) {
    await prisma.unit.updateMany({ where: { id: { in: inUse.map((u) => u.id) } }, data: { parentId: null } });
  }
  if (removable.length > 0) {
    const ids = removable.map((u) => u.id);
    await prisma.user.updateMany({ where: { unitId: { in: ids } }, data: { unitId: null } });
    // Solta a árvore antes de apagar, para não haver problemas de ordem.
    await prisma.unit.updateMany({ where: { id: { in: ids } }, data: { parentId: null } });
    await prisma.unit.deleteMany({ where: { id: { in: ids } } });
  }
  return { removed: removable.length, kept: inUse.map((u) => u.name) };
}

// Garante que cada coordenador indicado no organigrama existe, está na sua
// unidade e tem o nível Coordenação. Quem ainda não existe é criado sem
// login - um ADMIN define depois o utilizador e a password em "Editar".
async function upsertCoordinators(prisma: PrismaClient, ids: Map<string, string>) {
  const created: string[] = [];
  const updated: string[] = [];
  for (const node of flatten(ORG_CHART)) {
    if (!node.coordinator) continue;
    const unitId = ids.get(node.name)!;
    const user = await prisma.user.findFirst({
      where: { name: { equals: node.coordinator, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { unitId, level: Level.COORDENACAO, ...(user.role === Role.USER ? { role: Role.APPROVER } : {}) },
      });
      updated.push(node.coordinator);
    } else {
      await prisma.user.create({
        data: { name: node.coordinator, unitId, level: Level.COORDENACAO, role: Role.APPROVER },
      });
      created.push(node.coordinator);
    }
  }
  return { created, updated };
}

// Aplica o organigrama: cria/atualiza as unidades, remove as que já não
// fazem parte dele e associa os coordenadores. Idempotente - seguro de
// correr várias vezes.
export async function upsertOrgChart(prisma: PrismaClient): Promise<OrgChartResult> {
  const ids = new Map<string, string>();
  await upsertUnit(prisma, ORG_CHART, null, 0, ids);
  // Todos os pedidos de licença são da DANAD: corrige os que ficaram
  // associados a outra unidade de topo (ex: Conselho de Administração).
  const directionId = ids.get(ORG_CHART.name)!;
  const { count: requestsFixed } = await prisma.licenseRequest.updateMany({
    where: { directionId: { not: directionId } },
    data: { directionId },
  });
  const { removed, kept } = await pruneUnits(prisma, new Set(ids.values()));
  const { created, updated } = await upsertCoordinators(prisma, ids);
  return {
    total: await prisma.unit.count(),
    removed,
    kept,
    coordinatorsCreated: created,
    coordinatorsUpdated: updated,
    requestsFixed,
  };
}
