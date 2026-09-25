import { LICENSE_STATUS_LABELS } from "@/lib/labels";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  GRANTED: "bg-green-100 text-green-800",
  REVOKED: "bg-gray-100 text-gray-600",
};

export default function LicenseStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {LICENSE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
