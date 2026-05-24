import { ArrowLeft } from "lucide-react";
import { Link } from "@heroui/react";

export function BackToReportsLink() {
  return (
    <Link
      className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      href="/admin/reports"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to reports
    </Link>
  );
}
