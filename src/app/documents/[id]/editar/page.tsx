import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OutgoingForm from "@/components/OutgoingForm";
import { outgoingUnits } from "@/lib/outgoingPage";
import { DocumentActionType, availableActions } from "@/lib/documents";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const [doc, me] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, level: true } }),
  ]);
  if (!doc || !me) notFound();
  if (!availableActions(doc, me).includes(DocumentActionType.EDIT)) redirect(`/documents/${id}`);

  const { units } = await outgoingUnits(session.user.id);
  const initial = { ...((doc.formData ?? {}) as Record<string, unknown>), assunto: doc.title };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Editar {doc.reference}</h1>
      <p className="mb-5 text-sm text-gray-500">{doc.title}</p>
      <OutgoingForm
        kind={doc.type as "INFORMACAO" | "OFICIO"}
        units={units}
        defaultUnitId={doc.unitId ?? ""}
        initial={initial}
        documentId={doc.id}
      />
    </div>
  );
}
