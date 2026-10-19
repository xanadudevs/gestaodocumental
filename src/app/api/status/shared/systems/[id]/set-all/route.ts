import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAllComponents } from "@/lib/statusUpdate";
import { parseSharedUpdate } from "@/lib/statusShared";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = await parseSharedUpdate(req);
  if ("error" in parsed) return parsed.error;
  const { id } = await params;
  const { status, note } = parsed.data;

  const result = await setAllComponents(prisma, id, status, note, { id: null, name: "Página partilhada" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id, status });
}
