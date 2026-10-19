// Pedido do token de acesso das páginas partilhadas (sem login).
export default function StatusTokenGate({ title, invalid }: { title: string; invalid: boolean }) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-xl font-semibold">{title}</h1>
      <p className="mb-4 text-sm text-gray-500">Indica o token de acesso para continuar.</p>
      <form method="get" className="flex gap-2">
        <input
          name="token"
          type="password"
          required
          autoFocus
          placeholder="Token"
          className="flex-1 rounded-md border px-3 py-2 text-base sm:text-sm"
        />
        <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Entrar
        </button>
      </form>
      {invalid && <p className="mt-2 text-sm text-red-600">Token inválido.</p>}
    </div>
  );
}
