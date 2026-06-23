import { useI18n } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  value: number | undefined;
  onChange: (value: number) => void;
}

const NPS_LABELS: Record<string, { en: string; th: string }> = {
  "0": { en: "Not likely at all", th: "ไม่น่าจะเป็นไปได้เลย" },
  "10": { en: "Extremely likely", th: "น่าจะเป็นไปได้มากที่สุด" },
};

export function NpsGroup({ value, onChange }: Props) {
  const { lang } = useI18n();

  return (
    <div className="space-y-3">
      <RadioGroup
        value={value !== undefined ? String(value) : undefined}
        onValueChange={(v) => onChange(Number(v))}
        className="space-y-1"
      >
        <div className="flex items-end gap-0 w-full">
          {Array.from({ length: 11 }, (_, i) => {
            const n = i;
            const selected = value === n;
            return (
              <Label
                key={n}
                className={`flex flex-col items-center gap-1 flex-1 pt-2 pb-1.5 cursor-pointer transition-all duration-200 text-center border-t-2 ${
                  selected
                    ? "border-primary bg-primary-soft scale-[1.08] shadow-sm z-10 rounded-sm"
                    : "border-border hover:bg-muted/50 hover:border-primary/30"
                }`}
              >
                <RadioGroupItem value={String(n)} className="sr-only" />
                <span className={`text-xs font-semibold tabular-nums ${selected ? "text-primary" : "text-muted-foreground"}`}>
                  {n}
                </span>
              </Label>
            );
          })}
        </div>
      </RadioGroup>
      <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
        <span>{NPS_LABELS["0"][lang === "th" ? "th" : "en"]}</span>
        <span>{NPS_LABELS["10"][lang === "th" ? "th" : "en"]}</span>
      </div>
    </div>
  );
}
