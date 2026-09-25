import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { hashPassword } from "@/lib/passwords";
import { emailSchema, nameSchema, optional, passwordSchema, usernameSchema } from "@/lib/userSchema";

const schema = z.object({
  name: nameSchema,
  email: optional(emailSchema),
  username: optional(usernameSchema),
  // Vazio = manter a password atual
  password: optional(passwordSchema),
});

// ADMIN edita os dados de um utilizador (nome, email, utilizador e,
// opcionalmente, define uma nova password). Role, unidade e nível são
// editados diretamente na tabela.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });

  const [byUsername, byEmail] = await Promise.all([
    data.username ? prisma.user.findUnique({ where: { username: data.username } }) : null,
    data.email ? prisma.user.findUnique({ where: { email: data.email } }) : null,
  ]);
  if (byUsername && byUsername.id !== id) {
    return NextResponse.json({ error: "Esse utilizador já existe" }, { status: 409 });
  }
  if (byEmail && byEmail.id !== id) {
    return NextResponse.json({ error: "Já existe um utilizador com esse email" }, { status: 409 });
  }

  // Quem tem password precisa de utilizador ou email para conseguir entrar.
  const hasPassword = !!data.password || !!user.passwordHash;
  if (hasPassword && !data.username && !data.email) {
    return NextResponse.json(
      { error: "Indica um utilizador ou um email - é com eles que a pessoa entra com a password" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email ?? null,
      username: data.username ?? null,
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
