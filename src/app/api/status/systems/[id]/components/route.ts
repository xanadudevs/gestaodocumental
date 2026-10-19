import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COMPONENT_KIND_LABELS } from "@/lib/status";
import { badRequest, requireAdmin } from "@/lib/statusApi";

const schema = z.object({
  name: z.string().trim().min(1, "Indica o nome do componente").max(80),
  kind: z.enum(Object.keys(COMPONENT_KIND_LABELS) as [string, ...string[]]).default("SERVICE"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const system = await prisma.statusSystem.findUnique({ where: { id }, select: { id: true } });
  if (!system) return NextResponse.json({ error: "Sistema não encontrado" }, { status: 404 });

  const last = await prisma.statusComponent.aggregate({ where: { systemId: id }, _max: { order: true } });
  const component = await prisma.statusComponent.create({
    data: { systemId: id, name: parsed.data.name, kind: parsed.data.kind, order: (last._max.order ?? -1) + 1 },
  });
  return NextResponse.json({ id: component.id }, { status: 201 });
}
