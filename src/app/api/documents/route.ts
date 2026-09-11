import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { DocumentType } from "@/lib/enums";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const scope = searchParams.get("scope"); // "mine" | "assigned" | undefined (todos)

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (scope === "mine") where.uploadedById = session.user.id;
  if (scope === "assigned") where.approverId = session.user.id;

  const documents = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, name: true, email: true, image: true } },
      approver: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  const description = formData.get("description");
  const type = formData.get("type");
  const approverId = formData.get("approverId");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Título em falta" }, { status: 400 });
  }

  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 20MB)" }, { status: 400 });
  }

  let submitNow = typeof approverId === "string" && approverId.length > 0;
  if (submitNow) {
    const approver = await prisma.user.findUnique({ where: { id: approverId as string } });
    if (!approver || (approver.role !== "APPROVER" && approver.role !== "ADMIN")) {
      return NextResponse.json({ error: "Aprovador inválido" }, { status: 400 });
    }
  }

  const saved = await saveUploadedFile(file);

  const docType = Object.values(DocumentType).includes(type as DocumentType)
    ? (type as DocumentType)
    : DocumentType.OTHER;

  const document = await prisma.document.create({
    data: {
      title: title.trim(),
      description: typeof description === "string" ? description : null,
      type: docType,
      status: submitNow ? "PENDING" : "DRAFT",
      fileName: saved.fileName,
      filePath: saved.filePath,
      fileSize: saved.fileSize,
      mimeType: saved.mimeType,
      uploadedById: session.user.id,
      approverId: submitNow ? (approverId as string) : null,
      submittedAt: submitNow ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      documentId: document.id,
      actorId: session.user.id,
      action: "UPLOADED",
    },
  });

  if (submitNow) {
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        actorId: session.user.id,
        action: "SUBMITTED",
      },
    });
  }

  return NextResponse.json(document, { status: 201 });
}
