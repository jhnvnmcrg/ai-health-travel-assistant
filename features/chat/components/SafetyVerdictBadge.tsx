import { Badge, BadgeText } from "@/components/ui/badge";

type Props = {
  verdict: "Safe" | "Caution" | "High Risk";
};

export function SafetyVerdictBadge({ verdict }: Props) {
  const action =
    verdict === "Safe"
      ? "success"
      : verdict === "Caution"
        ? "warning"
        : "error";

  return (
    <Badge action={action} size="md" className="mb-3 self-start">
      <BadgeText>{verdict}</BadgeText>
    </Badge>
  );
}
