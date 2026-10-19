import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requireAdmin } from "@/lib/statusApi";

const schema = z.object({
  criticality: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  ownerName: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Dados inválidos");

  const { criticality, ownerName, notes } = parsed.data;
  try {
    await prisma.statusSystem.update({
      where: { id },
      data: {
        ...(criticality && { criticality }),
        ...(ownerName !== undefined && { ownerName: ownerName || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });
  } catch {
    return NextResponse.json({ error: "Sistema não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { count } = await prisma.statusSystem.deleteMany({ where: { id } });
  if (count === 0) return NextResponse.json({ error: "Sistema não encontrado" }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
