import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import { DOCUMENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { DocumentFlow, DocumentStatus } from "@/lib/enums";

type SearchParams = { scope?: string; type?: string; q?: string };

const CLOSED_STATUSES: string[] = [DocumentStatus.CLOSED, DocumentStatus.SENT, DocumentStatus.REJECTED];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "inbox";
  const { type } = params;
  const q = params.q?.trim();

  const where: Prisma.DocumentWhereInput = {};
  if (scope === "inbox") {
    where.OR = [
      { holderId: session.user.id, status: { notIn: CLOSED_STATUSES } },
      // documentos antigos: aprovador atribuído e ainda pendente
      { reference: null, approverId: session.user.id, status: "PENDING" },
    ];
  }
  if (scope === "in") where.flow = DocumentFlow.IN;
  if (scope === "out") where.flow = DocumentFlow.OUT;
  if (scope === "mine") where.uploadedById = session.user.id;
  if (type) where.type = type;
  if (q) {
    where.AND = [
      {
        OR: [
          { reference: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { origin: { contains: q, mode: "insensitive" } },
          { destination: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [documents, inboxCount] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        uploadedBy: { select: { name: true, email: true } },
        holder: { select: { name: true, email: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.document.count({ where: { holderId: session.user.id, status: { notIn: CLOSED_STATUSES } } }),
  ]);

  const tabs = [
    { key: "inbox", label: `Na minha caixa${inboxCount ? ` (${inboxCount})` : ""}` },
    { key: "in", label: "Entradas" },
    { key: "out", label: "Saídas" },
    { key: "mine", label: "Criados por mim" },
    { key: "all", label: "Todos" },
  ];
  const typeFilters =
    scope === "out"
      ? ["INFORMACAO", "OFICIO"]
      : scope === "in"
        ? ["INVOICE", "EMAIL", "OFICIO_IN", "EXTERNAL", "OTHER"]
        : ["INVOICE", "EMAIL", "OFICIO_IN", "EXTERNAL", "INFORMACAO", "OFICIO"];

  function hrefFor(next: Partial<SearchParams>) {
    const merged = { scope, type, q, ...next };
    const qs = new URLSearchParams();
    if (merged.scope && merged.scope !== "inbox") qs.set("scope", merged.scope);
    if (merged.type) qs.set("type", merged.type);
    if (merged.q) qs.set("q", merged.q);
    const s = qs.toString();
    return `/dashboard${s ? `?${s}` : ""}`;
  }

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Documentos</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/documents/new/entrada"
            className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            + Registar entrada
          </Link>
          <Link
            href="/documents/new/informacao"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Informação
          </Link>
          <Link
            href="/documents/new/oficio"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Ofício
          </Link>
        </div>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={hrefFor({ scope: tab.key, type: undefined })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              scope === tab.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={hrefFor({ type: undefined })} className={chip(!type)}>
          Todos os tipos
        </Link>
        {typeFilters.map((t) => (
          <Link key={t} href={hrefFor({ type: t })} className={chip(type === t)}>
            {DOCUMENT_TYPE_LABELS[t]}
          </Link>
        ))}
        <form action="/dashboard" className="ml-auto">
          {scope !== "inbox" && <input type="hidden" name="scope" value={scope} />}
          {type && <input type="hidden" name="type" value={type} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Procurar referência ou assunto"
            className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </form>
      </div>

      {documents.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          {scope === "inbox" ? "Não tens documentos à tua espera." : "Nenhum documento encontrado."}
        </p>
      ) : (
        <ul className="divide-y rounded-md border bg-white">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.reference && (
                      <span className="shrink-0 font-mono text-xs text-gray-500">{doc.reference}</span>
                    )}
                    <span className="truncate font-medium">{doc.title}</span>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {doc.flow === DocumentFlow.OUT
                      ? `Para ${doc.destination ?? "—"}`
                      : `De ${doc.origin ?? doc.uploadedBy.name ?? doc.uploadedBy.email}`}
                    {" · "}
                    {formatDate(doc.updatedAt)}
                    {doc.holder && <> · Com: {doc.holder.name ?? doc.holder.email}</>}
                    {doc._count.attachments > 0 && <> · {doc._count.attachments} anexo(s)</>}
                    {doc._count.comments > 0 && <> · {doc._count.comments} comentário(s)</>}
                  </p>
                </div>
                <DocumentStatusBadge status={doc.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
