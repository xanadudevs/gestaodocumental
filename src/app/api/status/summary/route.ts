import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadSystems, summarize } from "@/lib/status";
import { requireUser } from "@/lib/statusApi";

// Resumo em JSON (para integrar noutros ecrãs ou relatórios).
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const systems = await loadSystems(prisma);
  const summary = summarize(systems);
  return NextResponse.json({
    ...summary,
    criticalNotOk: summary.criticalNotOk.map((s) => ({ id: s.id, name: s.name, status: s.status })),
    notOk: systems
      .filter((s) => s.status !== "OK")
      .map((s) => ({ name: s.name, unit: s.unitCode, status: s.status, owner: s.ownerName })),
  });
}
