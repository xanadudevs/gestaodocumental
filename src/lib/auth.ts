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
    })
  );
}

if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    })
  );
}

// Conta de acesso inicial (bootstrap): permite entrar sem depender de OAuth
// configurado. Na primeira vez que se faz login com este utilizador, a
// conta é criada automaticamente como ADMIN - não é preciso terminal nem
// passo manual na base de dados. As credenciais vêm sempre de variáveis
// de ambiente (nunca de um valor no código) - define BOOTSTRAP_USERNAME e
// BOOTSTRAP_PASSWORD_HASH (hash bcrypt, não a password em texto simples)
// no .env / na Vercel. Sem estas variáveis definidas, este acesso fica
// desativado.
const BOOTSTRAP_USERNAME = process.env.BOOTSTRAP_USERNAME;
const BOOTSTRAP_PASSWORD_HASH = process.env.BOOTSTRAP_PASSWORD_HASH;

// Login local por username/password - usado sobretudo para acesso inicial
// sem depender de OAuth. Funciona para utilizadores com passwordHash
// definido (criados por um ADMIN) e para a conta de bootstrap acima.
providers.push(
  CredentialsProvider({
    name: "Utilizador e password",
    credentials: {
      username: { label: "Utilizador", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials.password) return null;

      let user = await prisma.user.findUnique({
        where: { username: credentials.username },
      });

      if (!user && BOOTSTRAP_USERNAME && BOOTSTRAP_PASSWORD_HASH && credentials.username === BOOTSTRAP_USERNAME) {
        const matchesBootstrap = await bcrypt.compare(credentials.password, BOOTSTRAP_PASSWORD_HASH);
        if (!matchesBootstrap) return null;
        user = await prisma.user.create({
          data: {
            username: BOOTSTRAP_USERNAME,
            name: BOOTSTRAP_USERNAME,
            passwordHash: BOOTSTRAP_PASSWORD_HASH,
            role: Role.ADMIN,
          },
        });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }

      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })
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
