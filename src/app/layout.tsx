import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Gestão e Suporte DANAD",
  description: "Gestão documental e pedidos de licenças com fluxo de aprovação",
};

// Toda a app depende de sessão de utilizador (NextAuth/Prisma), por isso
// nunca deve ser pré-renderizada estaticamente em build - isso evita que o
// Next.js tente gerar a página /_not-found em build time sem pedido real
// (e sem variáveis de ambiente de runtime disponíveis).
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
