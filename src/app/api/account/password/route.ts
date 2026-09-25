import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/passwords";

// O próprio utilizador muda a sua password.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const invalid = validatePassword(body.newPassword);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "A tua conta entra por Google/Microsoft e não tem password" }, { status: 400 });
  }
  const valid =
    typeof body.currentPassword === "string" && (await bcrypt.compare(body.currentPassword, user.passwordHash));
  if (!valid) return NextResponse.json({ error: "A password atual está incorreta" }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
  return NextResponse.json({ ok: true });
}
