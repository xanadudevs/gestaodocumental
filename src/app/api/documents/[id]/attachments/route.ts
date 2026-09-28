import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { saveAttachments } from "@/lib/attachments";

// Junta anexos a um documento: quem o tem, quem o criou ou um ADMIN.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  const allowed =
    doc.holderId === session.user.id || doc.uploadedById === session.user.id || session.user.role === Role.ADMIN;
  if (!allowed) return NextResponse.json({ error: "Só quem tem o documento pode juntar anexos" }, { status: 403 });

  const files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Nenhum ficheiro escolhido" }, { status: 400 });
  if (files.some((f) => f.size > 20 * 1024 * 1024)) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 20MB)" }, { status: 400 });
  }
  await saveAttachments(id, session.user.id, files);
  return NextResponse.json({ ok: true }, { status: 201 });
}
