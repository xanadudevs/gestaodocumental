import { promises as fs } from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { DocumentType } from "@/lib/enums";
import { paragraphs } from "@/lib/documents";
import { unitSigla } from "@/lib/orgChart";
import { LEVEL_LABELS } from "@/lib/labels";

// Templates Word da SPMS com marcadores (gerados por scripts/build-templates.py).
const TEMPLATES: Record<string, string> = {
  [DocumentType.INFORMACAO]: "informacao.docx",
  [DocumentType.OFICIO]: "oficio.docx",
};

export function hasTemplate(type: string) {
  return type in TEMPLATES;
}

type Person = { name: string | null; level: string | null } | null;
type LogEntry = { action: string; meta: string | null; createdAt: Date; actor: Person };

type DocForDocx = {
  type: string;
  reference: string | null;
  title: string;
  createdAt: Date;
  decidedAt: Date | null;
  formData: unknown;
  unit: { name: string } | null;
  uploadedBy: { name: string | null };
  auditLogs: LogEntry[];
};

function dateLong(d: Date) {
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
}

function dateShort(d: Date) {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function signed(log: LogEntry) {
  const who = log.actor?.name ?? "—";
  const level = log.actor?.level ? ` (${LEVEL_LABELS[log.actor.level] ?? log.actor.level})` : "";
  return `${log.meta ?? ""} — ${who}${level}, ${dateShort(log.createdAt)}`;
}

// Iniciais de um nome, ex: "Bruno Trigo" -> "BT".
function initials(name: string | null) {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function docxData(doc: DocForDocx) {
  const f = (doc.formData ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : "");
  if (doc.type === DocumentType.INFORMACAO) {
    const signatarios = Array.isArray(f.signatarios)
      ? (f.signatarios as { unidade?: string; nome?: string }[]).filter((x) => x.nome || x.unidade)
      : [];
    return {
      numero: doc.reference ?? "",
      data: dateLong(doc.decidedAt ?? doc.createdAt),
      assunto: doc.title,
      pareceres: doc.auditLogs.filter((l) => l.action === "OPINION" && l.meta).map(signed),
      despachos: doc.auditLogs.filter((l) => l.action === "APPROVED" && l.meta).map(signed),
      enquadramento: paragraphs(f.enquadramento),
      analise: paragraphs(f.analise),
      conclusao: paragraphs(f.conclusao),
      signatarios: signatarios.map((x) => ({ unidade: x.unidade ?? "", nome: x.nome ?? "" })),
      temAnexos: !!s("anexos").trim(),
      anexos: s("anexos"),
    };
  }
  return {
    tratamento: s("tratamento"),
    destNome: s("destNome"),
    destCargo: s("destCargo"),
    destInstituicao: s("destInstituicao"),
    destMorada: s("destMorada"),
    destCodigoPostal: s("destCodigoPostal"),
    nossaRef: doc.reference ?? "",
    vossaRef: s("vossaRef"),
    assunto: doc.title,
    saudacao: s("saudacao"),
    corpo: paragraphs(f.corpo),
    fecho: s("fecho"),
    signatarioCargo: s("signatarioCargo"),
    signatarioNome: s("signatarioNome"),
    unidadeSigla: doc.unit ? unitSigla(doc.unit.name) : "",
    autorSigla: s("autorSigla") || initials(doc.uploadedBy.name),
  };
}

export async function renderDocx(doc: DocForDocx) {
  const file = TEMPLATES[doc.type];
  if (!file) throw new Error("Este tipo de documento não tem template Word");
  const content = await fs.readFile(path.join(process.cwd(), "templates", file));
  const tpl = new Docxtemplater(new PizZip(content), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  tpl.render(docxData(doc));
  return tpl.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
