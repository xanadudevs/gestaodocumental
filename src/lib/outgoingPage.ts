import { prisma } from "@/lib/prisma";
import { getFlatUnits } from "@/lib/units";
import { COORDINATION_NAMES, ORG_CHART, unitLabel } from "@/lib/orgChart";

// Unidades que podem emitir informações/ofícios (a Direção e as
// coordenações) e a unidade por omissão do utilizador.
export async function outgoingUnits(userId: string) {
  const [units, me] = await Promise.all([
    getFlatUnits(),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, unitId: true } }),
  ]);
  const allowed = units
    .filter((u) => u.name === ORG_CHART.name || COORDINATION_NAMES.has(u.name))
    .map((u) => ({ id: u.id, name: u.name, label: unitLabel(u.name) }));
  const defaultUnitId = allowed.find((u) => u.id === me?.unitId)?.id ?? allowed[0]?.id ?? "";
  return { units: allowed, defaultUnitId, me };
}
