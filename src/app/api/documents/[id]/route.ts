import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction, DocumentType } from "@/lib/enums";
import { DocumentActionType, availableActions } from "@/lib/documents";
import { destinationOf, informacaoSchema, oficioSchema } from "@/lib/documentForms";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true, image: true } },
      approver: { select: { id: true, name: true, email: true, image: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: { actor: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  return NextResponse.json(document);
}

// Edita o conteúdo de uma informação/ofício (rascunho ou devolvido).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const [doc, me] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, level: true } }),
  ]);
  if (!doc || !me) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  if (!availableActions(doc, me).includes(DocumentActionType.EDIT)) {
    return NextResponse.json({ error: "Este documento já não pode ser editado" }, { status: 403 });
  }

  const schema = doc.type === DocumentType.INFORMACAO ? informacaoSchema : oficioSchema;
  const parsed = schema.safeParse((await req.json().catch(() => ({}))).data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const { assunto, ...rest } = parsed.data;
  await prisma.document.update({
    where: { id },
    data: { title: assunto, formData: rest, destination: destinationOf(doc.type, parsed.data) || null },
  });
  await prisma.auditLog.create({ data: { documentId: id, actorId: me.id, action: AuditAction.EDITED } });
  return NextResponse.json({ ok: true });
}
