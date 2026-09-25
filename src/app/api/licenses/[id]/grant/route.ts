import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageLicenses } from "@/lib/permissions";
import { LicenseAction, LicenseStatus } from "@/lib/enums";
import { grantedMail, licenseRequestMailInclude, notify } from "@/lib/licenseMail";

// Apoio Administrativo marca o acesso como dado.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageLicenses(session.user.role)) {
    return NextResponse.json({ error: "Só o Apoio Administrativo pode dar o acesso" }, { status: 403 });
  }

  const { id } = await params;
  const { count } = await prisma.licenseRequest.updateMany({
    where: { id, status: LicenseStatus.APPROVED },
    data: { status: LicenseStatus.GRANTED, grantedAt: new Date() },
  });
  if (count === 0) {
    return NextResponse.json({ error: "O pedido não existe ou não está aprovado" }, { status: 409 });
  }

  await prisma.licenseEvent.create({
    data: { requestId: id, actorId: session.user.id, action: LicenseAction.GRANTED },
  });

  const request = await prisma.licenseRequest.findUniqueOrThrow({
    where: { id },
    include: licenseRequestMailInclude,
  });
  await notify(id, session.user.id, grantedMail(request));

  return NextResponse.json({ id, status: LicenseStatus.GRANTED });
}
