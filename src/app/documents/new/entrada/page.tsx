import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EntryForm from "@/components/EntryForm";
import { ENTRY_TYPES, findDirector } from "@/lib/documents";
import { getPeople } from "@/lib/people";

export default async function NewEntryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [people, director] = await Promise.all([getPeople(), findDirector(prisma)]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Registar entrada</h1>
      <p className="mb-5 text-sm text-gray-500">
        A entrada recebe uma referência da DANAD (ex: 01/DANAD/2026) e fica na caixa de quem a recebe.
      </p>
      <EntryForm types={[...ENTRY_TYPES]} people={people} directorId={director?.id ?? null} />
    </div>
  );
}
