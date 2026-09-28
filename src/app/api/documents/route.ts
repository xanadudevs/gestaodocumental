import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction, DocumentFlow, DocumentStatus, DocumentType } from "@/lib/enums";
import { ENTRY_TYPES, defaultOrigin, findDirector } from "@/lib/documents";
import { destinationOf, informacaoSchema, oficioSchema } from "@/lib/documentForms";
import { nextReference } from "@/lib/references";
import { COORDINATION_NAMES, ORG_CHART } from "@/lib/orgChart";
import { saveAttachments } from "@/lib/attachments";

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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function readFiles(formData: FormData) {
  return formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
}

// Cria um documento:
// - kind=ENTRY: regista uma entrada (fatura, email, ofício, externo) que vai
//   para o Diretor (ou para quem for indicado);
// - kind=INFORMACAO | OFICIO: cria um rascunho a partir do template.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const kind = formData.get("kind");
  const files = readFiles(formData);
  if (files.some((f) => f.size > MAX_FILE_SIZE)) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 20MB)" }, { status: 400 });
  }

  const direction = await prisma.unit.findFirst({ where: { name: ORG_CHART.name } });
  if (!direction) {
    return NextResponse.json({ error: "A estrutura organizacional ainda não foi criada" }, { status: 400 });
  }

  let created: { id: string };

  if (kind === "ENTRY") {
    const str = (k: string) => (typeof formData.get(k) === "string" ? (formData.get(k) as string).trim() : "");
    const type = str("type");
    if (!ENTRY_TYPES.some((t) => t.type === type)) {
      return NextResponse.json({ error: "Tipo de entrada inválido" }, { status: 400 });
    }
    const title = str("title");
    if (!title) return NextResponse.json({ error: "Assunto em falta" }, { status: 400 });

    const holderId = str("holderId") || (await findDirector(prisma))?.id;
    const holder = holderId ? await prisma.user.findUnique({ where: { id: holderId } }) : null;
    if (!holder) return NextResponse.json({ error: "Escolhe para quem vai a entrada" }, { status: 400 });

    const receivedAt = str("receivedAt") ? new Date(str("receivedAt")) : new Date();
    if (Number.isNaN(receivedAt.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

    const reference = await nextReference(prisma, direction, receivedAt);
    created = await prisma.document.create({
      data: {
        reference,
        title,
        description: str("description") || null,
        type,
        flow: DocumentFlow.IN,
        status: DocumentStatus.RECEIVED,
        origin: str("origin") || defaultOrigin(type) || null,
        externalRef: str("externalRef") || null,
        receivedAt,
        unitId: direction.id,
        uploadedById: session.user.id,
        holderId: holder.id,
        auditLogs: {
          create: { actorId: session.user.id, action: AuditAction.REGISTERED, targetId: holder.id },
        },
      },
      select: { id: true },
    });
  } else if (kind === DocumentType.INFORMACAO || kind === DocumentType.OFICIO) {
    const schema = kind === DocumentType.INFORMACAO ? informacaoSchema : oficioSchema;
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("data") ?? "{}"));
    } catch {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const unitId = String(formData.get("unitId") ?? "");
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit || !(unit.id === direction.id || COORDINATION_NAMES.has(unit.name))) {
      return NextResponse.json({ error: "Escolhe a unidade que emite o documento" }, { status: 400 });
    }

    const reference = await nextReference(prisma, unit);
    const { assunto, ...rest } = parsed.data;
    created = await prisma.document.create({
      data: {
        reference,
        title: assunto,
        type: kind,
        flow: DocumentFlow.OUT,
        status: DocumentStatus.DRAFT,
        destination: destinationOf(kind, parsed.data) || null,
        formData: rest,
        unitId: unit.id,
        uploadedById: session.user.id,
        holderId: session.user.id,
        auditLogs: { create: { actorId: session.user.id, action: AuditAction.CREATED } },
      },
      select: { id: true },
    });
  } else {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  await saveAttachments(created.id, session.user.id, files);
  return NextResponse.json(created, { status: 201 });
}
