import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SERVICE_STATUSES } from "@/lib/status";
import { updateComponents } from "@/lib/statusUpdate";
import { STATUS_TOKEN_HEADER, isValidStatusToken } from "@/lib/statusPublic";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Nenhum componente escolhido").max(500),
  status: z.enum(SERVICE_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

// Atualização de vários componentes pela página partilhada (com token).
export async function POST(req: NextRequest) {
  if (!isValidStatusToken(req.headers.get(STATUS_TOKEN_HEADER) ?? undefined)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const result = await updateComponents(prisma, parsed.data.ids, parsed.data.status, parsed.data.note, {
    id: null,
    name: "Página partilhada",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ updated: result.count });
}
