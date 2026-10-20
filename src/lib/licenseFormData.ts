import { prisma } from "@/lib/prisma";
import { getFlatUnits } from "@/lib/units";
import { getDirectionUsage, withDirections } from "@/lib/licenses";
import { COORDINATION_NAMES, ORG_CHART, configuredCoordinator, unitCodeOf, unitLabel } from "@/lib/orgChart";
import { Level, Role } from "@/lib/enums";

// Dados do formulário de pedido (novo ou edição): unidades, coordenadores,
// coordenador por omissão de cada unidade e licenças ocupadas.
export async function loadLicenseFormData() {
  const [units, coordinators, usage] = await Promise.all([
    getFlatUnits(),
    prisma.user.findMany({
      where: {
        OR: [
          { level: { in: [Level.COORDENACAO, Level.DIRECAO] } },
          { role: { in: [Role.ADMIN, Role.APPROVER] } },
        ],
      },
      // Sem emails: o formulário de pedido é público.
      select: { id: true, name: true, level: true, unitId: true, unit: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    getDirectionUsage(prisma),
  ]);

  // As coordenações da DANAD e a própria Direção (licenças do Diretor e da
  // Assessoria), sem unidades antigas que ainda não tenham sido removidas.
  const unitsWithDirection = withDirections(units).filter(
    (u) => COORDINATION_NAMES.has(u.name) || u.name === ORG_CHART.name
  );
  const coordinations = unitsWithDirection.map((u) => ({
    id: u.id,
    label: unitLabel(u.name),
    depth: u.depth,
    code: unitCodeOf(u.name),
    direction: u.direction,
  }));

  // Coordenador de cada unidade: o definido no organigrama (se estiver nessa
  // unidade); senão, quem tem nível Coordenação nessa unidade (na Direção,
  // nível Direção).
  const defaultCoordinator: Record<string, string> = {};
  for (const unit of unitsWithDirection) {
    const inUnit = coordinators.filter((c) => c.unitId === unit.id);
    const named = configuredCoordinator(unit.name)?.toLowerCase();
    const match =
      (named && inUnit.find((c) => c.name?.toLowerCase() === named)) ||
      inUnit.find((c) => c.level === Level.COORDENACAO) ||
      inUnit.find((c) => c.level === Level.DIRECAO);
    if (match) defaultCoordinator[unit.id] = match.id;
  }

  return {
    coordinations,
    coordinators: coordinators.map(({ unitId: _unitId, ...c }) => c),
    defaultCoordinator,
    usage,
  };
}
