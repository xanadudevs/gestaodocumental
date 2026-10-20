import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditLicense } from "@/lib/permissions";
import { Level, LicenseAction, LicenseType, Role } from "@/lib/enums";
import {
  ACTIVE_LICENSE_STATUSES,
  OPEN_LICENSE_STATUSES,
  getLicenseProduct,
  isAtLimit,
  limitFor,
  resolveDirection,
} from "@/lib/licenses";
import { COORDINATION_NAMES, ORG_CHART, unitCodeOf } from "@/lib/orgChart";
import { ConflictError, isSerializationFailure, withSerializationRetry } from "@/lib/licenseDecision";

const schema = z.object({
  product: z.string(),
  licenseType: z.nativeEnum(LicenseType),
  beneficiaryName: z.string().trim().min(1, "Nome em falta"),
  beneficiaryEmail: z.string().trim().toLowerCase().email("Email profissional inválido"),
  jobTitle: z.string().trim().optional(),
  superiorName: z.string().trim().min(1, "Nome do gestor de projeto em falta"),
  superiorEmail: z.string().trim().toLowerCase().email("Email do gestor de projeto inválido"),
  coordinationId: z.string().min(1, "Unidade em falta"),
  coordinatorId: z.string().min(1, "Coordenador em falta"),
  project: z.string().trim().optional(),
  justification: z.string().trim().min(1, "Justificação em falta"),
});

const FIELD_LABELS: Record<string, string> = {
  product: "software",
  licenseType: "tipo",
  beneficiaryName: "nome",
  beneficiaryEmail: "email",
  jobTitle: "função",
  superiorName: "gestor de projeto",
  superiorEmail: "email do gestor",
  coordinationId: "unidade",
  coordinatorId: "coordenador",
  project: "projeto",
  justification: "justificação",
};

// Edita um pedido de licença (Admin e Gestor de Licenças em qualquer estado; o
// coordenador indicado enquanto está pendente). Se a licença já ocupa um lugar,
// a nova combinação software/tipo/unidade tem de caber na quota.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const request = await prisma.licenseRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (!canEditLicense(session.user.role, request.status, request.coordinatorId, session.user.id)) {
    return NextResponse.json({ error: "Sem permissão para editar este pedido" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const product = getLicenseProduct(data.product);
  if (!product || !product.types.includes(data.licenseType)) {
    return NextResponse.json({ error: "Licença inválida" }, { status: 400 });
  }

  const coordination = await prisma.unit.findUnique({ where: { id: data.coordinationId }, select: { name: true } });
  if (!coordination || !(COORDINATION_NAMES.has(coordination.name) || coordination.name === ORG_CHART.name)) {
    return NextResponse.json({ error: "Escolhe uma das unidades da DANAD" }, { status: 400 });
  }
  const direction = await resolveDirection(prisma, data.coordinationId);
  if (!direction) return NextResponse.json({ error: "Unidade inválida" }, { status: 400 });

  const coordinator = await prisma.user.findFirst({
    where: {
      id: data.coordinatorId,
      OR: [{ level: { in: [Level.COORDENACAO, Level.DIRECAO] } }, { role: { in: [Role.ADMIN, Role.APPROVER] } }],
    },
  });
  if (!coordinator) return NextResponse.json({ error: "Coordenador inválido" }, { status: 400 });

  const duplicate = await prisma.licenseRequest.findFirst({
    where: {
      id: { not: id },
      product: product.key,
      beneficiaryEmail: data.beneficiaryEmail,
      status: { in: OPEN_LICENSE_STATUSES },
    },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `Já existe um pedido ${product.name} em curso ou ativo para ${data.beneficiaryEmail}` },
      { status: 409 }
    );
  }

  const next = {
    product: product.key,
    licenseType: data.licenseType,
    beneficiaryName: data.beneficiaryName,
    beneficiaryEmail: data.beneficiaryEmail,
    jobTitle: data.jobTitle || null,
    superiorName: data.superiorName,
    superiorEmail: data.superiorEmail,
    coordinationId: data.coordinationId,
    directionId: direction.id,
    coordinatorId: coordinator.id,
    project: data.project || null,
    justification: data.justification,
  };
  const changed = Object.keys(FIELD_LABELS).filter(
    (k) => (request as Record<string, unknown>)[k] !== (next as Record<string, unknown>)[k]
  );
  if (changed.length === 0) return NextResponse.json({ id, changed: [] });

  try {
    await withSerializationRetry(() =>
      prisma.$transaction(
        async (tx) => {
          // Uma licença aprovada ou atribuída ocupa um lugar: a nova combinação
          // tem de caber na quota (sem contar este pedido).
          if (ACTIVE_LICENSE_STATUSES.includes(request.status) && product.countedTypes.includes(data.licenseType)) {
            const active = await tx.licenseRequest.count({
              where: {
                id: { not: id },
                ...(product.maxPerUnit ? { coordinationId: data.coordinationId } : { directionId: direction.id }),
                product: product.key,
                status: { in: ACTIVE_LICENSE_STATUSES },
                licenseType: { in: product.countedTypes },
              },
            });
            const limit = limitFor(product, unitCodeOf(coordination.name));
            if (isAtLimit(limit, active)) {
              throw new ConflictError(
                limit === 0
                  ? `${coordination.name} não tem licenças ${product.name} atribuídas.`
                  : `Limite atingido: ${product.maxPerUnit ? coordination.name : direction.name} já tem ${active} de ${limit} licenças ${product.name} ocupadas.`
              );
            }
          }
          await tx.licenseRequest.update({ where: { id }, data: next });
          await tx.licenseEvent.create({
            data: {
              requestId: id,
              actorId: session.user.id,
              action: LicenseAction.EDITED,
              meta: changed.map((k) => FIELD_LABELS[k]).join(", "),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
  } catch (err) {
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (isSerializationFailure(err)) {
      return NextResponse.json({ error: "Conflito com outra alteração em simultâneo, tenta novamente" }, { status: 409 });
    }
    throw err;
  }
  return NextResponse.json({ id, changed });
}
