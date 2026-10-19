import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]?.badge ?? STATUS_STYLES.UNKNOWN.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status]?.dot ?? STATUS_STYLES.UNKNOWN.dot}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
