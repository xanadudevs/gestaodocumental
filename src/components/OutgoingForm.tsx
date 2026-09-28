"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Unit = { id: string; label: string; name: string };
type Signatario = { unidade: string; nome: string };
type Data = Record<string, unknown>;

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
const PARAGRAPH_HINT = "Um parágrafo por linha.";

function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

// Formulário da Informação e do Ofício (criar e editar). Os campos seguem os
// templates Word da SPMS.
export default function OutgoingForm({
  kind,
  units,
  defaultUnitId,
  initial,
  documentId,
}: {
  kind: "INFORMACAO" | "OFICIO";
  units: Unit[];
  defaultUnitId: string;
  initial: Data;
  documentId?: string;
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(defaultUnitId);
  const [signatarios, setSignatarios] = useState<Signatario[]>(
    Array.isArray(initial.signatarios) && initial.signatarios.length > 0
      ? (initial.signatarios as Signatario[])
      : [{ unidade: "", nome: "" }]
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const v = (k: string) => (typeof initial[k] === "string" ? (initial[k] as string) : "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const data: Data = {};
    for (const [k, val] of form.entries()) if (typeof val === "string" && k !== "unitId") data[k] = val;
    if (kind === "INFORMACAO") data.signatarios = signatarios.filter((s) => s.nome.trim() || s.unidade.trim());

    try {
      let res: Response;
      if (documentId) {
        res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
      } else {
        const body = new FormData();
        body.set("kind", kind);
        body.set("unitId", unitId);
        body.set("data", JSON.stringify(data));
        for (const f of form.getAll("files")) if (f instanceof File && f.size > 0) body.append("files", f);
        res = await fetch("/api/documents", { method: "POST", body });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao guardar");
      router.push(`/documents/${documentId ?? json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  const unitSelect = (
    <Field label="Unidade que emite" hint={documentId ? "Não se muda depois de criado (define a referência)." : "Define a referência, ex: 01/DANAD - UPACE/2026."}>
      <select
        name="unitId"
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        disabled={!!documentId}
        className={`${inputClass} disabled:bg-gray-50`}
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-5">
      {kind === "INFORMACAO" ? (
        <>
          <fieldset className="grid gap-4 rounded-md border bg-white p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Identificação</legend>
            {unitSelect}
            <Field label="Destinatário">
              <input
                name="destinatario"
                required
                list="destinatarios"
                defaultValue={v("destinatario") || "Conselho de Administração"}
                className={inputClass}
              />
              <datalist id="destinatarios">
                <option value="Conselho de Administração" />
                <option value="Direção Financeira" />
                <option value="Direção de Recursos Humanos" />
                <option value="Direção de Sistemas dos Cuidados de Saúde" />
                <option value="Direção de Infraestruturas, Redes e Suporte" />
              </datalist>
            </Field>
            <Field label="Assunto" wide>
              <input name="assunto" required defaultValue={v("assunto")} className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
            <legend className="px-1 text-sm font-semibold">Conteúdo</legend>
            <Field label="Enquadramento" hint={PARAGRAPH_HINT}>
              <textarea name="enquadramento" rows={4} defaultValue={v("enquadramento")} className={inputClass} />
            </Field>
            <Field label="Análise" hint={PARAGRAPH_HINT}>
              <textarea name="analise" rows={6} defaultValue={v("analise")} className={inputClass} />
            </Field>
            <Field label="Conclusão / proposta" hint={PARAGRAPH_HINT}>
              <textarea
                name="conclusao"
                rows={4}
                defaultValue={v("conclusao") || "Pelo que antecede, propõe-se ao Conselho de Administração da SPMS, o seguinte:"}
                className={inputClass}
              />
            </Field>
            <Field label="Anexos (descrição, opcional)">
              <input name="anexos" defaultValue={v("anexos")} placeholder="Ex: Anexo I – Mapa de datas" className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-md border bg-white p-4">
            <legend className="px-1 text-sm font-semibold">Assinaturas</legend>
            {signatarios.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={s.unidade}
                  onChange={(e) => setSignatarios(signatarios.map((x, j) => (j === i ? { ...x, unidade: e.target.value } : x)))}
                  placeholder="Direção / unidade"
                  className={inputClass}
                />
                <input
                  value={s.nome}
                  onChange={(e) => setSignatarios(signatarios.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                  placeholder="Nome"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setSignatarios(signatarios.filter((_, j) => j !== i))}
                  disabled={signatarios.length === 1}
                  className="rounded-md border px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSignatarios([...signatarios, { unidade: "", nome: "" }])}
              className="self-start text-sm text-brand-700 hover:underline"
            >
              + Assinatura
            </button>
          </fieldset>
        </>
      ) : (
        <>
          <fieldset className="grid gap-4 rounded-md border bg-white p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Destinatário</legend>
            <Field label="Tratamento">
              <input name="tratamento" list="tratamentos" defaultValue={v("tratamento") || "Exmo. Senhor"} className={inputClass} />
              <datalist id="tratamentos">
                <option value="Exmo. Senhor" />
                <option value="Exma. Senhora" />
                <option value="Exmos. Senhores" />
              </datalist>
            </Field>
            <Field label="Nome (com título)">
              <input name="destNome" required defaultValue={v("destNome")} placeholder="Ex: Dr. João Silva" className={inputClass} />
            </Field>
            <Field label="Cargo">
              <input name="destCargo" defaultValue={v("destCargo")} className={inputClass} />
            </Field>
            <Field label="Instituição">
              <input name="destInstituicao" defaultValue={v("destInstituicao")} className={inputClass} />
            </Field>
            <Field label="Morada">
              <input name="destMorada" defaultValue={v("destMorada")} className={inputClass} />
            </Field>
            <Field label="Código postal e localidade">
              <input name="destCodigoPostal" defaultValue={v("destCodigoPostal")} className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="grid gap-4 rounded-md border bg-white p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold">Identificação</legend>
            {unitSelect}
            <Field label="V/ Refª (opcional)">
              <input name="vossaRef" defaultValue={v("vossaRef")} className={inputClass} />
            </Field>
            <Field label="Assunto" wide>
              <input name="assunto" required defaultValue={v("assunto")} className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-md border bg-white p-4">
            <legend className="px-1 text-sm font-semibold">Texto</legend>
            <Field label="Saudação">
              <input name="saudacao" defaultValue={v("saudacao") || "Exmo. Senhor,"} className={inputClass} />
            </Field>
            <Field label="Corpo do ofício" hint={PARAGRAPH_HINT}>
              <textarea name="corpo" required rows={8} defaultValue={v("corpo")} className={inputClass} />
            </Field>
            <Field label="Fecho">
              <input name="fecho" defaultValue={v("fecho") || "Com os melhores cumprimentos,"} className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="grid gap-4 rounded-md border bg-white p-4 sm:grid-cols-3">
            <legend className="px-1 text-sm font-semibold">Assinatura</legend>
            <Field label="Cargo de quem assina">
              <input name="signatarioCargo" defaultValue={v("signatarioCargo") || "O Diretor"} className={inputClass} />
            </Field>
            <Field label="Nome de quem assina">
              <input name="signatarioNome" defaultValue={v("signatarioNome")} className={inputClass} />
            </Field>
            <Field label="Sigla de quem faz o ofício" hint="Rodapé, ex: DANAD UIA | BT">
              <input name="autorSigla" defaultValue={v("autorSigla")} className={inputClass} />
            </Field>
          </fieldset>
        </>
      )}

      {!documentId && (
        <fieldset className="rounded-md border bg-white p-4">
          <legend className="px-1 text-sm font-semibold">Anexos (opcional)</legend>
          <input name="files" type="file" multiple className={inputClass} />
        </fieldset>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "A guardar..." : documentId ? "Guardar alterações" : "Criar rascunho"}
      </button>
    </form>
  );
}
