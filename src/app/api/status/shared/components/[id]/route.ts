import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateComponent } from "@/lib/statusUpdate";
import { parseSharedUpdate } from "@/lib/statusShared";

// Atualização feita por qualquer pessoa com o token da página partilhada.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseSharedUpdate(req);
  if ("error" in parsed) return parsed.error;
  const { id } = await params;
  const { status, note, actor } = parsed.data;

  const result = await updateComponent(prisma, id, status, note, { id: null, name: actor });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id, status });
}
