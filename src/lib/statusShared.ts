import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SERVICE_STATUSES } from "@/lib/status";
import { STATUS_TOKEN_HEADER, isValidStatusToken } from "@/lib/statusPublic";

export const sharedUpdateSchema = z.object({
  status: z.enum(SERVICE_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
  // Quem está a atualizar (a página pede o nome; fica no histórico).
  actor: z.string().trim().min(1, "Indica o teu nome").max(80),
});

// Valida o token e o corpo de uma atualização feita na página partilhada.
export async function parseSharedUpdate(req: NextRequest) {
  if (!isValidStatusToken(req.headers.get(STATUS_TOKEN_HEADER) ?? undefined)) {
    return { error: NextResponse.json({ error: "Token inválido" }, { status: 401 }) } as const;
  }
  const parsed = sharedUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return { error: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 }) } as const;
  }
  return { data: parsed.data } as const;
}
