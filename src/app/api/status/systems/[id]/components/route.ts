import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COMPONENT_KIND_LABELS } from "@/lib/status";
import { badRequest, requireAdmin } from "@/lib/statusApi";

const schema = z.object({
  // Um componente (`name`) ou vários de uma vez (`names`, ex: uma ULS por linha).
  name: z.string().trim().min(1).max(80).optional(),
  names: z.array(z.string().trim().min(1).max(80)).max(300).optional(),
  kind: z.enum(Object.keys(COMPONENT_KIND_LABELS) as [string, ...string[]]).default("SERVICE"),
  // Apaga primeiro os componentes que o sistema já tem (ex: trocar
  // "Aplicação" e "Base de dados" por uma lista de ULS).
  replace: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const wanted = [...new Set([...(parsed.data.name ? [parsed.data.name] : []), ...(parsed.data.names ?? [])])];
  if (wanted.length === 0) return badRequest("Indica o nome do componente");

  const system = await prisma.statusSystem.findUnique({
    where: { id },
    include: { components: { select: { name: true, order: true } } },
  });
  if (!system) return NextResponse.json({ error: "Sistema não encontrado" }, { status: 404 });

  const kept = parsed.data.replace ? [] : system.components;
  const taken = new Set(kept.map((c) => c.name.toLowerCase()));
  const toCreate = wanted.filter((n) => !taken.has(n.toLowerCase()));
  let order = kept.reduce((max, c) => Math.max(max, c.order), -1) + 1;

  await prisma.$transaction([
    ...(parsed.data.replace ? [prisma.statusComponent.deleteMany({ where: { systemId: id } })] : []),
    prisma.statusComponent.createMany({
      data: toCreate.map((name) => ({ systemId: id, name, kind: parsed.data.kind, order: order++ })),
    }),
  ]);
  return NextResponse.json({ created: toCreate.length }, { status: 201 });
}
