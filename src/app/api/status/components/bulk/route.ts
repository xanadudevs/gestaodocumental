import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SERVICE_STATUSES } from "@/lib/status";
import { updateComponents } from "@/lib/statusUpdate";
import { badRequest, requireUser } from "@/lib/statusApi";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Nenhum componente escolhido").max(500),
  status: z.enum(SERVICE_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

// Atualiza vários componentes de uma vez (ex: as ULS escolhidas no LIGHT).
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = bulkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const result = await updateComponents(prisma, parsed.data.ids, parsed.data.status, parsed.data.note, {
    id: auth.session.user.id,
    name: auth.session.user.name ?? auth.session.user.email ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ updated: result.count });
}
