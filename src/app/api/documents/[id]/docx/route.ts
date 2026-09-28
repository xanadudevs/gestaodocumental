import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTemplate, renderDocx } from "@/lib/docx";

// Gera o Word (template SPMS) de uma informação/ofício com os dados atuais,
// incluindo pareceres e despacho já dados.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      unit: { select: { name: true } },
      uploadedBy: { select: { name: true } },
      auditLogs: {
        include: { actor: { select: { name: true, level: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  if (!hasTemplate(doc.type)) return NextResponse.json({ error: "Este documento não tem Word" }, { status: 400 });

  const buffer = await renderDocx(doc);
  const name = `${doc.type === "OFICIO" ? "Oficio" : "Informacao"} ${doc.reference ?? doc.id}`.replace(/[/\\\\]/g, "-");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.docx`,
    },
  });
}
