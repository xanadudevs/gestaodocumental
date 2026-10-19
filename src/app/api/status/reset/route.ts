import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/statusApi";

// "Nova ronda": põe todos os componentes em "Por verificar", para que cada
// responsável volte a confirmar o estado do seu sistema.
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { count } = await prisma.statusComponent.updateMany({
    data: { status: "UNKNOWN", note: null, statusAt: new Date(), statusById: null, statusByName: null },
  });
  await prisma.statusEvent.deleteMany({});
  return NextResponse.json({ reset: count });
}
