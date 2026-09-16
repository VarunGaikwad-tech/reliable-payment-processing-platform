import { Badge } from "@/components/ui/badge";

const SUCCESS = ["completed", "success", "successful", "active", "settled"];
const PENDING = ["pending", "processing", "initiated", "in_progress"];
const FAILED = ["failed", "reversed", "cancelled", "canceled", "frozen", "closed", "blocked"];

function labelise(status: string) {
  return status.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status }: { status: string }) {
  const key = (status ?? "").toLowerCase();
  const variant = SUCCESS.includes(key)
    ? "success"
    : PENDING.includes(key)
      ? "warning"
      : FAILED.includes(key)
        ? "destructive"
        : "outline";

  return <Badge variant={variant}>{labelise(status || "Unknown")}</Badge>;
}
