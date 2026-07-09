import { useEffect, useState } from "react";
import {
  History,
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  Copy,
  Archive,
  ChevronDown,
  Clock,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { MockSurvey, SurveyAuditLogEntry } from "@/lib/mock-data";
import { getSurveyAuditLog } from "@/services/api/surveys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_META: Record<
  SurveyAuditLogEntry["action"],
  {
    icon: typeof History;
    labelKey: "surveys.auditAction.create" | "surveys.auditAction.update" | "surveys.auditAction.delete" | "surveys.auditAction.clone" | "surveys.auditAction.archive";
    color: string;
    dotColor: string;
    bgColor: string;
  }
> = {
  create: {
    icon: PlusCircle,
    labelKey: "surveys.auditAction.create",
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  update: {
    icon: Pencil,
    labelKey: "surveys.auditAction.update",
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  delete: {
    icon: Trash2,
    labelKey: "surveys.auditAction.delete",
    color: "text-rose-600 dark:text-rose-400",
    dotColor: "bg-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
  },
  clone: {
    icon: Copy,
    labelKey: "surveys.auditAction.clone",
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
  archive: {
    icon: Archive,
    labelKey: "surveys.auditAction.archive",
    color: "text-purple-600 dark:text-purple-400",
    dotColor: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
};

// ─── Helper: field labels ─────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, { th: string; en: string }> = {
  title_en: { th: "ชื่อ (EN)", en: "Title (EN)" },
  title_th: { th: "ชื่อ (TH)", en: "Title (TH)" },
  status: { th: "สถานะ", en: "Status" },
  survey_type: { th: "ประเภท", en: "Type" },
  start_date: { th: "วันที่เริ่ม", en: "Start date" },
  end_date: { th: "วันที่สิ้นสุด", en: "End date" },
  target_responses: { th: "เป้าหมาย", en: "Target" },
  demographic_fields: { th: "ข้อมูลผู้ตอบ", en: "Demographics" },
  section_ids: { th: "ชุดคำถาม", en: "Sections" },
};

// ─── Helper: format value ─────────────────────────────────────────────────────
function fmtValue(val: unknown, lang: "th" | "en"): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ─── Helper: relative time ────────────────────────────────────────────────────
function relativeTime(iso: string, lang: "th" | "en"): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (lang === "th") {
      if (seconds < 60) return "เมื่อสักครู่";
      if (minutes < 2) return "เมื่อ 1 นาทีที่แล้ว";
      if (minutes < 60) return `เมื่อ ${minutes} นาทีที่แล้ว`;
      if (hours < 2) return "เมื่อ 1 ชั่วโมงที่แล้ว";
      if (hours < 24) return `เมื่อ ${hours} ชั่วโมงที่แล้ว`;
      if (days < 2) return "เมื่อวานนี้";
      if (days < 7) return `เมื่อ ${days} วันที่แล้ว`;
      if (weeks < 2) return "เมื่อ 1 สัปดาห์ที่แล้ว";
      if (weeks < 5) return `เมื่อ ${weeks} สัปดาห์ที่แล้ว`;
      if (months < 2) return "เมื่อ 1 เดือนที่แล้ว";
      return `เมื่อ ${months} เดือนที่แล้ว`;
    }
    if (seconds < 60) return "Just now";
    if (minutes < 2) return "1 min ago";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 2) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    if (days < 2) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (weeks < 2) return "1 week ago";
    if (weeks < 5) return `${weeks} weeks ago`;
    if (months < 2) return "1 month ago";
    return `${months} months ago`;
  } catch {
    return iso;
  }
}

// ─── Helper: full date string ─────────────────────────────────────────────────
function fmtDate(iso: string, lang: "th" | "en"): string {
  try {
    return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Actor initials ───────────────────────────────────────────────────────────
function getInitials(nameEn?: string, nameTh?: string): string {
  const name = nameEn || nameTh || "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "??";
}

// ─── Change detail row ────────────────────────────────────────────────────────
function ChangeDetail({
  field,
  change,
  lang,
}: {
  field: string;
  change: unknown;
  lang: "th" | "en";
}) {
  const label = FIELD_LABELS[field]?.[lang] ?? field;
  const diff = change as { from?: unknown; to?: unknown } | undefined;

  if (!diff || (diff.from === undefined && diff.to === undefined)) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300 min-w-[90px] shrink-0">
          {label}
        </span>
        <span className="text-slate-500">{fmtValue(change, lang)}</span>
      </div>
    );
  }

  const fromVal = fmtValue(diff.from, lang);
  const toVal = fmtValue(diff.to, lang);

  return (
    <div className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="line-through text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
          {fromVal || "—"}
        </span>
        <span className="text-slate-300 dark:text-slate-600 text-[10px]">→</span>
        <span className="font-medium text-slate-700 dark:text-slate-200 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
          {toVal || "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Timeline entry ───────────────────────────────────────────────────────────
function TimelineEntry({
  entry,
  lang,
  isLast,
}: {
  entry: SurveyAuditLogEntry;
  lang: "th" | "en";
  isLast: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const hasChanges = Object.keys(entry.changes).length > 0;
  const meta = ACTION_META[entry.action];
  const ActionIcon = meta.icon;
  const actorName =
    lang === "th"
      ? entry.actorNameTh || entry.actorNameEn || t("surveys.auditUnknown")
      : entry.actorNameEn || entry.actorNameTh || t("surveys.auditUnknown");
  const initials = getInitials(entry.actorNameEn, entry.actorNameTh);

  return (
    <div className="relative pl-10 pb-6 group">
      {/* Timeline vertical line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-700 group-last:hidden" />
      )}

      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-2.5 top-1.5 w-[21px] h-[21px] rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center",
          meta.bgColor,
          meta.dotColor.replace("bg-", "ring-") || ""
        )}
      >
        <div className={cn("w-2.5 h-2.5 rounded-full", meta.dotColor)} />
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 p-3.5">
          {/* Action icon */}
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              meta.bgColor
            )}
          >
            <ActionIcon className={cn("w-4.5 h-4.5", meta.color)} />
          </div>

          {/* Actor + action text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {actorName}
              </span>
              {entry.actorEmployeeCode && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                  {entry.actorEmployeeCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider h-5 px-2 border-0",
                  meta.bgColor,
                  meta.color
                )}
              >
                {t(meta.labelKey)}
              </Badge>
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(entry.createdAt, lang)}
            </span>
            <span className="text-[10px] text-slate-300 dark:text-slate-600 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {fmtDate(entry.createdAt, lang)}
            </span>
          </div>
        </div>

        {/* Changes section (collapsible) */}
        {hasChanges && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-t border-slate-50 dark:border-slate-700/30",
                expanded && "bg-slate-50/50 dark:bg-slate-800/30"
              )}
            >
              <span>
                {lang === "th"
                  ? `ดูรายละเอียดที่เปลี่ยนแปลง (${Object.keys(entry.changes).length} รายการ)`
                  : `View changes (${Object.keys(entry.changes).length} item${Object.keys(entry.changes).length > 1 ? "s" : ""})`}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </button>
            {expanded && (
              <div className="px-3.5 pb-3.5 pt-2 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                {Object.entries(entry.changes).map(([field, change]) => (
                  <ChangeDetail key={field} field={field} change={change} lang={lang} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ lang }: { lang: "th" | "en" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
        <History className="w-7 h-7 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {lang === "th" ? "ยังไม่มีประวัติการแก้ไข" : "No edit history yet"}
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-[240px]">
        {lang === "th"
          ? "เมื่อมีการแก้ไขแบบสำรวจนี้ ประวัติการเปลี่ยนแปลงจะแสดงที่นี่"
          : "When changes are made to this survey, the edit history will appear here."}
      </p>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────
function LoadingState({ lang }: { lang: "th" | "en" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-primary/20 animate-pulse" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
        {lang === "th" ? "กำลังโหลดประวัติ..." : "Loading history..."}
      </p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t, lang } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-rose-400" />
      </div>
      <h3 className="text-sm font-semibold text-rose-500 mb-1">
        {lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load history"}
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-[240px] mb-4">
        {lang === "th"
          ? "กรุณาลองอีกครั้งหรือตรวจสอบการเชื่อมต่อ"
          : "Please try again or check your connection."}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="text-xs h-8">
        {t("surveys.retry")}
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SurveyAuditLogDialog({
  survey,
  onClose,
}: {
  survey: MockSurvey;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [entries, setEntries] = useState<SurveyAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    getSurveyAuditLog(survey.id)
      .then((data) => {
        setEntries(data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey.id]);

  const surveyTitle = lang === "th" ? survey.titleTh : survey.titleEn;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-0 overflow-hidden gap-0 shadow-2xl">
        {/* ── Header ── */}
        <DialogHeader className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold">
                {t("surveys.auditLogTitle")}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5 truncate pr-4">
                {surveyTitle}
              </DialogDescription>
            </div>
            {/* Survey status badge */}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider border-white/10 shrink-0",
                survey.status === "Active"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : survey.status === "Draft"
                    ? "bg-amber-400/10 text-amber-300"
                    : "bg-slate-400/10 text-slate-300"
              )}
            >
              {survey.status}
            </Badge>
          </div>
          {entries.length > 0 && !loading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-white/5 px-2 py-0.5 rounded-full">
                {lang === "th"
                  ? `${entries.length} รายการ`
                  : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
              </span>
            </div>
          )}
        </DialogHeader>

        {/* ── Body ── */}
        <ScrollArea className="max-h-[65vh]">
          <div className="p-5">
            {loading && <LoadingState lang={lang} />}
            {error && !loading && <ErrorState onRetry={load} />}
            {!loading && !error && entries.length === 0 && <EmptyState lang={lang} />}
            {!loading && !error && entries.length > 0 && (
              <div className="space-y-0">
                {entries.map((entry, idx) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    lang={lang}
                    isLast={idx === entries.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}