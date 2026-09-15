import { prisma } from "@/lib/prisma";

export type FlatUnit = { id: string; name: string; depth: number };

export async function getFlatUnits(): Promise<FlatUnit[]> {
  const units = await prisma.unit.findMany({
    select: { id: true, name: true, parentId: true, order: true },
    orderBy: { order: "asc" },
  });

  const byParent = new Map<string | null, typeof units>();
  for (const unit of units) {
    const key = unit.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(unit);
  }

  const result: FlatUnit[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    for (const unit of children) {
      result.push({ id: unit.id, name: unit.name, depth });
      walk(unit.id, depth + 1);
    }
  }
  walk(null, 0);

  return result;
}
