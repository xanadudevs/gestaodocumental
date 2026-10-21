"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/labels";

type Person = { id: string; label: string };
type EntryType = { type: string; origin: string };

type Analysis = {
  type: string;
  origin: string;
  title: string;
  externalRef: string;
  receivedAt: string;
  dueDate: string;
  description: string;
  summary: string;
  urgency: "BAIXA" | "NORMAL" | "ALTA";
  suggestedUnit: string;
  tags: string[];
};

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
  const [analyzing, setAnalyzing] = useState(false);
  const [ai, setAi] = useState<Analysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function analyze(form: HTMLFormElement) {
    setAiError(null);
    const files = (form.elements.namedItem("files") as HTMLInputElement).files;
    if (!files || files.length === 0) {
      setAiError("Escolhe primeiro os ficheiros.");
      return;
    }
    const body = new FormData();
    Array.from(files).forEach((f) => body.append("files", f));
    setAnalyzing(true);
    try {
      const res = await fetch("/api/documents/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na análise");
      const a = data as Analysis;
      const set = (name: string, value: string) => {
        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el && value) el.value = value;
      };
      if (types.some((t) => t.type === a.type)) setType(a.type);
      if (a.origin) setOrigin(a.origin);
      set("title", a.title);
      set("externalRef", a.externalRef);
      set("description", a.description);
      if (/^\d{4}-\d{2}-\d{2}$/.test(a.receivedAt)) set("receivedAt", a.receivedAt);
      if (/^\d{4}-\d{2}-\d{2}$/.test(a.dueDate)) set("dueDate", a.dueDate);
      setAi(a);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setAnalyzing(false);
    }
  }

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
        <label className="mb-1 block text-sm font-medium">Prazo (opcional)</label>
        <input name="dueDate" type="date" className={inputClass} />
        <p className="mt-1 text-xs text-gray-500">Se houver prazo, o documento aparece destacado quando estiver a terminar.</p>
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
        <button
          type="button"
          disabled={analyzing}
          onClick={(e) => analyze(e.currentTarget.form!)}
          className="mt-2 rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {analyzing ? "A analisar..." : "✨ Analisar com IA e preencher"}
        </button>
        {aiError && <p className="mt-1 text-sm text-red-600">{aiError}</p>}
        {ai && (
          <div className="mt-2 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm">
            <p className="font-medium">
              Campos preenchidos pela IA — confirma antes de registar.
              {ai.urgency === "ALTA" && <span className="ml-2 text-red-600">Urgência alta</span>}
            </p>
            <p className="mt-1 text-gray-700">{ai.summary}</p>
            {ai.suggestedUnit && <p className="mt-1 text-gray-600">Sugestão de encaminhamento: {ai.suggestedUnit}</p>}
            <input type="hidden" name="aiSummary" value={ai.summary} />
            <input type="hidden" name="aiUrgency" value={ai.urgency} />
            <input type="hidden" name="aiTags" value={ai.tags.join(",")} />
          </div>
        )}
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
