import type { PrismaClient } from "@prisma/client";
import { ComponentKind } from "@/lib/status";
import { breakdownFor } from "@/lib/statusBreakdown";

export type DefaultsResult = { breakdown: number; services: number };

// Põe os sistemas já criados de acordo com o modelo atual, sem mexer nos que
// já estão certos:
//  - LIGHT e PNB passam a ter um componente por ULS / por serviço;
//  - os restantes ganham "Serviços / API" se ainda não tiverem nenhum
//    componente desse tipo.
// Seguro de repetir.
export async function applyComponentDefaults(prisma: PrismaClient): Promise<DefaultsResult> {
  const systems = await prisma.statusSystem.findMany({
    select: { id: true, name: true, components: { select: { kind: true, order: true } } },
  });
  let breakdown = 0;
  let services = 0;

  for (const system of systems) {
    const parts = breakdownFor(system.name);
    if (parts) {
      if (system.components.some((c) => c.kind === parts.kind)) continue;
      await prisma.$transaction([
        prisma.statusComponent.deleteMany({ where: { systemId: system.id } }),
        prisma.statusComponent.createMany({
          data: parts.names.map((name, i) => ({ systemId: system.id, name, kind: parts.kind, order: i })),
        }),
      ]);
      breakdown++;
    } else if (!system.components.some((c) => c.kind === ComponentKind.SERVICE)) {
      const order = system.components.reduce((max, c) => Math.max(max, c.order), -1) + 1;
      await prisma.statusComponent.create({
        data: { systemId: system.id, name: "Serviços / API", kind: ComponentKind.SERVICE, order },
      });
      services++;
    }
  }
  return { breakdown, services };
}
