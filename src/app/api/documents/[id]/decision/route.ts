import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDecideOn } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const decision = body.decision as "APPROVED" | "REJECTED" | undefined;
  const reason = typeof body.reason === "string" ? body.reason : null;

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  if (!canDecideOn(session.user.role, document.approverId, session.user.id)) {
    return NextResponse.json({ error: "Sem permissão para decidir sobre este documento" }, { status: 403 });
  }
  if (document.status !== "PENDING") {
    return NextResponse.json({ error: "Documento não está pendente de aprovação" }, { status: 409 });
  }
  if (decision === "REJECTED" && (!reason || reason.trim().length === 0)) {
    return NextResponse.json({ error: "Indica o motivo da rejeição" }, { status: 400 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      status: decision,
      decidedAt: new Date(),
      decisionReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      documentId: document.id,
      actorId: session.user.id,
      action: decision,
      meta: reason ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
