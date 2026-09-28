"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/labels";

type Person = { id: string; label: string };
type EntryType = { type: string; origin: string };

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function EntryForm({
  types,
  people,
  directorId,
}: {
  types: EntryType[];
  people: Person[];
  directorId: string | null;
}) {
  const router = useRouter();
  const [type, setType] = useState(types[0]?.type ?? "");
  const [origin, setOrigin] = useState(types[0]?.origin ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("kind", "ENTRY");
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao registar entrada");
      router.push(`/documents/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4 rounded-md border bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Tipo</label>
          <select
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setOrigin(types.find((t) => t.type === e.target.value)?.origin ?? "");
            }}
            className={inputClass}
          >
            {types.map((t) => (
              <option key={t.type} value={t.type}>
                {DOCUMENT_TYPE_LABELS[t.type] ?? t.type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Origem</label>
          <input
            name="origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            list="origins"
            className={inputClass}
          />
          <datalist id="origins">
            <option value="Conselho de Administração" />
            <option value="Direção Financeira" />
          </datalist>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Assunto</label>
        <input name="title" required className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Referência externa (opcional)</label>
          <input name="externalRef" placeholder="Ex: n.º da fatura ou do ofício" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Data de entrada</label>
          <input name="receivedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Descrição (opcional)</label>
        <textarea name="description" rows={3} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Vai para</label>
        <select name="holderId" defaultValue={directorId ?? ""} required className={inputClass}>
          <option value="">Escolhe</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Normalmente o Diretor, que depois encaminha para as coordenações.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Ficheiros (fatura, email, ofício…)</label>
        <input name="files" type="file" multiple className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "A registar..." : "Registar entrada"}
      </button>
    </form>
  );
}
