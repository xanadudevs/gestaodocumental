import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMPONENTS, UNIT_LABELS } from "@/lib/status";
import { breakdownFor } from "@/lib/statusBreakdown";
import { badRequest, requireAdmin } from "@/lib/statusApi";

const schema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        unitCode: z.enum(Object.keys(UNIT_LABELS) as [string, ...string[]]),
        ownerName: z.string().trim().max(120).optional(),
      })
    )
    .min(1, "Nenhum sistema escolhido")
    .max(500),
});

// Importa sistemas (da tabela de responsáveis): cria os que não existem,
// com os componentes por omissão, e atualiza a unidade e o responsável dos
// que já existem (o estado e os componentes ficam como estão). O LIGHT e o
// PNB ficam com um componente por ULS e por serviço, respetivamente.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const existing = new Map((await prisma.statusSystem.findMany({ select: { id: true, name: true } })).map((s) => [s.name.toLowerCase(), s.id]));
  let created = 0;
  let updated = 0;
  let broken = 0;
  for (const item of parsed.data.items) {
    const breakdown = breakdownFor(item.name);
    let id = existing.get(item.name.toLowerCase());
    if (id) {
      await prisma.statusSystem.update({
        where: { id },
        data: { unitCode: item.unitCode, ownerName: item.ownerName || null },
      });
      updated++;
    } else {
      const system = await prisma.statusSystem.create({
        data: {
          name: item.name,
          unitCode: item.unitCode,
          ownerName: item.ownerName || null,
          components: {
            create: breakdown
              ? breakdown.names.map((name, i) => ({ name, kind: breakdown.kind, order: i }))
              : DEFAULT_COMPONENTS.map((c, i) => ({ ...c, order: i })),
          },
        },
      });
      id = system.id;
      existing.set(item.name.toLowerCase(), id);
      created++;
      if (breakdown) broken++;
      continue;
    }
    // Sistema que já existia (ex: LIGHT criado antes com Aplicação e Base de
    // dados): passa para a lista por ULS/serviço, uma única vez.
    if (breakdown) {
      const has = await prisma.statusComponent.count({ where: { systemId: id, kind: breakdown.kind } });
      if (has === 0) {
        await prisma.$transaction([
          prisma.statusComponent.deleteMany({ where: { systemId: id } }),
          prisma.statusComponent.createMany({
            data: breakdown.names.map((name, i) => ({ systemId: id!, name, kind: breakdown.kind, order: i })),
          }),
        ]);
        broken++;
      }
    }
  }
  return NextResponse.json({ created, updated, broken });
}
