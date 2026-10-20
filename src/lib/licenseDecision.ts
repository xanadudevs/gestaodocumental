import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canDecideOnLicense } from "@/lib/permissions";
import { LicenseAction, LicenseStatus, type Role } from "@/lib/enums";
import { countActiveLicenses, getLicenseProduct, isAtLimit, limitFor } from "@/lib/licenses";
import { approvedMail, licenseRequestMailInclude, notify, rejectedMail } from "@/lib/licenseMail";
import { unitCodeOf } from "@/lib/orgChart";

export class ConflictError extends Error {}

export function isSerializationFailure(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}

// Em conflito com outra transação em simultâneo, o Postgres aborta uma
// delas - repete-se com um pequeno atraso aleatório.
export async function withSerializationRetry<T>(fn: () => Promise<T>, attempts = 8): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isSerializationFailure(err) || i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 20 * i + Math.random() * 50 * i));
    }
  }
}

export type DecisionResult = { ok: true } | { ok: false; status: number; error: string };

// Aprova ou rejeita um pedido pendente (usada na decisão individual e na
// aprovação em lote): valida permissão, estado e limite da quota, grava o
// histórico e avisa por email.
export async function decideLicense(opts: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
  actor: { id: string; role: Role };
}): Promise<DecisionResult> {
  const { id, decision, reason, actor } = opts;

  const request = await prisma.licenseRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, status: 404, error: "Pedido não encontrado" };
  if (!canDecideOnLicense(actor.role, request.coordinatorId, actor.id)) {
    return { ok: false, status: 403, error: "Só o coordenador indicado pode decidir sobre este pedido" };
  }
  if (request.status !== LicenseStatus.PENDING) {
    return { ok: false, status: 409, error: "O pedido já não está pendente" };
  }

  const product = getLicenseProduct(request.product);
  const coordination = await prisma.unit.findUnique({ where: { id: request.coordinationId }, select: { name: true } });
  const limit = product ? limitFor(product, coordination ? unitCodeOf(coordination.name) : undefined) : null;

  try {
    // Transação serializável: dois coordenadores a aprovar ao mesmo tempo
    // não conseguem ultrapassar o limite.
    await withSerializationRetry(() =>
      prisma.$transaction(
        async (tx) => {
          if (decision === LicenseStatus.APPROVED && product?.countedTypes.includes(request.licenseType as never)) {
            const active = await countActiveLicenses(
              tx,
              { directionId: request.directionId, coordinationId: request.coordinationId },
              request.product,
            );
            if (isAtLimit(limit, active)) {
              throw new ConflictError(
                `Limite atingido: ${product.maxPerUnit ? coordination?.name ?? "a unidade" : "a Direção"} já tem ${active} de ${limit} licenças ${product.name} ocupadas. Liberta uma licença antes de aprovar.`,
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
              actorId: actor.id,
              action: decision === LicenseStatus.APPROVED ? LicenseAction.APPROVED : LicenseAction.REJECTED,
              meta: reason ?? undefined,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  } catch (err) {
    if (err instanceof ConflictError) return { ok: false, status: 409, error: err.message };
    if (isSerializationFailure(err)) {
      return { ok: false, status: 409, error: "Conflito com outra aprovação em simultâneo, tenta novamente" };
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
      actor.id,
      approvedMail(updated),
      "LICENSE_SUPPORT_EMAIL não configurado - Apoio Administrativo não foi notificado por email",
    );
  } else {
    await notify(id, actor.id, rejectedMail(updated));
  }
  return { ok: true };
}
