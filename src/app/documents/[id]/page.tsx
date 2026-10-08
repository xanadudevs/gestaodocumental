import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import DecisionForm from "@/components/DecisionForm";
import SubmitForm from "@/components/SubmitForm";
import CommentForm from "@/components/CommentForm";
import DocumentActions from "@/components/DocumentActions";
import AttachmentUpload from "@/components/AttachmentUpload";
import { DOCUMENT_TYPE_LABELS, AUDIT_ACTION_LABELS, formatDate, formatDay, formatUserOrg } from "@/lib/labels";
import { canDecideOn } from "@/lib/permissions";
import { AuditAction, DocumentType, Level, Role } from "@/lib/enums";
import { DocumentActionType, availableActions, isLegacy, isOutgoing, levelRank, paragraphs } from "@/lib/documents";
import { hasTemplate } from "@/lib/docx";
import { getPeople } from "@/lib/people";
import { configuredCoordinator } from "@/lib/orgChart";

// Ações cujo texto é mostrado com destaque no circuito.
const TEXT_ACTIONS = new Set<string>([
  AuditAction.FORWARDED,
  AuditAction.OPINION,
  AuditAction.SUBMITTED,
  AuditAction.APPROVED,
  AuditAction.RETURNED,
  AuditAction.CLOSED,
  AuditAction.SENT,
]);

function Section({ title, text }: { title: string; text: unknown }) {
  const ps = paragraphs(text);
  if (ps.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-gray-700">{title}</h3>
      {ps.map((p, i) => (
        <p key={i} className="mb-1 text-sm text-gray-800">
          {p}
        </p>
      ))}
    </div>
  );
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      unit: { select: { name: true } },
      uploadedBy: { select: { id: true, name: true, email: true, level: true, unit: { select: { name: true } } } },
      holder: { select: { id: true, name: true, email: true, level: true, unit: { select: { name: true } } } },
      approver: { select: { id: true, name: true, email: true, level: true, unit: { select: { name: true } } } },
      attachments: { orderBy: { createdAt: "asc" } },
      comments: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      auditLogs: {
        include: {
          actor: { select: { id: true, name: true, email: true } },
          target: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!document) notFound();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, level: true, unitId: true },
  });
  if (!me) redirect("/login");

  const legacy = isLegacy(document);
  const outgoing = isOutgoing(document);
  const actions = availableActions(document, me);
  const people = actions.length > 0 ? (await getPeople()).filter((p) => p.id !== me.id) : [];

  // Sugestões de destinatário:
  // - para cima (submeter, ou parecer numa informação/ofício): o
  //   coordenador da unidade se eu estiver abaixo dele, senão o Diretor;
  // - parecer numa entrada: sobe para quem me encaminhou o documento.
  const defaults: Partial<Record<string, string>> = {};
  const coordName = document.unit ? configuredCoordinator(document.unit.name) : undefined;
  const coordinator = coordName ? people.find((p) => p.name.toLowerCase() === coordName.toLowerCase()) : undefined;
  const director = people.find((p) => p.level === Level.DIRECAO);
  const upward = (levelRank(me.level) < levelRank(Level.COORDENACAO) && coordinator) || director || coordinator;
  const DELEGATIONS: string[] = [AuditAction.FORWARDED, AuditAction.SUBMITTED, AuditAction.REGISTERED];
  const lastToMe = [...document.auditLogs]
    .reverse()
    .find((l) => l.targetId === me.id && l.actorId !== me.id && DELEGATIONS.includes(l.action));
  if (upward) defaults[DocumentActionType.SUBMIT] = upward.id;
  const opinionTo = outgoing ? upward?.id : lastToMe?.actorId;
  if (opinionTo) defaults[DocumentActionType.OPINION] = opinionTo;

  // Documentos antigos (sem circuito): mantém o fluxo de aprovação simples.
  const isOwner = document.uploadedById === session.user.id;
  const canDecideLegacy = legacy && canDecideOn(session.user.role, document.approverId, session.user.id);
  const legacyApprovers =
    legacy && isOwner && (document.status === "DRAFT" || document.status === "REJECTED")
      ? await prisma.user.findMany({
          where: { role: { in: [Role.ADMIN, Role.APPROVER] } },
          select: { id: true, name: true, email: true, level: true, unit: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : [];

  const f = (document.formData ?? {}) as Record<string, unknown>;
  const rows: [string, React.ReactNode][] = [
    ["Tipo", DOCUMENT_TYPE_LABELS[document.type] ?? document.type],
    ...(outgoing
      ? ([
          ["Emitido por", document.unit?.name ?? "—"],
          ["Para", document.destination ?? "—"],
        ] as [string, React.ReactNode][])
      : ([
          ["Origem", document.origin ?? "—"],
          ...(document.dueDate ? [["Prazo", formatDay(document.dueDate)] as [string, React.ReactNode]] : []),
          ...(document.receivedAt ? [["Data de entrada", formatDate(document.receivedAt)] as [string, React.ReactNode]] : []),
        ] as [string, React.ReactNode][])),
    ...(document.externalRef ? [["Referência externa", document.externalRef] as [string, React.ReactNode]] : []),
    [
      outgoing ? "Autor" : "Registado por",
      `${document.uploadedBy.name ?? document.uploadedBy.email}${formatUserOrg(document.uploadedBy) ? ` (${formatUserOrg(document.uploadedBy)})` : ""}`,
    ],
    ...(document.holder
      ? [
          [
            "Está com",
            <span key="h" className="font-medium">
              {document.holder.name ?? document.holder.email}
              {formatUserOrg(document.holder) && (
                <span className="font-normal text-gray-500"> ({formatUserOrg(document.holder)})</span>
              )}
            </span>,
          ] as [string, React.ReactNode],
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-brand-600">
        ← Documentos
      </Link>

      <div className="rounded-md border bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {document.reference && <p className="font-mono text-sm text-gray-500">{document.reference}</p>}
            <h1 className="text-xl font-semibold">{document.title}</h1>
          </div>
          <DocumentStatusBadge status={document.status} />
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-gray-500">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {document.aiSummary && (
          <div className="mt-3 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm">
            <p className="mb-1 text-xs font-medium uppercase text-gray-500">
              Resumo por IA{document.aiUrgency === "ALTA" ? " · urgência alta" : ""}
            </p>
            <p className="whitespace-pre-wrap text-gray-700">{document.aiSummary}</p>
            {document.aiTags.length > 0 && <p className="mt-1 text-xs text-gray-500">{document.aiTags.join(" · ")}</p>}
          </div>
        )}
        {document.description && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{document.description}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {hasTemplate(document.type) && (
            <a
              href={`/api/documents/${document.id}/docx`}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Descarregar Word
            </a>
          )}
          {document.filePath && (
            <a
              href={`/api/documents/${document.id}/file`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Ver ficheiro ({document.fileName})
            </a>
          )}
        </div>
      </div>

      {!legacy && <DocumentActions documentId={document.id} actions={actions} people={people} defaults={defaults} />}
      {legacy && document.status === "PENDING" && canDecideLegacy && <DecisionForm documentId={document.id} />}
      {legacy && (document.status === "DRAFT" || document.status === "REJECTED") && isOwner && (
        <SubmitForm documentId={document.id} approvers={legacyApprovers} />
      )}

      {outgoing && (
        <div className="flex flex-col gap-3 rounded-md border bg-white p-5">
          <h2 className="text-sm font-semibold">Conteúdo</h2>
          {document.type === DocumentType.INFORMACAO ? (
            <>
              <Section title="Enquadramento" text={f.enquadramento} />
              <Section title="Análise" text={f.analise} />
              <Section title="Conclusão" text={f.conclusao} />
              {typeof f.anexos === "string" && f.anexos && <Section title="Anexos" text={f.anexos} />}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                {[f.tratamento, f.destNome, f.destCargo, f.destInstituicao, f.destMorada, f.destCodigoPostal]
                  .filter((x) => typeof x === "string" && x)
                  .join(" · ")}
              </p>
              {typeof f.vossaRef === "string" && f.vossaRef && <p className="text-sm text-gray-600">V/ Refª: {f.vossaRef}</p>}
              <Section title={typeof f.saudacao === "string" ? f.saudacao : ""} text={f.corpo} />
              <p className="text-sm text-gray-600">
                {[f.fecho, f.signatarioCargo, f.signatarioNome].filter((x) => typeof x === "string" && x).join(" · ")}
              </p>
            </>
          )}
        </div>
      )}

      <div className="rounded-md border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Anexos</h2>
        {document.attachments.length === 0 ? (
          <p className="text-sm text-gray-400">Sem anexos.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {document.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/documents/${document.id}/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 hover:underline"
                >
                  {a.fileName}
                </a>
                <span className="ml-2 text-xs text-gray-400">
                  {Math.max(1, Math.round(a.fileSize / 1024))} KB · {formatDate(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!legacy &&
          (document.holderId === me.id || document.uploadedById === me.id || me.role === Role.ADMIN) && (
            <AttachmentUpload documentId={document.id} />
          )}
      </div>

      <div className="rounded-md border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Circuito</h2>
        <ol className="flex flex-col gap-3 text-sm text-gray-600">
          {document.auditLogs
            .filter((log) => log.action !== AuditAction.COMMENTED)
            .map((log) => (
              <li key={log.id} className="border-l-2 border-gray-200 pl-3">
                <span className="font-medium text-gray-800">{log.actor.name ?? log.actor.email}</span>{" "}
                {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                {log.target && log.action !== AuditAction.APPROVED && (
                  <>
                    {" "}
                    {log.action === AuditAction.OPINION ? "para" : "a"}{" "}
                    <span className="font-medium text-gray-800">{log.target.name ?? log.target.email}</span>
                  </>
                )}
                <span className="ml-2 text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                {log.meta &&
                  (TEXT_ACTIONS.has(log.action) ? (
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-2 text-gray-800">{log.meta}</p>
                  ) : (
                    <span className="italic"> — {log.meta}</span>
                  ))}
              </li>
            ))}
        </ol>
      </div>

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

    </div>
  );
}
