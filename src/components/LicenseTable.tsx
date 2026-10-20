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
  // O utilizador pode aprovar este pedido (pendente e é o coordenador indicado, ou Admin).
  canDecide: boolean;
};

// Tabela de licenças. Permite escolher pedidos: aprovar vários de uma vez (os
// pendentes de que o utilizador é o coordenador) e, com `canDelete` (ADMIN),
// apagá-los (ex: pedidos de teste).
export default function LicenseTable({ rows, canDelete }: { rows: LicenseRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Quem só aprova escolhe apenas os pedidos que pode aprovar.
  const selectable = rows.filter((r) => canDelete || r.canDecide);
  const showSelect = selectable.length > 0;
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const toApprove = rows.filter((r) => selected.has(r.id) && r.canDecide);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function approveSelected() {
    const ids = toApprove.map((r) => r.id);
    if (!confirm(`Aprovar ${ids.length} pedido(s) de licença?`)) return;
    setApproving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/licenses/approve-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao aprovar pedidos");
      const failed: { name: string; error: string }[] = data.failed ?? [];
      setNotice(
        `${data.approved} aprovado(s)` +
          (failed.length ? `; ${failed.length} por aprovar: ${failed.map((f) => `${f.name} (${f.error})`).join("; ")}` : "")
      );
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setApproving(false);
    }
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
      {notice && <p className="mb-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
      {showSelect && selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-3 rounded-md border bg-gray-50 px-3 py-2 text-sm">
          <span>{selected.size} selecionado(s)</span>
          {toApprove.length > 0 && (
            <button
              onClick={approveSelected}
              disabled={approving || deleting}
              className="rounded-md bg-green-600 px-3 py-1 font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {approving ? "A aprovar..." : `Aprovar ${toApprove.length === selected.size ? "selecionados" : `${toApprove.length} aprováveis`}`}
            </button>
          )}
          {canDelete && (
            <button
              onClick={deleteSelected}
              disabled={deleting || approving}
              className="rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "A apagar..." : "Apagar selecionados"}
            </button>
          )}
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
              {showSelect && (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))}
                  />
                </th>
              )}
              <th className="px-4 py-2">Beneficiário</th>
              <th className="px-4 py-2">Licença</th>
              <th className="px-4 py-2">Unidade / Direção</th>
              <th className="px-4 py-2">Coordenador</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className={selected.has(r.id) ? "bg-brand-50" : "hover:bg-gray-50"}>
                {showSelect && (
                  <td className="px-3 py-2">
                    {(canDelete || r.canDecide) && (
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${r.beneficiaryName}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                    )}
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
