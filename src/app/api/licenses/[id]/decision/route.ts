import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDecideOnLicense } from "@/lib/permissions";
import { LicenseAction, LicenseStatus } from "@/lib/enums";
import { countActiveLicenses, getLicenseProduct } from "@/lib/licenses";
import { approvedMail, licenseRequestMailInclude, notify, rejectedMail } from "@/lib/licenseMail";

class ConflictError extends Error {}

function isSerializationFailure(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}

// Em conflito com outra transação em simultâneo, o Postgres aborta uma
// delas - repete-se com um pequeno atraso aleatório.
async function withSerializationRetry<T>(fn: () => Promise<T>, attempts = 8): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isSerializationFailure(err) || i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 20 * i + Math.random() * 50 * i));
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const decision = body.decision as "APPROVED" | "REJECTED" | undefined;
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

  if (decision !== LicenseStatus.APPROVED && decision !== LicenseStatus.REJECTED) {
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });
  }
  if (decision === LicenseStatus.REJECTED && !reason) {
    return NextResponse.json({ error: "Indica o motivo da rejeição" }, { status: 400 });
  }

  const request = await prisma.licenseRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (!canDecideOnLicense(session.user.role, request.coordinatorId, session.user.id)) {
    return NextResponse.json({ error: "Só o coordenador indicado pode decidir sobre este pedido" }, { status: 403 });
  }
  if (request.status !== LicenseStatus.PENDING) {
    return NextResponse.json({ error: "O pedido já não está pendente" }, { status: 409 });
  }

  const product = getLicenseProduct(request.product);

  try {
    // Transação serializável: dois coordenadores a aprovar ao mesmo tempo
    // não conseguem ultrapassar o limite da Direção.
    await withSerializationRetry(() =>
      prisma.$transaction(
        async (tx) => {
          if (decision === LicenseStatus.APPROVED && product?.countedTypes.includes(request.licenseType as never)) {
            const active = await countActiveLicenses(tx, request.directionId, request.product);
            if (active >= product.maxPerDirection) {
              throw new ConflictError(
                `Limite atingido: a Direção já tem ${active} de ${product.maxPerDirection} licenças ${product.name} ocupadas. Liberta uma licença antes de aprovar.`,
              );
            }
          }
          const { count } = await tx.licenseRequest.updateMany({
            where: { id, status: LicenseStatus.PENDING },
            data: { status: decision, decisionReason: reason, decidedAt: new Date() },
          });
          if (count === 0) throw new ConflictError("O pedido já não está pendente");
          await tx.licenseEvent.create({
            data: {
              requestId: id,
              actorId: session.user.id,
              action: decision === LicenseStatus.APPROVED ? LicenseAction.APPROVED : LicenseAction.REJECTED,
              meta: reason ?? undefined,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (isSerializationFailure(err)) {
      return NextResponse.json(
        { error: "Conflito com outra aprovação em simultâneo, tenta novamente" },
        { status: 409 },
      );
    }
    throw err;
  }

  const updated = await prisma.licenseRequest.findUniqueOrThrow({
    where: { id },
    include: licenseRequestMailInclude,
  });

  if (decision === LicenseStatus.APPROVED) {
    await notify(
      id,
      session.user.id,
      approvedMail(updated),
      "LICENSE_SUPPORT_EMAIL não configurado - Apoio Administrativo não foi notificado por email",
    );
  } else {
    await notify(id, session.user.id, rejectedMail(updated));
  }

  return NextResponse.json({ id, status: decision });
}
