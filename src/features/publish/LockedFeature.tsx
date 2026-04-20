import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LockedFeature({
  title,
  description,
  ctaLabel = "사이트 만들기",
  onCta,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  onCta: () => void;
}) {
  return (
    <Card className="p-8 flex flex-col items-center text-center gap-4 border-dashed">
      <div className="p-3 rounded-full bg-muted">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      </div>
      <Button onClick={onCta} className="rounded-full">{ctaLabel}</Button>
    </Card>
  );
}
