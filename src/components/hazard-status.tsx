import { useTranslations } from "next-intl";
import { CircleCheck, CircleDot, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS = {
  received: { tone: "neutral", Icon: CircleDot },
  in_progress: { tone: "warning", Icon: Clock },
  fixed: { tone: "success", Icon: CircleCheck },
  dismissed: { tone: "neutral", Icon: XCircle },
} as const;

/** Status as icon + word (never colour alone). */
export function HazardStatusBadge({ status }: { status: keyof typeof STATUS }) {
  const t = useTranslations("report.status");
  const { tone, Icon } = STATUS[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" className="size-4" />
      {t(status)}
    </Badge>
  );
}
