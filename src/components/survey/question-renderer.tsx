import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { Question } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { NpsGroup } from "@/components/ui/nps-group";
import { MatrixTable } from "@/components/ui/matrix-table";
import { cn } from "@/lib/utils";
import { Star, Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  question: Question;
  value: number | string | string[] | Record<string, string> | undefined;
  onChange: (value: number | string | string[] | Record<string, string>) => void;
}

export function QuestionRenderer({ question, value, onChange }: Props) {
  const { lang, t } = useI18n();

  const desc = question.descEn
    ? lang === "th"
      ? question.descTh
      : question.descEn
    : undefined;

  const choices = question.choices ?? [];

  switch (question.type) {
    case "rating": {
      const min = question.minValue ?? 1;
      const max = question.maxValue ?? 6;
      const nums: number[] = [];
      for (let i = min; i <= max; i++) nums.push(i);
      
      return (
        <div className="space-y-4">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 leading-relaxed italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          
          <div className="w-full flex flex-col gap-4">
            <RadioGroup
              value={String(value ?? "")}
              onValueChange={(v) => onChange(Number(v))}
              className={cn(
                "w-full grid gap-2 sm:gap-3",
                max === 1 && "grid-cols-1",
                max === 2 && "grid-cols-2",
                max === 3 && "grid-cols-3",
                max === 4 && "grid-cols-2 sm:grid-cols-4",
                max === 5 && "grid-cols-5",
                max === 6 && "grid-cols-3 sm:grid-cols-6",
                max === 7 && "grid-cols-4 sm:grid-cols-7",
                max === 8 && "grid-cols-4 sm:grid-cols-8",
                max === 9 && "grid-cols-5 sm:grid-cols-9",
                max === 10 && "grid-cols-5 sm:grid-cols-10"
              )}
            >
              {nums.map((n) => {
                const labelKey = `scale.${n}` as any;
                const selected = value === n;
                return (
                  <Label
                    key={n}
                    className={cn(
                      "w-full flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 sm:p-4 cursor-pointer transition-all duration-300 text-center relative group min-h-[68px] sm:min-h-[78px]",
                      selected
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/10 scale-[1.02] z-10"
                        : "border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50 hover:shadow-sm"
                    )}
                  >
                    <RadioGroupItem value={String(n)} className="sr-only" />
                    <span className={cn(
                      "text-xl sm:text-2xl font-bold transition-all duration-300 tracking-tight",
                      selected ? "text-primary scale-105" : "text-slate-300 group-hover:text-slate-600"
                    )}>{n}</span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-wider leading-tight transition-colors duration-300 text-center break-words whitespace-pre-wrap line-clamp-2",
                      selected ? "text-primary/70" : "text-slate-400 group-hover:text-slate-500"
                    )}>
                      {t(labelKey) || n}
                    </span>
                    {selected && (
                      <div className="absolute top-1.5 right-1.5">
                        <Star className="w-3 h-3 text-primary fill-primary animate-in zoom-in duration-300" />
                      </div>
                    )}
                  </Label>
                );
              })}
            </RadioGroup>

            <div className="flex justify-between w-full px-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 italic">
              <span>{lang === "th" ? "น้อยที่สุด" : "Lowest"}</span>
              <span>{lang === "th" ? "มากที่สุด" : "Highest"}</span>
            </div>
          </div>
        </div>
      );
    }

    case "single_select":
      return (
        <div className="space-y-4">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          <RadioGroup
            value={String(value ?? "")}
            onValueChange={(v) => onChange(v)}
            className="grid gap-2.5"
          >
            {choices.map((c) => {
              const selected = value === c.value;
              return (
                <Label
                  key={c.value}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 relative group w-full min-w-0 overflow-hidden",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/5 translate-x-1"
                      : "border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50 hover:translate-x-0.5"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shadow-sm shrink-0",
                    selected ? "border-primary bg-primary" : "border-slate-200 group-hover:border-primary/40"
                  )}>
                    {selected && <Check className="w-3 h-3 text-white animate-in zoom-in duration-200" />}
                  </div>
                  <RadioGroupItem value={c.value} className="sr-only" />
                  <span className={cn(
                    "text-sm font-bold transition-all flex-1 min-w-0 break-words whitespace-pre-wrap",
                    selected ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
                  )}>
                    {lang === "th" ? c.labelTh : c.labelEn}
                  </span>
                </Label>
              );
            })}
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {desc && (
              <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic flex-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
                {desc}
              </div>
            )}
            {question.maxChoices && (
              <Badge variant="outline" className="h-6 text-[9px] font-bold uppercase tracking-wider border-primary/20 bg-primary/5 text-primary px-3 self-start sm:self-center">
                {lang === "th" ? `สูงสุด ${question.maxChoices}` : `Max ${question.maxChoices}`}
              </Badge>
            )}
          </div>
          
          <div className="grid gap-2.5">
            {choices.map((c) => {
              const selected = arr.includes(c.value);
              return (
                <Label
                  key={c.value}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group w-full min-w-0 overflow-hidden",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/5 translate-x-1"
                      : "border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50 hover:translate-x-0.5"
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggle(c.value)}
                    className="w-5 h-5 rounded-md border-2 border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all shadow-sm"
                  />
                  <span className={cn(
                    "text-sm font-bold transition-all flex-1 min-w-0 break-words whitespace-pre-wrap",
                    selected ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
                  )}>
                    {lang === "th" ? c.labelTh : c.labelEn}
                  </span>
                </Label>
              );
            })}
          </div>
        </div>
      );
    }

    case "open_text_short":
      return (
        <div className="space-y-3">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          <div className="relative group">
            <Input
              value={String(value ?? "")}
              onChange={(e) => onChange(e.target.value)}
              placeholder={lang === "th" ? "พิมพ์คำตอบ..." : "Enter response..."}
              className="h-11 px-5 rounded-xl border border-slate-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:text-slate-300 placeholder:font-medium shadow-sm"
            />
          </div>
        </div>
      );

    case "open_text_long":
      return (
        <div className="space-y-3">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          <Textarea
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === "th" ? "แบ่งปันความคิดเห็น..." : "Please share feedback..."}
            className="px-5 py-4 rounded-xl border border-slate-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold leading-relaxed placeholder:text-slate-300 placeholder:font-medium resize-none shadow-sm"
          />
        </div>
      );

    case "binary":
      return (
        <div className="space-y-4">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "yes", labelEn: "Yes", labelTh: "ใช่", color: "hover:border-emerald-500/30 hover:bg-emerald-50 hover:text-emerald-700", active: "border-emerald-500 bg-emerald-50 ring-emerald-500/10 text-emerald-700 shadow-md" },
              { value: "no", labelEn: "No", labelTh: "ไม่ใช่", color: "hover:border-rose-500/30 hover:bg-rose-50 hover:text-rose-700", active: "border-rose-500 bg-rose-50 ring-rose-500/10 text-rose-700 shadow-md" },
            ].map((opt) => {
              const selected = value === opt.value;
              return (
                <Label
                  key={opt.value}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 group relative overflow-hidden",
                    selected 
                      ? cn("ring-4 scale-[1.02] z-10 bg-white", opt.active) 
                      : cn("border-slate-100 bg-white", opt.color)
                  )}
                >
                  <RadioGroupItem value={opt.value} checked={selected} className="sr-only" />
                  <span className={cn(
                    "text-xl font-bold uppercase tracking-wider transition-all",
                    selected ? "scale-105" : "text-slate-300 group-hover:text-inherit"
                  )}>
                    {lang === "th" ? opt.labelTh : opt.labelEn}
                  </span>
                  {selected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    </div>
                  )}
                </Label>
              );
            })}
          </div>
        </div>
      );

    case "nps":
      return (
        <div className="space-y-4">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <NpsGroup
              value={typeof value === "number" ? value : undefined}
              onChange={(v) => onChange(v)}
            />
          </div>
        </div>
      );

    case "matrix": {
      const rows = (question.rows ?? []).map((r, i) => ({
        id: String(i),
        textEn: r.textEn,
        textTh: r.textTh,
      }));
      const cols = question.columns ?? [];
      const rowValues: Record<string, string> = value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};
      return (
        <div className="space-y-4">
          {desc && (
            <div className="flex gap-2 p-2 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-500 italic">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
              {desc}
            </div>
          )}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            <MatrixTable
              rows={rows}
              columns={cols}
              values={rowValues}
              onChange={(rowId, colValue) => {
                onChange({ ...rowValues, [rowId]: colValue });
              }}
            />
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="space-y-3">
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === "th" ? "พิมพ์คำตอบ..." : "Type answer..."}
            className="h-11 px-5 rounded-xl border border-slate-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold shadow-sm"
          />
        </div>
      );
  }
}
