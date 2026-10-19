import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { loadSystems, summarize } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import { isValidStatusToken } from "@/lib/statusPublic";
import StatusOverview from "@/components/StatusOverview";
import StatusBoard from "@/components/StatusBoard";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Estado dos sistemas DANAD", robots: { index: false, follow: false } };

// Página sem login mas protegida por token (?token=...), só de leitura. Mostra apenas o estado de
// cada sistema e dos seus componentes (aplicação, base de dados, serviços):
// não expõe responsáveis, notas nem quem alterou.
export default async function PublicStatusPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!isValidStatusToken(token)) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="mb-2 text-xl font-semibold">Estado dos sistemas DANAD</h1>
        <p className="mb-4 text-sm text-gray-500">Indica o token de acesso para ver e atualizar o estado dos sistemas.</p>
        <form method="get" className="flex gap-2">
          <input
            name="token"
            type="password"
            required
            autoFocus
            placeholder="Token"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Entrar
          </button>
        </form>
        {token && <p className="mt-2 text-sm text-red-600">Token inválido.</p>}
      </div>
    );
  }

  const systems = await loadSystems(prisma);
  const summary = summarize(systems);

  return (
    <div>
      <AutoRefresh seconds={60} />
      <h1 className="text-xl font-semibold">Estado dos sistemas DANAD</h1>
      <p className="mb-4 text-sm text-gray-500">
        Atualizado em {formatDate(summary.generatedAt)} · atualiza-se sozinha · qualquer pessoa com este link pode
        atualizar o estado: usa &quot;Tudo OK&quot;, &quot;Degradado&quot; ou &quot;Em baixo&quot;, ou abre um sistema para
        marcar só um componente.
      </p>

      {systems.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          Ainda não há sistemas registados. Um Administrador tem de os importar em /estado.
        </p>
      ) : (
        <>
          <StatusOverview systems={systems} />

          <h2 className="mb-2 text-sm font-semibold text-gray-700">Todos os sistemas</h2>
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
