import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, UNIT_ORDER, loadSystems, summarize, type SystemView } from "@/lib/status";
import { formatDate } from "@/lib/labels";
import StatusSummaryCards, { StatusBar } from "@/components/StatusSummaryCards";
import StatusBadge from "@/components/StatusBadge";
import CopyReportButton from "@/components/CopyReportButton";
import PrintButton from "@/components/PrintButton";

const fmt = (n: number) => n.toLocaleString("pt-PT");

function problemLine(s: SystemView) {
  const parts = s.components
    .filter((c) => c.status !== "OK")
    .map((c) => `${c.name}: ${STATUS_LABELS[c.status].toLowerCase()}${c.note ? ` (${c.note})` : ""}`);
  return `- ${s.name}${s.ownerName ? ` [${s.ownerName}]` : ""} — ${STATUS_LABELS[s.status]}${parts.length ? ` · ${parts.join("; ")}` : ""}`;
}

function buildText(systems: SystemView[], summary: ReturnType<typeof summarize>) {
  const { systems: c } = summary;
  const lines = [
    `Estado dos sistemas DANAD — ${formatDate(summary.generatedAt)}`,
    "",
    `${fmt(summary.pctOk)}% dos sistemas OK (${c.OK} de ${c.total})`,
    `Degradados: ${c.DEGRADED} · Em baixo: ${c.DOWN} · Por verificar: ${c.UNKNOWN}`,
    `Verificados: ${fmt(summary.pctVerified)}%${summary.stale ? ` · ${summary.stale} com estado desatualizado (>2 h)` : ""}`,
    "",
    "Por unidade:",
    ...summary.byUnit.map(
      (u) => `- ${u.unit}: ${fmt(u.pctOk)}% OK (${u.counts.OK}/${u.counts.total}); ${u.counts.DOWN} em baixo, ${u.counts.DEGRADED} degradados, ${u.counts.UNKNOWN} por verificar`
    ),
  ];
  const down = systems.filter((s) => s.status === "DOWN");
  const degraded = systems.filter((s) => s.status === "DEGRADED");
  const unknown = systems.filter((s) => s.status === "UNKNOWN");
  if (down.length) lines.push("", "Em baixo:", ...down.map(problemLine));
  if (degraded.length) lines.push("", "Degradados:", ...degraded.map(problemLine));
  if (unknown.length) lines.push("", `Por verificar: ${unknown.map((s) => s.name).join(", ")}`);
  return lines.join("\n");
}

export default async function StatusReportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const systems = await loadSystems(prisma);
  const summary = summarize(systems);
  const order = (s: SystemView) => ({ DOWN: 0, DEGRADED: 1, UNKNOWN: 2, OK: 3 })[s.status];
  const notOk = systems.filter((s) => s.status !== "OK").sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
  const owners = new Map<string, number>();
  for (const s of notOk) owners.set(s.ownerName ?? "Sem responsável", (owners.get(s.ownerName ?? "Sem responsável") ?? 0) + 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/estado" className="text-sm text-brand-700 hover:underline">
          ← Estado dos sistemas
        </Link>
        <div className="flex gap-2">
          <CopyReportButton text={buildText(systems, summary)} />
          <PrintButton />
        </div>
      </div>

      <h1 className="text-xl font-semibold">Relatório de estado dos sistemas DANAD</h1>
      <p className="mb-4 text-sm text-gray-500">Gerado em {formatDate(summary.generatedAt)}</p>

      <StatusSummaryCards summary={summary} />

      <h2 className="mb-2 text-sm font-semibold text-gray-700">Por unidade</h2>
      <div className="mb-6 overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">% OK</th>
              <th className="px-3 py-2">OK</th>
              <th className="px-3 py-2">Degradado</th>
              <th className="px-3 py-2">Em baixo</th>
              <th className="px-3 py-2">Por verificar</th>
              <th className="w-40 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {summary.byUnit
              .sort((a, b) => UNIT_ORDER.indexOf(a.unit) - UNIT_ORDER.indexOf(b.unit))
              .map((u) => (
                <tr key={u.unit}>
                  <td className="px-3 py-2">{u.label}</td>
                  <td className="px-3 py-2 font-semibold">{fmt(u.pctOk)}%</td>
                  <td className="px-3 py-2">{u.counts.OK}</td>
                  <td className="px-3 py-2">{u.counts.DEGRADED}</td>
                  <td className="px-3 py-2">{u.counts.DOWN}</td>
                  <td className="px-3 py-2">{u.counts.UNKNOWN}</td>
                  <td className="px-3 py-2">
                    <StatusBar counts={u.counts} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-sm font-semibold text-gray-700">
        Sistemas que não estão OK ({notOk.length})
      </h2>
      {notOk.length === 0 ? (
        <p className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Todos os sistemas estão OK.
        </p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-md border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Sistema</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Componentes afetados</th>
                <th className="px-3 py-2">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notOk.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium">
                    {s.name}
                    {s.criticality === "HIGH" && (
                      <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-normal text-red-700">Crítico</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {s.components
                      .filter((c) => c.status !== "OK")
                      .map((c) => `${c.name} (${STATUS_LABELS[c.status].toLowerCase()}${c.note ? `: ${c.note}` : ""})`)
                      .join("; ")}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{s.ownerName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {owners.size > 0 && (
        <p className="text-sm text-gray-500">
          Por responsável: {[...owners.entries()].map(([name, n]) => `${name} (${n})`).join(" · ")}
        </p>
      )}
    </div>
  );
}
