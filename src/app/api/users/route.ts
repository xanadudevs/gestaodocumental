import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import { Level, Role } from "@/lib/enums";
import { MIN_PASSWORD_LENGTH, hashPassword } from "@/lib/passwords";

// Campos opcionais do formulário chegam como "" quando vazios.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const schema = z.object({
  name: z.string().trim().min(1, "Nome em falta"),
  email: optional(z.string().trim().toLowerCase().email("Email inválido")),
  username: z
    .string()
    .trim()
    .min(3, "O utilizador tem de ter pelo menos 3 caracteres")
    .regex(/^[a-zA-Z0-9._-]+$/, "O utilizador só pode ter letras, números, pontos, hífens e _"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `A password tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`),
  role: z.nativeEnum(Role),
  unitId: optional(z.string()),
  level: optional(z.nativeEnum(Level)),
});

// ADMIN cria um utilizador com login por utilizador/password.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const [byUsername, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username: data.username } }),
    data.email ? prisma.user.findUnique({ where: { email: data.email } }) : null,
  ]);
  if (byUsername) return NextResponse.json({ error: "Esse utilizador já existe" }, { status: 409 });
  if (byEmail) return NextResponse.json({ error: "Já existe um utilizador com esse email" }, { status: 409 });

  if (data.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) return NextResponse.json({ error: "Unidade inválida" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email ?? null,
      username: data.username,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      unitId: data.unitId ?? null,
      level: data.level ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json(user, { status: 201 });
}
