import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SERVICE_STATUSES } from "@/lib/status";
import { setAllComponents } from "@/lib/statusUpdate";
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

  const result = await setAllComponents(prisma, id, parsed.data.status, parsed.data.note, {
    id: auth.session.user.id,
    name: auth.session.user.name ?? auth.session.user.email ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id, status: parsed.data.status });
}
