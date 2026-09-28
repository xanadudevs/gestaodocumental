import { prisma } from "@/lib/prisma";
import { unitLabel } from "@/lib/orgChart";
import { LEVEL_LABELS } from "@/lib/labels";

export type Person = { id: string; name: string; level: string | null; label: string };

// Pessoas para encaminhar/enviar documentos, das mais seniores para as
// mais júnior. Só quem tem nome (inclui quem ainda não tem login).
export async function getPeople(): Promise<Person[]> {
  const users = await prisma.user.findMany({
    where: { name: { not: null } },
    select: { id: true, name: true, level: true, unit: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const rank = (l: string | null) => (l ? ["CONSELHO", "DIRECAO", "COORDENACAO", "GESTAO", "TECNICO"].indexOf(l) : 9);
  return users
    .map((u) => ({
      id: u.id,
      name: u.name!,
      level: u.level,
      label: [
        u.name,
        [u.level && LEVEL_LABELS[u.level], u.unit && unitLabel(u.unit.name).split(" — ")[0]].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" — "),
    }))
    .sort((a, b) => rank(a.level) - rank(b.level) || a.name.localeCompare(b.name));
}
