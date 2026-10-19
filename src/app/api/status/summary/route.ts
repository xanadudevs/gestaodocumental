import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadSystems, summarize, systemsByImpact } from "@/lib/status";
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
    // Ordenados por impacto (criticidade × gravidade).
    notOk: systemsByImpact(systems).map((s) => ({
      name: s.name,
      unit: s.unitCode,
      status: s.status,
      criticality: s.criticality,
      owner: s.ownerName,
    })),
  });
}
