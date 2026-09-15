"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatUserOrg } from "@/lib/labels";

type Approver = {
  id: string;
  name: string | null;
  email: string | null;
  level?: string | null;
  unit?: { name: string } | null;
};

export default function SubmitForm({ documentId, approvers }: { documentId: string; approvers: Approver[] }) {
  const router = useRouter();
  const [approverId, setApproverId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!approverId) {
      setError("Escolhe um aprovador.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao submeter");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold">Submeter para aprovação</h2>
      <select
        value={approverId}
        onChange={(e) => setApproverId(e.target.value)}
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Escolhe um aprovador</option>
        {approvers.map((a) => {
          const org = formatUserOrg({ unit: a.unit, level: a.level });
          return (
            <option key={a.id} value={a.id}>
              {a.name ?? a.email}
              {org && ` — ${org}`}
            </option>
          );
        })}
      </select>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "A submeter..." : "Submeter"}
      </button>
    </div>
  );
}
