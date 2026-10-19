import type { PrismaClient } from "@prisma/client";

export type Actor = { id: string | null; name: string | null };
export type UpdateResult = { ok: true } | { ok: false; status: number; error: string };

// Muda o estado de um componente e regista o evento. Com `onlyOwner`, só
// aceita componentes de sistemas desse responsável (links dos gestores).
export async function updateComponent(
  prisma: PrismaClient,
  componentId: string,
  status: string,
  note: string | undefined,
  actor: Actor,
  onlyOwner?: string
): Promise<UpdateResult> {
  const component = await prisma.statusComponent.findUnique({
    where: { id: componentId },
    include: { system: { select: { ownerName: true } } },
  });
  if (!component || (onlyOwner !== undefined && component.system.ownerName !== onlyOwner)) {
    return { ok: false, status: 404, error: "Componente não encontrado" };
  }
  // Sem nota nova, uma nota antiga de "em baixo" não deve sobreviver a um OK.
  const newNote = note !== undefined ? note || null : status === "OK" ? null : component.note;
  await prisma.$transaction([
    prisma.statusComponent.update({
      where: { id: componentId },
      data: { status, note: newNote, statusAt: new Date(), statusById: actor.id, statusByName: actor.name },
    }),
    prisma.statusEvent.create({
      data: {
        systemId: component.systemId,
        componentName: component.name,
        fromStatus: component.status,
        toStatus: status,
        note: newNote ?? undefined,
        actorName: actor.name,
      },
    }),
  ]);
  return { ok: true };
}

// Define o mesmo estado em todos os componentes de um sistema.
export async function setAllComponents(
  prisma: PrismaClient,
  systemId: string,
  status: string,
  note: string | undefined,
  actor: Actor,
  onlyOwner?: string
): Promise<UpdateResult> {
  const system = await prisma.statusSystem.findUnique({
    where: { id: systemId },
    include: { components: true },
  });
  if (!system || (onlyOwner !== undefined && system.ownerName !== onlyOwner)) {
    return { ok: false, status: 404, error: "Sistema não encontrado" };
  }
  if (system.components.length === 0) return { ok: false, status: 400, error: "O sistema não tem componentes" };

  const newNote = status === "OK" ? null : note || null;
  const now = new Date();
  await prisma.$transaction([
    ...system.components.map((c) =>
      prisma.statusComponent.update({
        where: { id: c.id },
        data: { status, note: newNote, statusAt: now, statusById: actor.id, statusByName: actor.name },
      })
    ),
    ...system.components.map((c) =>
      prisma.statusEvent.create({
        data: {
          systemId,
          componentName: c.name,
          fromStatus: c.status,
          toStatus: status,
          note: newNote ?? undefined,
          actorName: actor.name,
        },
      })
    ),
  ]);
  return { ok: true };
}
