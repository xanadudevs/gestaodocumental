import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageLicenses } from "@/lib/permissions";
import { grantLicense } from "@/lib/licenseGrant";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1, "Nenhum pedido escolhido").max(200) });

// Apoio Administrativo dá o acesso a vários pedidos aprovados de uma vez. Os que
// já não estão aprovados ficam de fora e vêm com o motivo.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageLicenses(session.user.role)) {
    return NextResponse.json({ error: "Só o Apoio Administrativo pode dar o acesso" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const requests = await prisma.licenseRequest.findMany({
    where: { id: { in: parsed.data.ids } },
    select: { id: true, beneficiaryName: true },
    orderBy: { createdAt: "asc" },
  });

  let granted = 0;
  const failed: { id: string; name: string; error: string }[] = [];
  for (const r of requests) {
    const result = await grantLicense(r.id, session.user.id);
    if (result.ok) granted++;
    else failed.push({ id: r.id, name: r.beneficiaryName, error: result.error });
  }
  return NextResponse.json({ granted, failed });
}
