import { Prisma, type PrismaClient } from "@prisma/client";
import { referenceUnitPart } from "@/lib/orgChart";

type Db = PrismaClient | Prisma.TransactionClient;

export function formatReference(seq: number, unitName: string, year: number) {
  return `${String(seq).padStart(2, "0")}/${referenceUnitPart(unitName)}/${year}`;
}

// Próxima referência da unidade no ano: 01/DANAD - UPACE/2026, 02/..., ...
// A numeração é por unidade e por ano, partilhada por todos os tipos de
// documento, para cada referência ser única.
export async function nextReference(db: Db, unit: { id: string; name: string }, date = new Date()) {
  const year = date.getFullYear();
  for (let attempt = 0; ; attempt++) {
    try {
      // O increment é atómico no Postgres; o upsert pode falhar (P2002) se
      // dois pedidos criarem o contador do ano ao mesmo tempo - repete-se.
      const counter = await db.documentCounter.upsert({
        where: { unitId_year: { unitId: unit.id, year } },
        create: { unitId: unit.id, year, last: 1 },
        update: { last: { increment: 1 } },
      });
      return formatReference(counter.last, unit.name, year);
    } catch (err) {
      if (attempt < 3 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
}
