import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import { DOCUMENT_TYPE_LABELS, formatDate } from "@/lib/labels";
import { canApprove } from "@/lib/permissions";

type SearchParams = { scope?: string; status?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = params.scope ?? "all";
  const status = params.status;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (scope === "mine") where.uploadedById = session.user.id;
  if (scope === "assigned") where.approverId = session.user.id;

  const documents = await prisma.document.findMany({
    where,
    include: {
      uploadedBy: { select: { name: true, email: true } },
      approver: { select: { name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tabs = [
    { key: "all", label: "Todos" },
    { key: "mine", label: "Os meus" },
    ...(canApprove(session.user.role) ? [{ key: "assigned", label: "Para eu aprovar" }] : []),
  ];

  const statusFilters = [
    { key: undefined, label: "Todos os estados" },
    { key: "DRAFT", label: "Rascunho" },
    { key: "PENDING", label: "Pendente" },
    { key: "APPROVED", label: "Aprovado" },
    { key: "REJECTED", label: "Rejeitado" },
  ];

  function hrefFor(nextScope: string, nextStatus?: string) {
    const params = new URLSearchParams();
    if (nextScope !== "all") params.set("scope", nextScope);
    if (nextStatus) params.set("status", nextStatus);
    const qs = params.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documentos</h1>
        <Link
          href="/documents/new"
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Novo documento
        </Link>
      </div>

      <div className="mb-3 flex gap-2 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={hrefFor(tab.key, status)}
            className={`border-b-2 px-3 py-2 text-sm ${
              scope === tab.key ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.key ?? "all"}
            href={hrefFor(scope, f.key)}
            className={`rounded-full px-3 py-1 text-xs ${
              status === f.key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          Nenhum documento encontrado.
        </p>
      ) : (
        <ul className="divide-y rounded-md border bg-white">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{doc.title}</span>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    Por {doc.uploadedBy.name ?? doc.uploadedBy.email} · {formatDate(doc.createdAt)}
                    {doc.approver && <> · Aprovador: {doc.approver.name ?? doc.approver.email}</>}
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
