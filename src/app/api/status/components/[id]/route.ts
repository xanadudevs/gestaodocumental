import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SERVICE_STATUSES } from "@/lib/status";
import { badRequest, requireAdmin, requireUser } from "@/lib/statusApi";

const schema = z.object({
  status: z.enum(SERVICE_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

// Atualiza (ou volta a confirmar) o estado de um componente.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Estado inválido");

  const component = await prisma.statusComponent.findUnique({ where: { id } });
  if (!component) return NextResponse.json({ error: "Componente não encontrado" }, { status: 404 });

  const actorName = auth.session.user.name ?? auth.session.user.email ?? null;
  // Sem nota nova, uma nota antiga de "em baixo" não deve sobreviver a um OK.
  const note = parsed.data.note !== undefined ? parsed.data.note || null : parsed.data.status === "OK" ? null : component.note;

  const [updated] = await prisma.$transaction([
    prisma.statusComponent.update({
      where: { id },
      data: {
        status: parsed.data.status,
        note,
        statusAt: new Date(),
        statusById: auth.session.user.id,
        statusByName: actorName,
      },
    }),
    prisma.statusEvent.create({
      data: {
        systemId: component.systemId,
        componentName: component.name,
        fromStatus: component.status,
        toStatus: parsed.data.status,
        note: note ?? undefined,
        actorName,
      },
    }),
  ]);
  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { count } = await prisma.statusComponent.deleteMany({ where: { id } });
  if (count === 0) return NextResponse.json({ error: "Componente não encontrado" }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
