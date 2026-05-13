import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { Question } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { NpsGroup } from "@/components/ui/nps-group";
import { MatrixTable } from "@/components/ui/matrix-table";

interface Props {
  question: Question;
  value: number | string | string[] | Record<string, string> | undefined;
  onChange: (value: number | string | string[] | Record<string, string>) => void;
}

export function QuestionRenderer({ question, value, onChange }: Props) {
  const { lang } = useI18n();

  const text = lang === "th" ? question.textTh : question.textEn;
  const desc = question.descEn
    ? lang === "th"
      ? question.descTh
      : question.descEn
    : undefined;

  const choices = question.choices ?? [];

  switch (question.type) {
    case "rating": {
      const min = question.minValue ?? 1;
      const max = question.maxValue ?? 5;
      const nums: number[] = [];
      for (let i = min; i <= max; i++) nums.push(i);
      return (
        <div className="space-y-3">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <RadioGroup
            value={String(value ?? "")}
            onValueChange={(v) => onChange(Number(v))}
            className="grid grid-cols-5 gap-2"
          >
            {nums.map((n) => {
              const labelKey = `scale.${n}` as `scale.${number}`;
              const selected = value === n;
              return (
                <Label
                  key={n}
                  className={`flex flex-col items-center gap-1.5 rounded-md border p-2.5 cursor-pointer transition-all duration-200 text-center ${
                    selected
                      ? "border-primary bg-primary-soft scale-[1.05] shadow-sm"
                      : "border-border hover:bg-muted/50 hover:scale-[1.02]"
                  }`}
                >
                  <RadioGroupItem value={String(n)} className="sr-only" />
                  <span className={`text-base font-semibold ${selected ? "text-primary" : ""}`}>{n}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground line-clamp-2 min-h-[2.2em]">
                    {labelKey}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
      );
    }

    case "single_select":
      return (
        <div className="space-y-2">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <RadioGroup
            value={String(value ?? "")}
            onValueChange={(v) => onChange(v)}
            className="space-y-2"
          >
            {choices.map((c) => (
              <Label
                key={c.value}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all duration-200 ${
                  value === c.value
                    ? "border-primary bg-primary-soft scale-[1.01]"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={c.value} />
                <span className="text-sm">{lang === "th" ? c.labelTh : c.labelEn}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      );

    case "multiple_select": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string) => {
        const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
        if (question.maxChoices && next.length > question.maxChoices) return;
        onChange(next);
      };
      return (
        <div className="space-y-2">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          {question.maxChoices && (
            <p className="text-xs text-muted-foreground">
              {lang === "th" ? `เลือกได้สูงสุด ${question.maxChoices} ข้อ` : `Select up to ${question.maxChoices}`}
            </p>
          )}
          <div className="space-y-2">
            {choices.map((c) => (
              <Label
                key={c.value}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all duration-200 ${
                  arr.includes(c.value)
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={arr.includes(c.value)}
                  onCheckedChange={() => toggle(c.value)}
                />
                <span className="text-sm">{lang === "th" ? c.labelTh : c.labelEn}</span>
              </Label>
            ))}
          </div>
        </div>
      );
    }

    case "open_text_short":
      return (
        <div className="space-y-1.5">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === "th" ? "พิมพ์คำตอบ..." : "Type your answer..."}
          />
        </div>
      );

    case "open_text_long":
      return (
        <div className="space-y-1.5">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <Textarea
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === "th" ? "พิมพ์คำตอบของคุณ..." : "Type your answer..."}
          />
        </div>
      );

    case "binary":
      return (
        <div className="space-y-2">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <div className="flex gap-4">
            {[
              { value: "yes", labelEn: "Yes", labelTh: "ใช่" },
              { value: "no", labelEn: "No", labelTh: "ไม่ใช่" },
            ].map((opt) => (
              <Label
                key={opt.value}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-md border cursor-pointer transition-all duration-200 ${
                  value === opt.value
                    ? "border-primary bg-primary-soft scale-[1.02]"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
                <span className="text-sm font-medium">{lang === "th" ? opt.labelTh : opt.labelEn}</span>
              </Label>
            ))}
          </div>
        </div>
      );

    case "nps":
      return (
        <div className="space-y-3">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <NpsGroup
            value={typeof value === "number" ? value : undefined}
            onChange={(v) => onChange(v)}
          />
        </div>
      );

    case "matrix": {
      const rows = (question.rows ?? []).map((r, i) => ({
        id: String(i),
        textEn: r,
        textTh: question.rowsTh?.[i] ?? r,
      }));
      const cols = question.columns ?? [];
      const rowValues: Record<string, string> = value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};
      return (
        <div className="space-y-3">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
          <MatrixTable
            rows={rows}
            columns={cols}
            values={rowValues}
            onChange={(rowId, colValue) => {
              onChange({ ...rowValues, [rowId]: colValue });
            }}
          />
        </div>
      );
    }

    default:
      return (
        <div className="space-y-1.5">
          <p className="text-sm md:text-base font-medium leading-snug">{text}</p>
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === "th" ? "พิมพ์คำตอบ..." : "Type your answer..."}
          />
        </div>
      );
  }
}
