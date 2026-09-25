"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setRole(currentRole);
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
          {r}
        </option>
      ))}
    </select>
  );
}
