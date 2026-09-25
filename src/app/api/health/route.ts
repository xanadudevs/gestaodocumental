import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Diagnóstico rápido (público, sem segredos): a app consegue falar com a
// base de dados, e a configuração principal está como devia?
export async function GET() {
  const dbUrl = safeUrl(process.env.DATABASE_URL);
  const config = {
    databaseUrlPort: dbUrl?.port || null,
    databaseUrlPgbouncer: dbUrl?.searchParams.get("pgbouncer") === "true",
    nextauthUrl: safeUrl(process.env.NEXTAUTH_URL)?.origin ?? null,
    nextauthSecretSet: !!process.env.NEXTAUTH_SECRET,
    bootstrapLoginSet: !!process.env.BOOTSTRAP_USERNAME && !!process.env.BOOTSTRAP_PASSWORD_HASH,
  };

  try {
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, db: "ok", users, config });
  } catch (err) {
    const code =
      err instanceof Prisma.PrismaClientKnownRequestError || err instanceof Prisma.PrismaClientInitializationError
        ? ((err as { errorCode?: string; code?: string }).code ?? (err as { errorCode?: string }).errorCode ?? null)
        : null;
    const message = err instanceof Error ? err.message.split("\n").filter(Boolean).pop()?.slice(0, 300) : null;
    return NextResponse.json({ ok: false, db: "erro", code, message, config }, { status: 503 });
  }
}

function safeUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
