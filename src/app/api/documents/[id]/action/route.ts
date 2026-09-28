import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction, DocumentStatus } from "@/lib/enums";
import { DocumentActionType, availableActions } from "@/lib/documents";

const schema = z.object({
  action: z.nativeEnum(DocumentActionType),
  toUserId: z.string().optional(),
  text: z.string().trim().max(5000).optional(),
});

// Faz avançar o documento no circuito. Quem pode fazer o quê está em
// availableActions (src/lib/documents.ts).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  const { action, toUserId } = parsed.data;
  const text = parsed.data.text || null;

  const { id } = await params;
  const [doc, me] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, level: true } }),
  ]);
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  if (!me) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!availableActions(doc, me).includes(action) || action === DocumentActionType.EDIT) {
    return NextResponse.json({ error: "Não podes fazer esta ação neste documento" }, { status: 403 });
  }

  async function target(required: boolean) {
    if (!toUserId) return required ? null : undefined;
    const user = await prisma.user.findUnique({ where: { id: toUserId } });
    return user && user.id !== me!.id ? user : null;
  }

  let data: Record<string, unknown> = {};
  let log: { action: string; targetId?: string | null } = { action: "" };

  switch (action) {
    case DocumentActionType.FORWARD: {
      const to = await target(true);
      if (!to) return NextResponse.json({ error: "Escolhe para quem encaminhas" }, { status: 400 });
      data = { holderId: to.id, ...(doc.status === DocumentStatus.RECEIVED ? { status: DocumentStatus.IN_PROGRESS } : {}) };
      log = { action: AuditAction.FORWARDED, targetId: to.id };
      break;
    }
    case DocumentActionType.OPINION: {
      if (!text) return NextResponse.json({ error: "Escreve o parecer" }, { status: 400 });
      // Por omissão, o parecer sobe para quem encaminhou o documento a
      // esta pessoa (não para quem lhe respondeu com outro parecer).
      let to = await target(false);
      if (to === undefined) {
        const last = await prisma.auditLog.findFirst({
          where: {
            documentId: id,
            targetId: me.id,
            action: { in: [AuditAction.FORWARDED, AuditAction.SUBMITTED, AuditAction.REGISTERED] },
          },
          orderBy: { createdAt: "desc" },
        });
        to = last && last.actorId !== me.id ? await prisma.user.findUnique({ where: { id: last.actorId } }) : null;
      }
      if (!to) return NextResponse.json({ error: "Escolhe a quem envias o parecer" }, { status: 400 });
      data = { holderId: to.id };
      log = { action: AuditAction.OPINION, targetId: to.id };
      break;
    }
    case DocumentActionType.SUBMIT: {
      const to = await target(true);
      if (!to) return NextResponse.json({ error: "Escolhe o superior que vai apreciar" }, { status: 400 });
      data = { holderId: to.id, status: DocumentStatus.IN_REVIEW, submittedAt: new Date() };
      log = { action: AuditAction.SUBMITTED, targetId: to.id };
      break;
    }
    case DocumentActionType.APPROVE:
      data = { status: DocumentStatus.APPROVED, decidedAt: new Date(), decisionReason: text, holderId: doc.uploadedById };
      log = { action: AuditAction.APPROVED, targetId: doc.uploadedById };
      break;
    case DocumentActionType.RETURN:
      if (!text) return NextResponse.json({ error: "Indica o que é preciso corrigir" }, { status: 400 });
      data = { status: DocumentStatus.RETURNED, holderId: doc.uploadedById };
      log = { action: AuditAction.RETURNED, targetId: doc.uploadedById };
      break;
    case DocumentActionType.CLOSE:
      data = { status: DocumentStatus.CLOSED, holderId: null, decidedAt: new Date() };
      log = { action: AuditAction.CLOSED };
      break;
    case DocumentActionType.SEND:
      data = { status: DocumentStatus.SENT, holderId: null, sentAt: new Date() };
      log = { action: AuditAction.SENT };
      break;
  }

  // Só avança se o documento não mudou entretanto (duas pessoas ao mesmo tempo).
  const { count } = await prisma.document.updateMany({
    where: { id, status: doc.status, holderId: doc.holderId },
    data,
  });
  if (count === 0) {
    return NextResponse.json({ error: "O documento mudou entretanto, atualiza a página" }, { status: 409 });
  }
  await prisma.auditLog.create({
    data: { documentId: id, actorId: me.id, action: log.action, targetId: log.targetId ?? null, meta: text },
  });

  return NextResponse.json({ ok: true });
}
