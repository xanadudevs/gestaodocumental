import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { Level } from "@/lib/enums";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const unitId = typeof body.unitId === "string" && body.unitId.length > 0 ? body.unitId : null;
  const level = typeof body.level === "string" && body.level.length > 0 ? body.level : null;

  if (level && !Object.values(Level).includes(level as Level)) {
    return NextResponse.json({ error: "Nível inválido" }, { status: 400 });
  }
  if (unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) return NextResponse.json({ error: "Unidade inválida" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { unitId, level },
  });

  return NextResponse.json(updated);
}
