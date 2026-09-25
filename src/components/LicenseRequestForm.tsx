"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LICENSE_TYPE_LABELS, formatUserOrg } from "@/lib/labels";

type Product = { key: string; name: string; types: string[]; maxPerDirection: number; countedTypes: string[] };
type CoordinationOption = {
  id: string;
  name: string;
  depth: number;
  direction: { id: string; name: string } | null;
};
type Coordinator = {
  id: string;
  name: string | null;
  email: string | null;
  level: string | null;
  unitId: string | null;
  unit: { name: string } | null;
};

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function LicenseRequestForm({
  products,
  coordinations,
  coordinators,
  usage,
  defaults,
}: {
  products: Product[];
  coordinations: CoordinationOption[];
  coordinators: Coordinator[];
  // licenças ocupadas por `${directionId}:${product}`
  usage: Record<string, number>;
  defaults: { name: string; email: string };
}) {
  const router = useRouter();
  const [productKey, setProductKey] = useState(products[0]?.key ?? "");
  const [licenseType, setLicenseType] = useState(products[0]?.types[0] ?? "");
  const [coordinationId, setCoordinationId] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const product = products.find((p) => p.key === productKey);
  const coordination = coordinations.find((c) => c.id === coordinationId);
  const direction = coordination?.direction ?? null;
  const used = direction && product ? usage[`${direction.id}:${product.key}`] ?? 0 : null;
  const full =
    !!product && used !== null && used >= product.maxPerDirection && product.countedTypes.includes(licenseType);

  // Sugere primeiro os coordenadores da coordenação / direção escolhida.
  const suggested = useMemo(() => {
    if (!coordination) return [];
    return coordinators.filter(
      (c) => c.unitId === coordination.id || (direction && c.unitId === direction.id)
    );
  }, [coordinators, coordination, direction]);
  const others = coordinators.filter((c) => !suggested.includes(c));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao submeter pedido");
      router.push(`/licencas/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  function renderCoordinator(c: Coordinator) {
    const org = formatUserOrg(c);
    return (
      <option key={c.id} value={c.id}>
        {c.name ?? c.email}
        {org && ` — ${org}`}
      </option>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
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
        <legend className="px-1 text-sm font-semibold">Hierarquia</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Superior hierárquico</label>
            <input name="superiorName" required placeholder="Nome" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email do superior</label>
            <input name="superiorEmail" type="email" required className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Coordenação</label>
            <select
              name="coordinationId"
              required
              value={coordinationId}
              onChange={(e) => {
                setCoordinationId(e.target.value);
                setCoordinatorId("");
              }}
              className={inputClass}
            >
              <option value="">Escolhe a coordenação / unidade</option>
              {coordinations.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.direction}>
                  {"— ".repeat(Math.max(0, c.depth - 2))}
                  {c.name}
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Coordenador que aprova</label>
            <select
              name="coordinatorId"
              required
              value={coordinatorId}
              onChange={(e) => setCoordinatorId(e.target.value)}
              className={inputClass}
            >
              <option value="">Escolhe o coordenador</option>
              {suggested.length > 0 && (
                <optgroup label="Da coordenação / direção escolhida">{suggested.map(renderCoordinator)}</optgroup>
              )}
              {others.length > 0 && (
                <optgroup label={suggested.length > 0 ? "Outros" : "Coordenadores"}>
                  {others.map(renderCoordinator)}
                </optgroup>
              )}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Recebe um email e aprova o pedido nesta aplicação.
            </p>
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
