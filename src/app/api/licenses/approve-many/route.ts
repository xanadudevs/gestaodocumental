import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LicenseStatus } from "@/lib/enums";
import { decideLicense } from "@/lib/licenseDecision";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1, "Nenhum pedido escolhido").max(100) });

// Aprova vários pedidos de uma vez. Cada um passa pelas mesmas validações da
// aprovação individual (só o coordenador indicado, só pedidos pendentes, quota
// da unidade); os que falham ficam por aprovar e vêm com o motivo.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const requests = await prisma.licenseRequest.findMany({
    where: { id: { in: parsed.data.ids } },
    select: { id: true, beneficiaryName: true, createdAt: true },
    orderBy: { createdAt: "asc" }, // por ordem de chegada, para a quota ser justa
  });

  let approved = 0;
  const failed: { id: string; name: string; error: string }[] = [];
  for (const r of requests) {
    const result = await decideLicense({
      id: r.id,
      decision: LicenseStatus.APPROVED,
      reason: null,
      actor: { id: session.user.id, role: session.user.role },
    });
    if (result.ok) approved++;
    else failed.push({ id: r.id, name: r.beneficiaryName, error: result.error });
  }
  return NextResponse.json({ approved, failed });
}
