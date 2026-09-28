"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/labels";

const ROLES = ["USER", "APPROVER", "SUPPORT", "ADMIN"];

export default function RoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  async function handleChange(newRole: string) {
    setRole(newRole);
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao mudar a role");
      }
      router.refresh();
    } catch (err) {
      setRole(currentRole);
      alert(err instanceof Error ? err.message : "Erro ao mudar a role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={role}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-60"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r] ?? r}
        </option>
      ))}
    </select>
  );
}
