import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Comentário vazio" }, { status: 400 });

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: {
      documentId: id,
      authorId: session.user.id,
      body: text,
    },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });

  await prisma.auditLog.create({
    data: { documentId: id, actorId: session.user.id, action: "COMMENTED" },
  });

  return NextResponse.json(comment, { status: 201 });
}
