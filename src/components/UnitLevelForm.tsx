"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEVEL_ORDER } from "@/lib/enums";
import { LEVEL_LABELS } from "@/lib/labels";

type Unit = { id: string; name: string; depth: number };

export default function UnitLevelForm({
  userId,
  currentUnitId,
  currentLevel,
  units,
}: {
  userId: string;
  currentUnitId: string | null;
  currentLevel: string | null;
  units: Unit[];
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(currentUnitId ?? "");
  const [level, setLevel] = useState(currentLevel ?? "");
  const [saving, setSaving] = useState(false);

  async function save(nextUnitId: string, nextLevel: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: nextUnitId || null, level: nextLevel || null }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setUnitId(currentUnitId ?? "");
      setLevel(currentLevel ?? "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={unitId}
        disabled={saving}
        onChange={(e) => {
          setUnitId(e.target.value);
          save(e.target.value, level);
        }}
        className="w-64 rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-60"
      >
        <option value="">Sem unidade</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {"—".repeat(u.depth)} {u.name}
          </option>
        ))}
      </select>

      <select
        value={level}
        disabled={saving}
        onChange={(e) => {
          setLevel(e.target.value);
          save(unitId, e.target.value);
        }}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-60"
      >
        <option value="">Sem nível</option>
        {LEVEL_ORDER.map((lvl) => (
          <option key={lvl} value={lvl}>
            {LEVEL_LABELS[lvl]}
          </option>
        ))}
      </select>
    </div>
  );
}
