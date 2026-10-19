import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SERVICE_STATUSES } from "@/lib/status";
import { badRequest, requireUser } from "@/lib/statusApi";

const schema = z.object({
  status: z.enum(SERVICE_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

// Atalho: define o mesmo estado em todos os componentes do sistema
// ("está tudo OK" ou "está tudo em baixo" num só clique).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Estado inválido");

  const components = await prisma.statusComponent.findMany({ where: { systemId: id } });
  if (components.length === 0) return badRequest("O sistema não tem componentes");

  const actorName = auth.session.user.name ?? auth.session.user.email ?? null;
  const note = parsed.data.status === "OK" ? null : parsed.data.note || null;
  const now = new Date();

  await prisma.$transaction([
    ...components.map((c) =>
      prisma.statusComponent.update({
        where: { id: c.id },
        data: { status: parsed.data.status, note, statusAt: now, statusById: auth.session.user.id, statusByName: actorName },
      })
    ),
    ...components.map((c) =>
      prisma.statusEvent.create({
        data: {
          systemId: id,
          componentName: c.name,
          fromStatus: c.status,
          toStatus: parsed.data.status,
          note: note ?? undefined,
          actorName,
        },
      })
    ),
  ]);
  return NextResponse.json({ id, status: parsed.data.status });
}
