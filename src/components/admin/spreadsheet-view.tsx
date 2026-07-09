/**
 * spreadsheet-view.tsx
 * Google Sheets-style read-only data grid for the Raw Data page.
 * Features: sticky header + first cols, heat-coloured rating cells,
 * row click → detail dialog, column resize, search highlight.
 */
import { useMemo, useRef, useCallback, useState, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { ExportQuestion } from "@/services/api/export";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpreadsheetViewProps {
  responses: any[];
  surveys: { id: string; titleEn: string; titleTh: string }[];
  questions: ExportQuestion[];
  search: string;
  onRowClick: (response: any) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 36; // px
const HEADER_HEIGHT = 42; // px
const MIN_COL_WIDTH = 80;
const DEFAULT_DEMO_WIDTH = 140;
const DEFAULT_Q_WIDTH = 120;
const ID_COL_WIDTH = 110;

const DEMO_COLS = [
  { key: "department", labelEn: "Department", labelTh: "หน่วยงาน" },
  { key: "businessUnit", labelEn: "BU", labelTh: "BU" },
  { key: "location", labelEn: "Location", labelTh: "สถานที่" },
  { key: "level", labelEn: "Level", labelTh: "ระดับ" },
  { key: "gender", labelEn: "Gender", labelTh: "เพศ" },
] as const;

// ─── Heat colour for numeric scores ──────────────────────────────────────────

function getRatingColor(val: number, max: number = 5): string {
  const ratio = Math.max(0, Math.min(1, (val - 1) / (max - 1)));
  // Green (4E/A35) → Yellow (EAB308) → Red (EF4444)
  if (ratio >= 0.66)
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (ratio >= 0.33)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function getNpsColor(val: number): string {
  if (val >= 9) return "bg-emerald-100 text-emerald-800";
  if (val >= 7) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

// ─── Cell renderer ────────────────────────────────────────────────────────────

function AnswerCell({
  ans,
  highlight,
}: {
  ans: any;
  highlight: boolean;
}) {
  if (!ans)
    return (
      <span className="text-slate-300 dark:text-slate-700 select-none">—</span>
    );

  // NPS (0-10)
  if (ans.numeric_value !== null && ans.numeric_value !== undefined) {
    const v = Number(ans.numeric_value);
    const isNps = v > 5; // heuristic: NPS values go 0-10
    const colorCls = isNps ? getNpsColor(v) : getRatingColor(v);
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-8 h-6 rounded-md text-[11px] font-bold",
          colorCls,
          highlight && "ring-2 ring-yellow-400"
        )}
      >
        {v}
      </span>
    );
  }

  if (ans.text_value) {
    const text = String(ans.text_value);
    return (
      <span
        className={cn(
          "text-[11px] text-slate-600 dark:text-slate-400 italic truncate block max-w-[200px]",
          highlight && "bg-yellow-100 dark:bg-yellow-900/30 rounded px-1"
        )}
        title={text}
      >
        {text}
      </span>
    );
  }

  if (ans.array_text_value?.length) {
    return (
      <span className="text-[10px] text-slate-500 italic truncate block max-w-[180px]">
        {ans.array_text_value.join(", ")}
      </span>
    );
  }

  if (ans.jsonb_value) {
    const entries = Object.entries(ans.jsonb_value)
      .map(([k, v]) => `${k}:${v}`)
      .join(" | ");
    return (
      <span
        className="text-[10px] text-slate-500 italic truncate block max-w-[200px]"
        title={entries}
      >
        {entries}
      </span>
    );
  }

  return <span className="text-slate-300 select-none">—</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SpreadsheetView({
  responses,
  surveys,
  questions,
  search,
  onRowClick,
}: SpreadsheetViewProps) {
  const { lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  // Column widths state (keyed by col index)
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const dragRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  // ── Build answer maps per response ───────────────────────────────────────
  const answerMaps = useMemo(() => {
    return responses.map((r) => {
      const map: Record<string, any> = {};
      r.response_answers?.forEach((ans: any) => {
        map[ans.question_id] = ans;
      });
      return map;
    });
  }, [responses]);

  // ── Column definitions ───────────────────────────────────────────────────
  // col 0 = ID, cols 1…DEMO_COLS.length = demographics, then questions
  const totalCols = 1 + DEMO_COLS.length + questions.length;

  const getColWidth = useCallback(
    (colIdx: number): number => {
      if (colWidths[colIdx] !== undefined) return colWidths[colIdx];
      if (colIdx === 0) return ID_COL_WIDTH;
      if (colIdx <= DEMO_COLS.length) return DEFAULT_DEMO_WIDTH;
      return DEFAULT_Q_WIDTH;
    },
    [colWidths]
  );

  // Sticky left offsets
  const stickyLeftOf = useCallback(
    (colIdx: number): number => {
      let acc = 0;
      for (let i = 0; i < colIdx; i++) acc += getColWidth(i);
      return acc;
    },
    [getColWidth]
  );

  // Number of frozen left cols (ID + demographics)
  const FROZEN_COLS = 1 + DEMO_COLS.length;

  // ── Drag-resize handlers ─────────────────────────────────────────────────
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIdx: number) => {
      e.preventDefault();
      dragRef.current = {
        colIdx,
        startX: e.clientX,
        startW: getColWidth(colIdx),
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const newW = Math.max(
          MIN_COL_WIDTH,
          dragRef.current.startW + (ev.clientX - dragRef.current.startX)
        );
        setColWidths((prev) => ({ ...prev, [dragRef.current!.colIdx]: newW }));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [getColWidth]
  );

  // ── Search highlight ─────────────────────────────────────────────────────
  const searchLower = search.toLowerCase();

  const cellHighlighted = useCallback(
    (text: string) => !!searchLower && text.toLowerCase().includes(searchLower),
    [searchLower]
  );

  // ── Render ───────────────────────────────────────────────────────────────
  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-30">
        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
        </svg>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          No data
        </span>
      </div>
    );
  }

  // Build total scrollable width
  const totalWidth = Array.from({ length: totalCols }, (_, i) => getColWidth(i)).reduce(
    (a, b) => a + b,
    0
  );

  // ── Header cell style helper ─────────────────────────────────────────────
  const headerCellStyle = (colIdx: number): CSSProperties => {
    const style: CSSProperties = {
      width: getColWidth(colIdx),
      minWidth: getColWidth(colIdx),
      maxWidth: getColWidth(colIdx),
      height: HEADER_HEIGHT,
    };
    if (colIdx < FROZEN_COLS) {
      style.position = "sticky";
      style.left = stickyLeftOf(colIdx);
      style.zIndex = 20;
    }
    return style;
  };

  const bodyCellStyle = (colIdx: number): CSSProperties => {
    const style: CSSProperties = {
      width: getColWidth(colIdx),
      minWidth: getColWidth(colIdx),
      maxWidth: getColWidth(colIdx),
      height: ROW_HEIGHT,
    };
    if (colIdx < FROZEN_COLS) {
      style.position = "sticky";
      style.left = stickyLeftOf(colIdx);
      style.zIndex = 10;
    }
    return style;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-auto flex-1 relative border border-slate-100 dark:border-slate-800 rounded-b-2xl"
        style={{ maxHeight: "calc(100vh - 320px)", minHeight: 300 }}
      >
        <table
          className="border-collapse text-left select-none"
          style={{ width: totalWidth, tableLayout: "fixed" }}
        >
          {/* ── Header ── */}
          <thead>
            <tr className="bg-slate-900 dark:bg-slate-950">
              {/* Row number corner */}
              <th
                style={headerCellStyle(0)}
                className="sticky top-0 left-0 z-30 bg-slate-900 dark:bg-slate-950 border-b border-r border-slate-700 px-3 py-0 text-[10px] font-bold uppercase tracking-widest text-slate-400 overflow-hidden relative"
              >
                <span className="truncate block">
                  {lang === "th" ? "รหัส" : "ID"}
                </span>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                  onMouseDown={(e) => onResizeMouseDown(e, 0)}
                />
              </th>

              {/* Demographics */}
              {DEMO_COLS.map((col, i) => {
                const colIdx = 1 + i;
                return (
                  <th
                    key={col.key}
                    style={headerCellStyle(colIdx)}
                    className="sticky top-0 z-20 bg-slate-900 dark:bg-slate-950 border-b border-r border-slate-700 px-3 py-0 text-[10px] font-bold uppercase tracking-widest text-slate-300 overflow-hidden relative"
                  >
                    <span className="truncate block">
                      {lang === "th" ? col.labelTh : col.labelEn}
                    </span>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                      onMouseDown={(e) => onResizeMouseDown(e, colIdx)}
                    />
                  </th>
                );
              })}

              {/* Questions */}
              {questions.map((q, i) => {
                const colIdx = FROZEN_COLS + i;
                const label = lang === "th" ? q.textTh : q.textEn;
                return (
                  <th
                    key={q.id}
                    style={headerCellStyle(colIdx)}
                    className="sticky top-0 bg-slate-800 dark:bg-slate-900 border-b border-r border-slate-700 px-2 py-0 text-[9px] font-bold uppercase tracking-widest text-slate-400 overflow-hidden relative"
                  >
                    <div className="flex flex-col gap-px">
                      <span className="text-primary font-black text-[10px]">{q.id}</span>
                      <span className="truncate">{label.substring(0, 30)}{label.length > 30 ? "…" : ""}</span>
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                      onMouseDown={(e) => onResizeMouseDown(e, colIdx)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {responses.map((r, rowIdx) => {
              const demo = r.demographics || {};
              const ansMap = answerMaps[rowIdx];
              const survey = surveys.find((s) => s.id === r.survey_id);
              const surveyLabel = lang === "th" ? survey?.titleTh : survey?.titleEn;
              const isEven = rowIdx % 2 === 0;

              return (
                <tr
                  key={r.id}
                  className={cn(
                    "group cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-colors",
                    isEven
                      ? "bg-white dark:bg-slate-900"
                      : "bg-slate-50 dark:bg-slate-950",
                    "hover:bg-primary/5 dark:hover:bg-primary/10"
                  )}
                  onClick={() => onRowClick(r)}
                >
                  {/* ID cell */}
                  <td
                    style={bodyCellStyle(0)}
                    className={cn(
                      "border-r border-slate-100 dark:border-slate-800 px-3 overflow-hidden",
                      isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-950",
                      "group-hover:bg-primary/5 dark:group-hover:bg-primary/10"
                    )}
                  >
                    <div className="flex flex-col gap-px">
                      <span className="font-mono text-[10px] text-slate-500 truncate">{r.id.substring(0, 8)}…</span>
                      {surveyLabel && (
                        <span className="text-[9px] text-slate-400 truncate">{String(surveyLabel).substring(0, 16)}…</span>
                      )}
                    </div>
                  </td>

                  {/* Demographic cells */}
                  {DEMO_COLS.map((col, i) => {
                    const colIdx = 1 + i;
                    const val = demo[col.key] || demo[col.key.replace(/([A-Z])/g, "_$1").toLowerCase()] || "—";
                    const hl = cellHighlighted(val);
                    return (
                      <td
                        key={col.key}
                        style={bodyCellStyle(colIdx)}
                        className={cn(
                          "border-r border-slate-100 dark:border-slate-800 px-3 overflow-hidden",
                          isEven ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-950",
                          "group-hover:bg-primary/5 dark:group-hover:bg-primary/10"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate block",
                            hl && "bg-yellow-100 dark:bg-yellow-900/30 rounded px-0.5"
                          )}
                        >
                          {val}
                        </span>
                      </td>
                    );
                  })}

                  {/* Answer cells */}
                  {questions.map((q, i) => {
                    const colIdx = FROZEN_COLS + i;
                    const ans = ansMap[q.id];
                    const textForHighlight =
                      ans?.text_value ?? String(ans?.numeric_value ?? "");
                    const hl = cellHighlighted(textForHighlight);

                    return (
                      <td
                        key={q.id}
                        style={bodyCellStyle(colIdx)}
                        className="border-r border-slate-100 dark:border-slate-800 px-2 overflow-hidden"
                      >
                        <div className="flex items-center justify-center h-full">
                          <AnswerCell ans={ans} highlight={hl} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer strip ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>
          {responses.length} {lang === "th" ? "รายการ" : "rows"} · {questions.length} {lang === "th" ? "คำถาม" : "question cols"} · {DEMO_COLS.length} {lang === "th" ? "ข้อมูลส่วนตัว" : "demographic cols"}
        </span>
        <span className="text-[9px] flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
          {lang === "th" ? "สูง" : "High (4-5)"}
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-200 border border-yellow-300 ml-1.5" />
          {lang === "th" ? "กลาง" : "Mid (3)"}
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-200 border border-red-300 ml-1.5" />
          {lang === "th" ? "ต่ำ" : "Low (1-2)"}
          <span className="ml-3 opacity-60">
            {lang === "th" ? "← ลาก header เพื่อปรับขนาด" : "← drag headers to resize"}
          </span>
        </span>
      </div>
    </div>
  );
}

export default SpreadsheetView;
