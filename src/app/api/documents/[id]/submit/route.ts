import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const approverId = body.approverId as string | undefined;
  if (!approverId) return NextResponse.json({ error: "Escolhe um aprovador" }, { status: 400 });

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  if (document.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (document.status !== "DRAFT" && document.status !== "REJECTED") {
    return NextResponse.json({ error: "Documento já está em fluxo" }, { status: 409 });
  }

  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver || (approver.role !== "APPROVER" && approver.role !== "ADMIN")) {
    return NextResponse.json({ error: "Aprovador inválido" }, { status: 400 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      status: "PENDING",
      approverId,
      submittedAt: new Date(),
      decidedAt: null,
      decisionReason: null,
    },
  });

  await prisma.auditLog.create({
    data: { documentId: document.id, actorId: session.user.id, action: "SUBMITTED" },
  });

  return NextResponse.json(updated);
}
