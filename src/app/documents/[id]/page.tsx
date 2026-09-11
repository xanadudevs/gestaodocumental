import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import DecisionForm from "@/components/DecisionForm";
import SubmitForm from "@/components/SubmitForm";
import CommentForm from "@/components/CommentForm";
import { DOCUMENT_TYPE_LABELS, AUDIT_ACTION_LABELS, formatDate } from "@/lib/labels";
import { canDecideOn } from "@/lib/permissions";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!document) notFound();

  const isOwner = document.uploadedById === session.user.id;
  const canDecide = canDecideOn(session.user.role, document.approverId, session.user.id);

  const approvers =
    isOwner && (document.status === "DRAFT" || document.status === "REJECTED")
      ? await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "APPROVER"] } },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border bg-white p-5">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{document.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {DOCUMENT_TYPE_LABELS[document.type] ?? document.type} · Carregado por{" "}
              {document.uploadedBy.name ?? document.uploadedBy.email} em {formatDate(document.createdAt)}
            </p>
          </div>
          <DocumentStatusBadge status={document.status} />
        </div>

        {document.description && <p className="mb-3 text-sm text-gray-700">{document.description}</p>}

        {document.approver && (
          <p className="mb-1 text-sm text-gray-600">
            Aprovador: <span className="font-medium">{document.approver.name ?? document.approver.email}</span>
          </p>
        )}
        {document.decisionReason && (
          <p className="mb-1 text-sm text-gray-600">
            Motivo: <span className="italic">{document.decisionReason}</span>
          </p>
        )}

        <a
          href={`/api/documents/${document.id}/file`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Ver / descarregar ficheiro ({document.fileName})
        </a>
      </div>

      {document.status === "PENDING" && canDecide && <DecisionForm documentId={document.id} />}

      {(document.status === "DRAFT" || document.status === "REJECTED") && isOwner && (
        <SubmitForm documentId={document.id} approvers={approvers} />
      )}

      <div className="rounded-md border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Comentários</h2>
        <div className="mb-4 flex flex-col gap-3">
          {document.comments.length === 0 && <p className="text-sm text-gray-400">Sem comentários ainda.</p>}
          {document.comments.map((c) => (
            <div key={c.id} className="rounded-md bg-gray-50 p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium text-gray-700">{c.author.name ?? c.author.email}</span>
                <span>{formatDate(c.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
          ))}
        </div>
        <CommentForm documentId={document.id} />
      </div>

      <div className="rounded-md border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Histórico</h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-600">
          {document.auditLogs.map((log) => (
            <li key={log.id}>
              <span className="font-medium text-gray-800">{log.actor.name ?? log.actor.email}</span>{" "}
              {AUDIT_ACTION_LABELS[log.action] ?? log.action}
              {log.meta && <span className="italic"> — {log.meta}</span>}
              <span className="ml-2 text-xs text-gray-400">{formatDate(log.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
