import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMPONENTS, UNIT_LABELS } from "@/lib/status";
import { badRequest, requireAdmin } from "@/lib/statusApi";

const schema = z.object({
  name: z.string().trim().min(1, "Indica o nome do sistema").max(80),
  unitCode: z.enum(Object.keys(UNIT_LABELS) as [string, ...string[]]),
  ownerName: z.string().trim().max(120).optional(),
  criticality: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");

  if (await prisma.statusSystem.findUnique({ where: { name: parsed.data.name }, select: { id: true } })) {
    return NextResponse.json({ error: "Já existe um sistema com esse nome" }, { status: 409 });
  }
  const system = await prisma.statusSystem.create({
    data: {
      name: parsed.data.name,
      unitCode: parsed.data.unitCode,
      ownerName: parsed.data.ownerName || null,
      criticality: parsed.data.criticality,
      components: { create: DEFAULT_COMPONENTS.map((c, i) => ({ ...c, order: i })) },
    },
  });
  return NextResponse.json({ id: system.id }, { status: 201 });
}
