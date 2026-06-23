import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { getQuestionBank } from "@/services/api";
import type { SurveySection, Question } from "@/services/api";
import {
  getSssMappings,
  upsertSssMapping,
  deleteSssMapping,
  toggleSssMapping,
  updateSssMappingWeight,
  recalculateSssAll,
} from "@/services/api/sss";
import type { SssQuestionMapping, SssDimension } from "@/lib/sss-config";
import { SSS_DIMENSION_META, scoreToGrade } from "@/lib/sss-config";
import { getSssAggregateForSurvey } from "@/services/api/sss";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target, Search, Plus, Trash2, ChevronDown, ChevronUp,
  ShieldCheck, Activity, Info, Star, CheckCircle2, ListChecks,
  LayoutGrid, FileQuestion, Lock, Unlock, MessageSquare,
  Home, Zap, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/sss-config")({
  component: SssConfigPage,
});

// ── Dimension colour tokens ──────────────────────────────────────────────────
const DIM_STYLE: Record<SssDimension, {
  bg: string; border: string; badge: string; btn: string; icon: string; ring: string;
}> = {
  say: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    btn: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-300",
  },
  stay: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    btn: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-950/30 dark:hover:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-300",
  },
  strive: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    btn: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 dark:hover:bg-amber-950/30 dark:hover:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-300",
  },
};

const SCORE_BAR_COLOR: Record<string, string> = {
  emerald: "bg-emerald-500",
  green: "bg-green-500",
  amber: "bg-amber-400",
  orange: "bg-orange-400",
  rose: "bg-rose-500",
  slate: "bg-slate-300 dark:bg-slate-600",
};

// ── Small helpers ────────────────────────────────────────────────────────────
function QuestionTypeIcon({ type }: { type: string }) {
  const icons: Record<string, any> = {
    rating: Star, single_select: CheckCircle2, multiple_select: ListChecks,
    matrix: LayoutGrid, nps: Activity, open_text_short: Info,
    open_text_long: FileQuestion, binary: ShieldCheck,
  };
  const Icon = icons[type] ?? Info;
  return <Icon className="w-3.5 h-3.5 shrink-0" />;
}

function ScoreBar({ score, color }: { score: number | null; color: string }) {
  const bar = SCORE_BAR_COLOR[color] ?? "bg-slate-400";
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", bar)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums w-10 text-right">{score}%</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function SssConfigPage() {
  const { t, lang } = useI18n();

  // Data
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [mappings, setMappings] = useState<SssQuestionMapping[]>([]);
  const [aggregate, setAggregate] = useState<Awaited<ReturnType<typeof getSssAggregateForSurvey>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeDim, setActiveDim] = useState<SssDimension>("say");
  const [pendingDelete, setPendingDelete] = useState<SssQuestionMapping | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // id being saved
  const [recalculating, setRecalculating] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bank, maps, agg] = await Promise.all([
        getQuestionBank(),
        getSssMappings(),
        getSssAggregateForSurvey("all"),
      ]);
      setSections(bank);
      setMappings(maps);
      setAggregate(agg);
      if (bank.length > 0) {
        setExpandedSections(Object.fromEntries(bank.map(s => [s.id, true])));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ────────────────────────────────────────────────────────
  const mappingsByDim = useMemo<Record<SssDimension, SssQuestionMapping[]>>(() => ({
    say:    mappings.filter(m => m.dimension === "say"),
    stay:   mappings.filter(m => m.dimension === "stay"),
    strive: mappings.filter(m => m.dimension === "strive"),
  }), [mappings]);

  const mappedQuestionIds = useMemo(() =>
    new Set(mappings.map(m => m.questionId)),
    [mappings]
  );

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map(sec => ({
        ...sec,
        questions: sec.questions.filter(question =>
          question.textEn.toLowerCase().includes(q) ||
          question.textTh.toLowerCase().includes(q) ||
          question.id.toLowerCase().includes(q)
        ),
      }))
      .filter(sec => sec.questions.length > 0);
  }, [sections, search]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleAdd = async (questionId: string, dimension: SssDimension) => {
    setSaving(questionId + dimension);
    try {
      await upsertSssMapping(questionId, dimension, 1.0);
      await fetchAll();
      toast.success(t("sss.saveSuccess"));
    } catch {
      toast.error("Failed to save mapping");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setSaving(pendingDelete.id);
    try {
      await deleteSssMapping(pendingDelete.id);
      await fetchAll();
      toast.success(t("sss.deleteSuccess"));
    } catch {
      toast.error("Failed to remove mapping");
    } finally {
      setSaving(null);
      setPendingDelete(null);
    }
  };

  const handleToggle = async (mapping: SssQuestionMapping) => {
    setSaving(mapping.id);
    try {
      await toggleSssMapping(mapping.id, !mapping.isActive);
      await fetchAll();
      toast.success(t("sss.toggleSuccess"));
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(null);
    }
  };

  const handleWeightChange = async (mapping: SssQuestionMapping, weight: number) => {
    if (weight <= 0 || weight > 10) return;
    setSaving(mapping.id);
    try {
      await updateSssMappingWeight(mapping.id, weight);
      await fetchAll();
      toast.success(t("sss.weightUpdated"));
    } catch {
      toast.error("Failed to update weight");
    } finally {
      setSaving(null);
    }
  };

  // Find question text from bank
  const findQuestion = (questionId: string): Question | undefined => {
    for (const sec of sections) {
      const q = sec.questions.find(q => q.id === questionId);
      if (q) return q;
    }
    return undefined;
  };

  const findSectionForQuestion = (questionId: string): SurveySection | undefined =>
    sections.find(sec => sec.questions.some(q => q.id === questionId));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("sss.loading")}</p>
      </div>
    );
  }

  // ── KPI aggregate scores ─────────────────────────────────────────────────
  const kpis: { key: SssDimension | "overall"; label: string; score: number | null }[] = [
    { key: "say",    label: t("sss.kpiSay"),    score: aggregate?.say ?? null },
    { key: "stay",   label: t("sss.kpiStay"),   score: aggregate?.stay ?? null },
    { key: "strive", label: t("sss.kpiStrive"), score: aggregate?.strive ?? null },
    { key: "overall",label: t("sss.kpiOverall"),score: aggregate?.overall ?? null },
  ];

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateSssAll();
      await fetchAll();
      toast.success("SSS scores recalculated for all responses");
    } catch {
      toast.error("Recalculation failed");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t("sss.title")}</h1>
          </div>
          <p className="text-[15px] font-medium text-slate-400 ml-13">{t("sss.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 px-4 py-2 rounded-xl">
          <Lock className="w-3.5 h-3.5 text-slate-300" />
          Admin-Only · Zero Leakage
        </div>
      </div>

      {/* ── Security notice ── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
          {lang === "th"
            ? "การตั้งค่า SSS ถูกป้องกันด้วย Row Level Security (RLS) บน Supabase — พนักงานไม่สามารถมองเห็น Mapping นี้ได้ผ่าน Frontend หรือ Inspect Element ไม่ว่ากรณีใดๆ"
            : "SSS configuration is protected by Row Level Security (RLS) on Supabase — employees cannot see these mappings via the frontend or browser inspect under any circumstances."}
        </p>
      </div>

      {/* ── KPI Score strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const grade = scoreToGrade(kpi.score);
          const meta = kpi.key !== "overall" ? SSS_DIMENSION_META[kpi.key as SssDimension] : null;
          return (
            <div key={kpi.key} className="p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 group hover:shadow-md transition-all">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta?.emoji ?? "📊"}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{kpi.label}</span>
              </div>
              {kpi.score !== null ? (
                <>
                  <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{kpi.score}<span className="text-lg font-bold text-slate-300">%</span></div>
                  <ScoreBar score={kpi.score} color={grade.color} />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{grade.label}</div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t("sss.noScore")}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recalculate ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={recalculating}
          onClick={handleRecalculate}
        >
          <Zap className={cn("w-4 h-4", recalculating && "animate-spin")} />
          {recalculating ? t("sss.recalculating") : t("sss.recalculate")}
        </Button>
        {aggregate && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {t("sss.basedOn")} {aggregate.respondents} {t("sss.responses")}
          </span>
        )}
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* LEFT: Question Bank */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-slate-400" />
                  <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">{t("sss.bankPanel")}</h3>
                </div>
                {filteredSections.length > 0 && (
                  <button
                    onClick={() => {
                      const allExpanded = filteredSections.every(s => expandedSections[s.id]);
                      if (allExpanded) {
                        setExpandedSections({});
                      } else {
                        setExpandedSections(Object.fromEntries(filteredSections.map(s => [s.id, true])));
                      }
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md"
                  >
                    {filteredSections.every(s => expandedSections[s.id]) 
                      ? (lang === "th" ? "ยุบทั้งหมด" : "Collapse All") 
                      : (lang === "th" ? "ขยายทั้งหมด" : "Expand All")}
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("sss.searchPlaceholder")}
                  className="h-9 pl-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-medium shadow-none"
                />
              </div>
            </div>

            <ScrollArea className="h-[560px]">
              <div className="p-3 space-y-2">
                {filteredSections.map(sec => (
                  <div key={sec.id}>
                    {/* Section header */}
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      onClick={() => setExpandedSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                    >
                      <span className="text-[12px] font-bold tracking-wide text-slate-500 group-hover:text-primary transition-colors">
                        {lang === "th" ? sec.titleTh : sec.titleEn}
                      </span>
                      {expandedSections[sec.id]
                        ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
                    </button>

                    {expandedSections[sec.id] && (
                      <div className="mt-1 space-y-1 ml-2">
                        {sec.questions.map(q => {
                          // Find which dimensions already have this question
                          const existingMaps = mappings.filter(m => m.questionId === q.id);
                          const existingDims = existingMaps.map(m => m.dimension);

                          return (
                            <div
                              key={q.id}
                              className="flex flex-col gap-2 p-2.5 rounded-lg border border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900/30 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                            >
                              {/* Question text */}
                              <div className="flex items-start gap-3">
                                <div className="mt-1 shrink-0">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                    <QuestionTypeIcon type={q.type} />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                    {lang === "th" ? q.textTh : q.textEn}
                                  </p>
                                </div>
                              </div>

                              {/* Already mapped badges */}
                              {existingDims.length > 0 && (
                                <div className="flex flex-wrap gap-1 ml-5">
                                  {existingDims.map(d => (
                                    <span key={d} className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border", DIM_STYLE[d].badge)}>
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Add buttons */}
                              <div className="flex gap-1 ml-5">
                                {(["say", "stay", "strive"] as SssDimension[]).map(dim => {
                                  const alreadyIn = existingDims.includes(dim);
                                  const style = DIM_STYLE[dim];
                                  const isSaving = saving === q.id + dim;
                                  return (
                                    <button
                                      key={dim}
                                      disabled={alreadyIn || !!saving}
                                      onClick={() => handleAdd(q.id, dim)}
                                      title={alreadyIn ? `${t("sss.alreadyMapped")} ${dim.toUpperCase()}` : `${t(`sss.addTo${dim.charAt(0).toUpperCase() + dim.slice(1) as "Say"|"Stay"|"Strive"}`)}`}
                                      className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wider transition-all",
                                        alreadyIn
                                          ? cn("opacity-30 cursor-not-allowed border-transparent", style.badge)
                                          : cn("border-slate-200 dark:border-slate-700 text-slate-400", style.btn, isSaving && "opacity-50 pointer-events-none")
                                      )}
                                    >
                                      {isSaving ? (
                                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Plus className="w-2.5 h-2.5" />
                                      )}
                                      {dim.toUpperCase()}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* RIGHT: Dimension config panels */}
        <div className="xl:col-span-3 space-y-4">

          {/* Dimension tabs */}
          <div className="flex gap-2">
            {(["say", "stay", "strive"] as SssDimension[]).map(dim => {
              const meta = SSS_DIMENSION_META[dim];
              const style = DIM_STYLE[dim];
              const count = mappingsByDim[dim].length;
              return (
                <button
                  key={dim}
                  onClick={() => setActiveDim(dim)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 font-bold transition-all",
                    activeDim === dim
                      ? cn("border-2", style.border, style.bg, "shadow-md")
                      : "border-transparent bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className={cn("text-[13px] font-black tracking-widest uppercase", activeDim === dim ? style.icon : "text-slate-500")}>{dim}</span>
                  <Badge className={cn("text-[10px] font-bold border shadow-none h-5", activeDim === dim ? style.badge : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent")}>
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Active dimension card */}
          {(["say", "stay", "strive"] as SssDimension[]).map(dim => {
            if (dim !== activeDim) return null;
            const meta = SSS_DIMENSION_META[dim];
            const style = DIM_STYLE[dim];
            const dimMappings = mappingsByDim[dim];

            return (
              <Card key={dim} className={cn("border-2 shadow-sm rounded-xl overflow-hidden", style.border)}>
                {/* Panel header */}
                <div className={cn("px-5 py-4 border-b", style.bg, style.border)}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <div className={cn("text-[15px] font-black uppercase tracking-widest", style.icon)}>
                        {dim.toUpperCase()} Dimension
                      </div>
                      <div className="text-[12px] font-medium text-muted-foreground">
                        {lang === "th" ? meta.descTh : meta.descEn}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <Badge className={cn("text-[11px] font-bold border shadow-none", style.badge)}>
                        {dimMappings.length} {lang === "th" ? "ข้อ" : "questions"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4">
                  {dimMappings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl", style.bg)}>
                        {meta.emoji}
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">{t("sss.noMappings")}</p>
                      <p className="text-xs text-muted-foreground/60">{t("sss.addHint")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dimMappings.map(mapping => {
                        const question = findQuestion(mapping.questionId);
                        const section = findSectionForQuestion(mapping.questionId);
                        const isSavingThis = saving === mapping.id;

                        return (
                          <div
                            key={mapping.id}
                            className={cn(
                              "flex flex-col gap-3 p-3 rounded-xl border transition-all",
                              mapping.isActive
                                ? "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40"
                                : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 opacity-60"
                            )}
                          >
                            {/* Question info row */}
                            <div className="flex items-start gap-3">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", style.bg, style.icon)}>
                                {question ? <QuestionTypeIcon type={question.type} /> : <Info className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                {question ? (
                                  <>
                                    <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                      {lang === "th" ? question.textTh : question.textEn}
                                    </p>
                                    {section && (
                                      <p className="text-[11px] font-medium text-muted-foreground mt-1">
                                        หมวดหมู่: {lang === "th" ? section.titleTh : section.titleEn}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-[14px] font-semibold text-rose-600 dark:text-rose-400">
                                    {lang === "th" ? "ไม่พบคำถาม (อาจถูกลบหรือเป็นข้อมูลเก่า)" : "Question not found (deleted or legacy)"}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Controls row */}
                            <div className="flex items-center gap-3 pl-[3.25rem] mt-1">
                              {/* Weight */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("sss.weight")}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    disabled={!!saving}
                                    onClick={() => handleWeightChange(mapping, Math.max(0.5, mapping.weight - 0.5))}
                                    className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors text-xs font-bold"
                                  >−</button>
                                  <span className="w-8 text-center text-[13px] font-black tabular-nums">{mapping.weight.toFixed(1)}</span>
                                  <button
                                    disabled={!!saving}
                                    onClick={() => handleWeightChange(mapping, Math.min(10, mapping.weight + 0.5))}
                                    className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors text-xs font-bold"
                                  >+</button>
                                </div>
                              </div>

                              {/* Active toggle */}
                              <div className="flex items-center gap-2 ml-2">
                                <Switch
                                  checked={mapping.isActive}
                                  disabled={isSavingThis}
                                  onCheckedChange={() => handleToggle(mapping)}
                                  className="scale-90"
                                />
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest", mapping.isActive ? "text-emerald-600" : "text-slate-400")}>
                                  {mapping.isActive ? t("sss.active") : t("sss.inactive")}
                                </span>
                              </div>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 ml-auto text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                disabled={isSavingThis}
                                onClick={() => setPendingDelete(mapping)}
                              >
                                {isSavingThis
                                  ? <div className="w-3.5 h-3.5 border border-slate-300 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
              {lang === "th"
                ? "การเปลี่ยน Mapping จะมีผลกับ Survey ทุกชุด (Global) — คะแนน SSS ของ Response ที่ submit ก่อนหน้าจะไม่ถูกคำนวณใหม่"
                : "Mapping changes apply globally to all surveys. SSS scores for previously submitted responses will not be recalculated."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Delete confirm dialog ── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={v => !v && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sss.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sss.deleteDesc")}
              {pendingDelete && !findQuestion(pendingDelete.questionId) && (
                <span className="block mt-2 font-bold text-rose-600 dark:text-rose-400">
                  (Legacy ID: {pendingDelete.questionId})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
              onClick={handleDelete}
            >
              {t("sss.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
