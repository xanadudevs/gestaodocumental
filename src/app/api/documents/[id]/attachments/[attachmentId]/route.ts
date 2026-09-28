import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, attachmentId } = await params;
  const att = await prisma.documentAttachment.findFirst({ where: { id: attachmentId, documentId: id } });
  if (!att) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  const buffer = await downloadFile(att.filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
    },
  });
}
