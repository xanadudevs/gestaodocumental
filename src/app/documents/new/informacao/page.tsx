import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OutgoingForm from "@/components/OutgoingForm";
import { outgoingUnits } from "@/lib/outgoingPage";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { units, defaultUnitId, me } = await outgoingUnits(session.user.id);
  const unitName = units.find((u) => u.id === defaultUnitId)?.name ?? "";
  const initial = { signatarios: [{ unidade: unitName, nome: me?.name ?? "" }] };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Nova informação</h1>
      <p className="mb-5 text-sm text-gray-500">
        Fica em rascunho com a referência atribuída. Depois submetes para parecer e aprovação, e descarregas o Word
        com o template SPMS.
      </p>
      {units.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
          A estrutura organizacional ainda não foi criada.
        </p>
      ) : (
        <OutgoingForm kind="INFORMACAO" units={units} defaultUnitId={defaultUnitId} initial={initial} />
      )}
    </div>
  );
}
