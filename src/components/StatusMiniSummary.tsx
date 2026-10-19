import { STATUS_LABELS, STATUS_STYLES, type StatusSummary } from "@/lib/status";
import { StatusBar } from "@/components/StatusSummaryCards";

const ORDER = ["OK", "DEGRADED", "DOWN", "UNKNOWN"] as const;

// Resumo em linha para a página de submissão: dá a quem atualiza uma ideia
// do ponto da situação sem o relatório completo.
export default function StatusMiniSummary({ summary }: { summary: StatusSummary }) {
  const { systems } = summary;
  return (
    <div className="mb-4 rounded-md border bg-white p-3">
      <p className="text-sm">
        <span className="text-xl font-semibold">{summary.pctOk.toLocaleString("pt-PT")}%</span>{" "}
        <span className="text-gray-500">
          dos sistemas OK ({systems.OK} de {systems.total})
        </span>
      </p>
      <div className="mt-2">
        <StatusBar counts={systems} />
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].dot}`} />
            {STATUS_LABELS[s]}: {systems[s]}
          </span>
        ))}
      </p>
    </div>
  );
}
