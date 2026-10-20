import { prisma } from "@/lib/prisma";
import { LicenseAction, LicenseStatus } from "@/lib/enums";
import { grantedMail, licenseRequestMailInclude, notify } from "@/lib/licenseMail";

export type GrantResult = { ok: true } | { ok: false; status: number; error: string };

// Marca o acesso como dado num pedido aprovado, regista o histórico e avisa por
// email (usada no botão "Acesso dado" e na atribuição em lote).
export async function grantLicense(id: string, actorId: string): Promise<GrantResult> {
  const { count } = await prisma.licenseRequest.updateMany({
    where: { id, status: LicenseStatus.APPROVED },
    data: { status: LicenseStatus.GRANTED, grantedAt: new Date() },
  });
  if (count === 0) return { ok: false, status: 409, error: "O pedido não existe ou não está aprovado" };

  await prisma.licenseEvent.create({
    data: { requestId: id, actorId, action: LicenseAction.GRANTED },
  });
  const request = await prisma.licenseRequest.findUniqueOrThrow({
    where: { id },
    include: licenseRequestMailInclude,
  });
  await notify(id, actorId, grantedMail(request));
  return { ok: true };
}
