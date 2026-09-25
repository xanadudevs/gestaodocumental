"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EditableUser = { id: string; name: string | null; email: string | null; username: string | null };

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function EditUserButton({ user }: { user: EditableUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao guardar");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-brand-700 hover:underline">
        Editar
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-md flex-col gap-3 whitespace-normal rounded-md bg-white p-5 text-left shadow-lg"
          >
            <h2 className="text-sm font-semibold">Editar utilizador</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <input name="name" required defaultValue={user.name ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input name="email" type="email" defaultValue={user.email ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Utilizador (para login)</label>
              <input
                name="username"
                defaultValue={user.username ?? ""}
                minLength={3}
                pattern="[a-zA-Z0-9._\-]+"
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nova password</label>
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="Deixa vazio para manter a atual"
                className={inputClass}
              />
            </div>
            <p className="text-xs text-gray-500">
              A pessoa entra com o utilizador ou o email e a password. Role, unidade e nível mudam-se na tabela.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? "A guardar..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
