import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SERVICE_STATUSES } from "@/lib/status";
import { updateComponent } from "@/lib/statusUpdate";
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

  const result = await updateComponent(prisma, id, parsed.data.status, parsed.data.note, {
    id: auth.session.user.id,
    name: auth.session.user.name ?? auth.session.user.email ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id, status: parsed.data.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { count } = await prisma.statusComponent.deleteMany({ where: { id } });
  if (count === 0) return NextResponse.json({ error: "Componente não encontrado" }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
