"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEVEL_ORDER, Role } from "@/lib/enums";
import { LEVEL_LABELS, ROLE_LABELS } from "@/lib/labels";

type Unit = { id: string; name: string; depth: number };

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function CreateUserForm({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar utilizador");
      setCreated(`${data.name} criado. Entra com o utilizador "${data.username}"${data.email ? " ou o email" : ""}.`);
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Novo utilizador
        </button>
        {created && <p className="text-sm text-green-700">{created}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-4 rounded-md border bg-white p-4">
      <h2 className="text-sm font-semibold">Novo utilizador</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome</label>
          <input name="name" required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email profissional (opcional)</label>
          <input name="email" type="email" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Utilizador (para login)</label>
          <input
            name="username"
            required
            minLength={3}
            pattern="[a-zA-Z0-9._\-]+"
            placeholder="ex: nome.apelido"
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password inicial</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="mín. 8 caracteres"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">A pessoa pode mudá-la depois em &quot;A minha conta&quot;.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Role</label>
          <select name="role" defaultValue={Role.USER} className={inputClass}>
            {[Role.USER, Role.APPROVER, Role.SUPPORT, Role.ADMIN].map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nível</label>
          <select name="level" defaultValue="" className={inputClass}>
            <option value="">Sem nível</option>
            {LEVEL_ORDER.map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_LABELS[lvl]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Unidade / Direção</label>
          <select name="unitId" defaultValue="" className={inputClass}>
            <option value="">Sem unidade</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {"—".repeat(u.depth)} {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "A criar..." : "Criar utilizador"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
      {created && <p className="text-sm text-green-700">{created}</p>}
    </form>
  );
}
