import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { loadSystems, summarize } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import { isValidStatusToken } from "@/lib/statusPublic";
import StatusBoard from "@/components/StatusBoard";
import AutoRefresh from "@/components/AutoRefresh";
import StatusTabs from "@/components/StatusTabs";
import StatusTokenGate from "@/components/StatusTokenGate";
import StatusMiniSummary from "@/components/StatusMiniSummary";

export const metadata: Metadata = { title: "Estado dos sistemas DANAD", robots: { index: false, follow: false } };

// Página de submissão, sem login mas protegida por token (?token=...): quem
// tem o link vê todos os sistemas e atualiza o estado de qualquer um. O
// relatório está na outra página (/estado-publico/relatorio).
export default async function PublicStatusPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!isValidStatusToken(token)) {
    return <StatusTokenGate title="Estado dos sistemas DANAD" invalid={!!token} />;
  }

  const systems = await loadSystems(prisma);
  const summary = summarize(systems);

  return (
    <div>
      <AutoRefresh seconds={60} />
      <h1 className="text-xl font-semibold">Estado dos sistemas DANAD</h1>
      <p className="mb-3 text-sm text-gray-500">Atualizado em {formatDate(summary.generatedAt)}</p>
      <StatusTabs section="submissao" shared={{ token: token! }} />

      <p className="mb-4 text-sm text-gray-600">
        Atualiza o estado dos sistemas: &quot;Tudo OK&quot;, &quot;Degradado&quot;, &quot;Em baixo&quot; ou &quot;Por
        verificar&quot;, ou abre um sistema para marcar só um componente. O relatório está no separador
        &quot;Relatório&quot;.
      </p>

      {systems.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          Ainda não há sistemas registados. Um Administrador tem de os importar em /estado.
        </p>
      ) : (
        <>
          <StatusMiniSummary summary={summary} />
          <StatusBoard
            isAdmin={false}
            apiBase="/api/status/shared"
            shared={{ token: token! }}
            systems={systems.map((s) => ({
              id: s.id,
              name: s.name,
              unitCode: s.unitCode,
              ownerName: s.ownerName,
              criticality: s.criticality,
              status: s.status,
              stale: s.stale,
              components: s.components.map((c) => ({ ...c, statusAt: c.statusAt.toISOString() })),
            }))}
          />
        </>
      )}
    </div>
  );
}
