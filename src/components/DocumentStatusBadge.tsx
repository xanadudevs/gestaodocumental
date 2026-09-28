import { DOCUMENT_STATUS_LABELS } from "@/lib/labels";

const STYLES: Record<string, string> = {
  RECEIVED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  CLOSED: "bg-gray-100 text-gray-600",
  DRAFT: "bg-gray-100 text-gray-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  RETURNED: "bg-red-100 text-red-800",
  APPROVED: "bg-green-100 text-green-800",
  SENT: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {DOCUMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
