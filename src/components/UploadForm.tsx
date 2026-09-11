"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Approver = { id: string; name: string | null; email: string | null };

export default function UploadForm({ approvers }: { approvers: Approver[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar documento");
      router.push(`/documents/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Título</label>
        <input
          name="title"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Ex: Fatura Fornecedor X - Setembro"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tipo</label>
        <select name="type" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="INVOICE">Fatura</option>
          <option value="EMAIL">Email</option>
          <option value="CONTRACT">Contrato</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descrição (opcional)</label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ficheiro</label>
        <input
          type="file"
          name="file"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Submeter já para aprovação (opcional)</label>
        <select name="approverId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Guardar como rascunho</option>
          {approvers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? a.email}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "A carregar..." : "Carregar documento"}
      </button>
    </form>
  );
}
