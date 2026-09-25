import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { hashPassword, validatePassword } from "@/lib/passwords";

// ADMIN define uma nova password para um utilizador (ex: esqueceu-se).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const invalid = validatePassword(body.password);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
  if (!user.username) {
    return NextResponse.json(
      { error: "Este utilizador entra por Google/Microsoft e não tem username para login com password" },
      { status: 400 }
    );
  }

  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(body.password) } });
  return NextResponse.json({ ok: true });
}
