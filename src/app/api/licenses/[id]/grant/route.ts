import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageLicenses } from "@/lib/permissions";
import { LicenseStatus } from "@/lib/enums";
import { grantLicense } from "@/lib/licenseGrant";

// Apoio Administrativo marca o acesso como dado.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageLicenses(session.user.role)) {
    return NextResponse.json({ error: "Só o Apoio Administrativo pode dar o acesso" }, { status: 403 });
  }

  const { id } = await params;
  const result = await grantLicense(id, session.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id, status: LicenseStatus.GRANTED });
}
