"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LICENSE_TYPE_LABELS, formatUserOrg } from "@/lib/labels";

type Product = { key: string; name: string; types: string[]; maxPerDirection: number; countedTypes: string[] };
type CoordinationOption = {
  id: string;
  label: string;
  depth: number;
  direction: { id: string; name: string } | null;
};
type Coordinator = {
  id: string;
  name: string | null;
  level: string | null;
  unit: { name: string } | null;
};

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function LicenseRequestForm({
  products,
  coordinations,
  coordinators,
  defaultCoordinator,
  usage,
  defaults,
  isLoggedIn,
}: {
  products: Product[];
  coordinations: CoordinationOption[];
  coordinators: Coordinator[];
  // coordenador de cada coordenação: unitId -> userId
  defaultCoordinator: Record<string, string>;
  // licenças ocupadas por `${directionId}:${product}`
  usage: Record<string, number>;
  defaults: { name: string; email: string };
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [productKey, setProductKey] = useState(products[0]?.key ?? "");
  const [licenseType, setLicenseType] = useState(products[0]?.types[0] ?? "");
  const [coordinationId, setCoordinationId] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const product = products.find((p) => p.key === productKey);
  const coordination = coordinations.find((c) => c.id === coordinationId);
  const direction = coordination?.direction ?? null;
  const used = direction && product ? usage[`${direction.id}:${product.key}`] ?? 0 : null;
  const full =
    !!product && used !== null && used >= product.maxPerDirection && product.countedTypes.includes(licenseType);
  const coordinator = coordinators.find((c) => c.id === coordinatorId);
  const isDefaultCoordinator = !!coordination && defaultCoordinator[coordination.id] === coordinatorId;

  function selectCoordination(id: string) {
    setCoordinationId(id);
    // O coordenador da coordenação escolhida aparece logo.
    setCoordinatorId(defaultCoordinator[id] ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao submeter pedido");
      if (isLoggedIn && body.id) {
        router.push(`/licencas/${body.id}`);
        router.refresh();
        return;
      }
      setSubmitted(coordinator?.name ?? "o coordenador");
      form.reset();
      setCoordinationId("");
      setCoordinatorId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl rounded-md border border-green-200 bg-green-50 p-5 text-sm text-green-900">
        <p className="font-semibold">Pedido submetido.</p>
        <p className="mt-1">
          Fica agora a aguardar a aprovação de <strong>{submitted}</strong>. Depois de aprovado, o Gestor de
          Licenças dá o acesso.
        </p>
        <button
          onClick={() => setSubmitted(null)}
          className="mt-3 rounded-md border border-green-700 px-3 py-1.5 font-medium text-green-800 hover:bg-green-100"
        >
          Fazer outro pedido
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {/* Campo-armadilha para bots (escondido de pessoas). */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Coordenação</legend>
        <div>
          <label className="mb-1 block text-sm font-medium">Coordenação</label>
          <select
            name="coordinationId"
            required
            value={coordinationId}
            onChange={(e) => selectCoordination(e.target.value)}
            className={inputClass}
          >
            <option value="">Escolhe a coordenação</option>
            {coordinations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.depth === 0 ? c.label : `↳ ${c.label}`}
              </option>
            ))}
          </select>
          {direction && product && (
            <p className={`mt-1 text-xs ${full ? "text-red-600" : "text-gray-500"}`}>
              {direction.name}: {used} de {product.maxPerDirection} licenças {product.name} ocupadas
              {full && " — limite atingido, é preciso libertar uma licença antes de pedir outra."}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Coordenador que aprova</label>
          <select
            name="coordinatorId"
            required
            value={coordinatorId}
            onChange={(e) => setCoordinatorId(e.target.value)}
            disabled={!coordination}
            className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">{coordination ? "Escolhe o coordenador" : "Escolhe primeiro a coordenação"}</option>
            {coordinators.map((c) => {
              const org = formatUserOrg(c);
              return (
                <option key={c.id} value={c.id}>
                  {c.name ?? "—"}
                  {org && ` — ${org}`}
                </option>
              );
            })}
          </select>
          {coordination && (
            <p className="mt-1 text-xs text-gray-500">
              {isDefaultCoordinator
                ? "Coordenador desta coordenação. Aprova o pedido nesta aplicação."
                : defaultCoordinator[coordination.id]
                  ? "Escolheste outro coordenador que não o desta coordenação."
                  : "Esta coordenação ainda não tem coordenador definido — escolhe quem aprova."}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Licença</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Software</label>
            <select
              name="product"
              value={productKey}
              onChange={(e) => {
                setProductKey(e.target.value);
                setLicenseType(products.find((p) => p.key === e.target.value)?.types[0] ?? "");
              }}
              className={inputClass}
            >
              {products.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de licença</label>
            <select
              name="licenseType"
              required
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className={inputClass}
            >
              {product?.types.map((t) => (
                <option key={t} value={t}>
                  {LICENSE_TYPE_LABELS[t] ?? t}
                  {t === "FULL" ? " (edição)" : t === "VIEW" ? " (só visualização)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Beneficiário</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome completo</label>
            <input name="beneficiaryName" required defaultValue={defaults.name} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email profissional</label>
            <input
              name="beneficiaryEmail"
              type="email"
              required
              defaultValue={defaults.email}
              placeholder="nome.apelido@spms.min-saude.pt"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Função (opcional)</label>
            <input name="jobTitle" placeholder="Ex: UX Designer" className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Superior hierárquico</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input name="superiorName" required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input name="superiorEmail" type="email" required className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Enquadramento</legend>
        <div>
          <label className="mb-1 block text-sm font-medium">Projeto / equipa (opcional)</label>
          <input name="project" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Justificação</label>
          <textarea
            name="justification"
            required
            rows={3}
            placeholder="Para que vai ser usada a licença"
            className={inputClass}
          />
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || full}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "A submeter..." : "Submeter pedido"}
      </button>
    </form>
  );
}
