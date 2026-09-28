"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LicenseStatusBadge from "@/components/LicenseStatusBadge";
import { LICENSE_TYPE_LABELS, formatDate } from "@/lib/labels";

export type LicenseRow = {
  id: string;
  beneficiaryName: string;
  beneficiaryEmail: string;
  product: string;
  licenseType: string;
  status: string;
  coordination: string;
  direction: string;
  coordinator: string;
  createdAt: string;
};

// Tabela de licenças. Com `canDelete` (ADMIN), permite escolher pedidos e
// apagá-los (ex: pedidos de teste).
export default function LicenseTable({ rows, canDelete }: { rows: LicenseRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (!confirm(`Apagar ${ids.length} pedido(s) de licença? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/licenses/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao apagar pedidos");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {canDelete && selected.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
          <span>{selected.size} selecionado(s)</span>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "A apagar..." : "Apagar selecionados"}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-gray-600 hover:underline">
            Cancelar
          </button>
          {error && <span className="text-red-700">{error}</span>}
        </div>
      )}
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {canDelete && (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                </th>
              )}
              <th className="px-4 py-2">Beneficiário</th>
              <th className="px-4 py-2">Licença</th>
              <th className="px-4 py-2">Coordenação / Direção</th>
              <th className="px-4 py-2">Coordenador</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "bg-red-50" : "hover:bg-gray-50"}>
                {canDelete && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${r.beneficiaryName}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-2">
                  <Link href={`/licencas/${r.id}`} className="font-medium text-brand-700 hover:underline">
                    {r.beneficiaryName}
                  </Link>
                  <p className="text-xs text-gray-500">{r.beneficiaryEmail}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  {r.product}{" "}
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${r.licenseType === "FULL" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"}`}
                  >
                    {LICENSE_TYPE_LABELS[r.licenseType] ?? r.licenseType}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <p>{r.coordination}</p>
                  {r.coordination !== r.direction && <p className="text-xs text-gray-500">{r.direction}</p>}
                </td>
                <td className="px-4 py-2 text-gray-600">{r.coordinator}</td>
                <td className="px-4 py-2">
                  <LicenseStatusBadge status={r.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
