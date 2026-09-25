import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageLicenses } from "@/lib/permissions";
import { LicenseAction, LicenseStatus } from "@/lib/enums";
import { ACTIVE_LICENSE_STATUSES } from "@/lib/licenses";

// Liberta uma licença (ex: a pessoa saiu ou já não precisa), abrindo
// lugar no limite da Direção.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageLicenses(session.user.role)) {
    return NextResponse.json({ error: "Só o Apoio Administrativo pode libertar licenças" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

  const { count } = await prisma.licenseRequest.updateMany({
    where: { id, status: { in: ACTIVE_LICENSE_STATUSES } },
    data: { status: LicenseStatus.REVOKED, revokedAt: new Date() },
  });
  if (count === 0) {
    return NextResponse.json({ error: "A licença não existe ou não está ativa" }, { status: 409 });
  }

  await prisma.licenseEvent.create({
    data: { requestId: id, actorId: session.user.id, action: LicenseAction.REVOKED, meta: reason ?? undefined },
  });

  return NextResponse.json({ id, status: LicenseStatus.REVOKED });
}
