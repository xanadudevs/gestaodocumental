import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LicenseStatus } from "@/lib/enums";
import { decideLicense } from "@/lib/licenseDecision";

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

  const result = await decideLicense({ id, decision, reason, actor: { id: session.user.id, role: session.user.role } });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id, status: decision });
}
