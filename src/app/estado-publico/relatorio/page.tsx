import type { Metadata } from "next";
import Link from "next/link";
import { isValidStatusToken } from "@/lib/statusPublic";
import StatusReportView from "@/components/StatusReportView";

export const metadata: Metadata = { title: "Relatório do estado dos sistemas DANAD", robots: { index: false, follow: false } };

// Relatório sem login, protegido pelo mesmo token da página partilhada.
export default async function PublicStatusReportPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!isValidStatusToken(token)) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="mb-2 text-xl font-semibold">Relatório do estado dos sistemas</h1>
        <p className="mb-4 text-sm text-gray-500">Para ver o relatório, abre primeiro a página do estado com o token de acesso.</p>
        <Link href="/estado-publico" className="text-sm text-brand-700 hover:underline">
          Ir para a página do estado
        </Link>
      </div>
    );
  }
  return <StatusReportView backHref={`/estado-publico?token=${encodeURIComponent(token!)}`} />;
}
