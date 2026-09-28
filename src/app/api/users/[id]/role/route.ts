import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { Role } from "@/lib/enums";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const role = body.role as Role;
  if (!Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Role inválida" }, { status: 400 });
  }

  // Evita ficar sem administradores (ex: alguém tirar-se a si próprio o
  // papel de ADMIN sem querer).
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
  if (target.role === Role.ADMIN && role !== Role.ADMIN) {
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Não podes tirar a ti próprio o papel de Administrador. Pede a outro administrador." },
        { status: 400 }
      );
    }
    const admins = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Tem de existir pelo menos um Administrador." }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
  });

  return NextResponse.json(updated);
}
