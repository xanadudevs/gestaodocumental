import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadFile } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const buffer = await downloadFile(document.filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName)}"`,
    },
  });
}
