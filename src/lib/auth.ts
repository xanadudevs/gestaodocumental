import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    }),
  );
}

// Conta de acesso inicial (bootstrap) e de recuperação: define
// BOOTSTRAP_USERNAME e BOOTSTRAP_PASSWORD_HASH (hash bcrypt, nunca a
// password em texto simples) no .env / na Vercel. Na primeira vez que se
// entra com ela, a conta é criada como ADMIN. Depois disso continua a
// funcionar como acesso de emergência: entrar com a password das
// variáveis de ambiente volta a pôr essa password e a role ADMIN na conta
// - se ficares sem acesso, basta mudar a variável na Vercel e fazer
// Redeploy. Sem estas variáveis definidas, este acesso fica desativado.
const BOOTSTRAP_USERNAME = process.env.BOOTSTRAP_USERNAME;
const BOOTSTRAP_PASSWORD_HASH = process.env.BOOTSTRAP_PASSWORD_HASH;

// Erro devolvido ao formulário de login quando a falha não é de
// credenciais (ex: base de dados inacessível).
export const LOGIN_SERVER_ERROR = "ServerError";

async function authorizeCredentials(login: string, password: string) {
  if (
    BOOTSTRAP_USERNAME &&
    BOOTSTRAP_PASSWORD_HASH &&
    login === BOOTSTRAP_USERNAME &&
    (await bcrypt.compare(password, BOOTSTRAP_PASSWORD_HASH))
  ) {
    const user = await prisma.user.upsert({
      where: { username: BOOTSTRAP_USERNAME },
      update: { passwordHash: BOOTSTRAP_PASSWORD_HASH, role: Role.ADMIN },
      create: {
        username: BOOTSTRAP_USERNAME,
        name: BOOTSTRAP_USERNAME,
        passwordHash: BOOTSTRAP_PASSWORD_HASH,
        role: Role.ADMIN,
      },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  // Aceita o username ou o email do utilizador.
  const user =
    (await prisma.user.findUnique({ where: { username: login } })) ??
    (await prisma.user.findUnique({ where: { email: login.toLowerCase() } }));
  if (!user?.passwordHash) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Login local por username/password - usado sobretudo para acesso inicial
// sem depender de OAuth. Funciona para utilizadores com passwordHash
// definido (criados por um ADMIN) e para a conta de bootstrap acima.
providers.push(
  CredentialsProvider({
    name: "Utilizador e password",
    credentials: {
      username: { label: "Utilizador ou email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials.password) return null;
      try {
        return await authorizeCredentials(credentials.username.trim(), credentials.password);
      } catch (err) {
        // Distingue "password errada" de "servidor/base de dados com
        // problemas" - o detalhe fica só no log do servidor.
        console.error("[auth] erro no login", err);
        throw new Error(LOGIN_SERVER_ERROR);
      }
    },
  }),
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  // O CredentialsProvider do NextAuth só suporta sessões JWT (não
  // "database"), por isso todos os fornecedores passam a usar JWT.
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // Vai sempre buscar a role atual à BD (em vez de confiar só no
        // token) para que mudanças feitas em /admin/users se reflitam de
        // imediato, sem esperar por novo login.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        session.user.role = (dbUser?.role as Role) ?? (token.role as Role);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // O primeiro utilizador a registar-se torna-se ADMIN automaticamente.
      const userCount = await prisma.user.count();
      if (userCount === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: Role.ADMIN },
        });
      }
    },
  },
};
