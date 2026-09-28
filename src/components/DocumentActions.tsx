"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; label: string };
type Action = "FORWARD" | "OPINION" | "SUBMIT" | "APPROVE" | "RETURN" | "CLOSE" | "SEND" | "EDIT";

const CONFIG: Record<
  Exclude<Action, "EDIT">,
  { label: string; button: string; person?: "required" | "optional"; text?: "required" | "optional"; textLabel?: string; style: string }
> = {
  FORWARD: {
    label: "Encaminhar",
    button: "Encaminhar",
    person: "required",
    text: "optional",
    textLabel: "Despacho / instruções (opcional)",
    style: "bg-brand-600 hover:bg-brand-700 text-white",
  },
  OPINION: {
    label: "Dar parecer",
    button: "Enviar parecer",
    person: "optional",
    text: "required",
    textLabel: "Parecer",
    style: "bg-brand-600 hover:bg-brand-700 text-white",
  },
  SUBMIT: {
    label: "Submeter para apreciação",
    button: "Submeter",
    person: "required",
    text: "optional",
    textLabel: "Nota (opcional)",
    style: "bg-brand-600 hover:bg-brand-700 text-white",
  },
  APPROVE: {
    label: "Aprovar",
    button: "Aprovar",
    text: "optional",
    textLabel: "Despacho (opcional, aparece no Word)",
    style: "bg-green-600 hover:bg-green-700 text-white",
  },
  RETURN: {
    label: "Devolver ao autor",
    button: "Devolver",
    text: "required",
    textLabel: "O que é preciso corrigir",
    style: "bg-red-600 hover:bg-red-700 text-white",
  },
  CLOSE: {
    label: "Concluir",
    button: "Concluir",
    text: "optional",
    textLabel: "Nota de conclusão (opcional)",
    style: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  },
  SEND: {
    label: "Marcar como enviado",
    button: "Marcar como enviado",
    text: "optional",
    textLabel: "Como/quando foi enviado (opcional)",
    style: "bg-green-600 hover:bg-green-700 text-white",
  },
};

export default function DocumentActions({
  documentId,
  actions,
  people,
  defaults,
}: {
  documentId: string;
  actions: Action[];
  people: Person[];
  // pessoa sugerida por ação, ex: para quem volta o parecer
  defaults: Partial<Record<Action, string>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Exclude<Action, "EDIT"> | null>(null);
  const [toUserId, setToUserId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function choose(action: Exclude<Action, "EDIT">) {
    setOpen(action);
    setToUserId(defaults[action] ?? "");
    setText("");
    setError(null);
  }

  async function run() {
    if (!open) return;
    const cfg = CONFIG[open];
    if (cfg.person === "required" && !toUserId) return setError("Escolhe a pessoa.");
    if (cfg.text === "required" && !text.trim()) return setError(`Preenche: ${cfg.textLabel}.`);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: open, toUserId: toUserId || undefined, text: text.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao registar");
      setOpen(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (actions.length === 0) return null;
  const cfg = open ? CONFIG[open] : null;

  return (
    <div className="rounded-md border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">O que queres fazer?</h2>
      <div className="flex flex-wrap gap-2">
        {actions.includes("EDIT") && (
          <Link
            href={`/documents/${documentId}/editar`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
        )}
        {actions
          .filter((a): a is Exclude<Action, "EDIT"> => a !== "EDIT")
          .map((a) => (
            <button
              key={a}
              onClick={() => choose(a)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${open === a ? "ring-2 ring-brand-500 ring-offset-1" : ""} ${CONFIG[a].style}`}
            >
              {CONFIG[a].label}
            </button>
          ))}
      </div>

      {open && cfg && (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4">
          {cfg.person && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {open === "OPINION" ? "Enviar parecer para" : open === "SUBMIT" ? "Superior que vai apreciar" : "Encaminhar para"}
              </label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">{cfg.person === "optional" ? "Quem me enviou o documento" : "Escolhe"}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {cfg.text && (
            <div>
              <label className="mb-1 block text-sm font-medium">{cfg.textLabel}</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={run}
              disabled={submitting}
              className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${cfg.style}`}
            >
              {submitting ? "A registar..." : cfg.button}
            </button>
            <button onClick={() => setOpen(null)} className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
