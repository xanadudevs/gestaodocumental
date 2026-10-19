import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { loadSystems } from "@/lib/status";
import { isValidStatusToken } from "@/lib/statusPublic";
import StatusOverview from "@/components/StatusOverview";
import AutoRefresh from "@/components/AutoRefresh";
import StatusTabs from "@/components/StatusTabs";
import StatusTokenGate from "@/components/StatusTokenGate";
import { formatDate } from "@/lib/labels";

export const metadata: Metadata = { title: "Relatório do estado dos sistemas DANAD", robots: { index: false, follow: false } };

// Relatório, sem login e protegido pelo mesmo token da página de submissão.
export default async function PublicStatusReportPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!isValidStatusToken(token)) {
    return <StatusTokenGate title="Relatório do estado dos sistemas DANAD" invalid={!!token} />;
  }

  const systems = await loadSystems(prisma);

  return (
    <div>
      <AutoRefresh seconds={60} />
      <h1 className="text-xl font-semibold">Relatório do estado dos sistemas DANAD</h1>
      <p className="mb-3 text-sm text-gray-500">Gerado em {formatDate(new Date())}</p>
      <StatusTabs section="relatorio" shared={{ token: token! }} />
      <StatusOverview systems={systems} />
    </div>
  );
}
