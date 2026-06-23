/**
 * export.ts
 * Excel (.xlsx), CSV, and Google Sheets export helpers for Raw Data page.
 * Uses the already-installed `xlsx` (SheetJS CE) package.
 */
import * as XLSX from "xlsx";
import type { MockSurvey } from "./surveys";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExportQuestion {
  id: string;
  textEn: string;
  textTh: string;
  sectionTitleEn: string;
  sectionTitleTh: string;
  choices?: { value: string; labelEn: string; labelTh: string }[];
}

export interface ExportFilters {
  surveyId: string;
  department: string;
  search: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAnswerDisplay(ans: any): string | number {
  if (ans.numeric_value !== null && ans.numeric_value !== undefined) {
    return ans.numeric_value;
  }
  if (ans.text_value) return ans.text_value;
  if (ans.array_text_value?.length) return ans.array_text_value.join(", ");
  if (ans.jsonb_value) {
    return Object.entries(ans.jsonb_value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
  }
  return "—";
}

function autoFitColumns(ws: XLSX.WorkSheet, data: any[][]): void {
  const maxLens = (data[0] || []).map((_: any, colIdx: number) =>
    Math.min(
      50,
      Math.max(10, ...data.map((row) => String(row[colIdx] ?? "").length))
    )
  );
  ws["!cols"] = maxLens.map((w: number) => ({ wch: w }));
}

function styleHeaderRow(ws: XLSX.WorkSheet, colCount: number): void {
  // Apply bold + fill to A1:lastCol using raw cell write
  for (let c = 0; c < colCount; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F172A" } },
      alignment: { horizontal: "center" },
    };
  }
}

// ─── Sheet Builders ───────────────────────────────────────────────────────────

function buildSummarySheet(
  responses: any[],
  surveys: MockSurvey[],
  filters: ExportFilters,
  lang: "en" | "th"
): XLSX.WorkSheet {
  const surveysInData = [
    ...new Set(responses.map((r) => r.survey_id)),
  ]
    .map((id) => surveys.find((s) => s.id === id))
    .filter(Boolean) as MockSurvey[];

  const rows: any[][] = [
    ["HR Pulse Survey — Export Summary"],
    [],
    ["Generated At", new Date().toLocaleString()],
    ["Language", lang === "th" ? "Thai" : "English"],
    [],
    ["Filter: Survey", filters.surveyId === "all" ? "All Surveys" : surveysInData.map((s) => (lang === "th" ? s.titleTh : s.titleEn)).join(", ")],
    ["Filter: Department", filters.department === "all" ? "All Departments" : filters.department],
    ["Filter: Search", filters.search || "(none)"],
    [],
    ["Metric", "Value"],
    ["Total Responses", responses.length],
    ["Unique Departments", new Set(responses.map((r) => r.demographics?.department || "N/A")).size],
    ["Unique Surveys", surveysInData.length],
  ];

  if (responses.length > 0) {
    const dates = responses
      .map((r) => r.completed_at)
      .filter(Boolean)
      .sort();
    rows.push(["Earliest Response", new Date(dates[0]).toLocaleString()]);
    rows.push(["Latest Response", new Date(dates[dates.length - 1]).toLocaleString()]);
  }

  // Avg score across all numeric answers
  const numericValues: number[] = [];
  responses.forEach((r) => {
    r.response_answers?.forEach((a: any) => {
      if (a.numeric_value !== null && a.numeric_value !== undefined) {
        numericValues.push(Number(a.numeric_value));
      }
    });
  });
  const avgScore =
    numericValues.length > 0
      ? (numericValues.reduce((s, v) => s + v, 0) / numericValues.length).toFixed(2)
      : "N/A";
  rows.push(["Overall Avg Score (numeric)", avgScore]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 50 }];
  // Bold title
  if (ws["A1"]) ws["A1"].s = { font: { bold: true, sz: 14, color: { rgb: "0F172A" } } };
  return ws;
}

function buildResponsesSheet(
  responses: any[],
  surveys: MockSurvey[],
  questions: ExportQuestion[],
  lang: "en" | "th"
): XLSX.WorkSheet {
  // Header row
  const demographicCols = [
    lang === "th" ? "รหัสตอบ" : "Response ID",
    lang === "th" ? "แบบสำรวจ" : "Survey",
    lang === "th" ? "ประเภท" : "Type",
    lang === "th" ? "หน่วยงาน" : "Department",
    lang === "th" ? "หน่วยธุรกิจ" : "Business Unit",
    lang === "th" ? "ระดับ" : "Level",
    lang === "th" ? "สถานที่" : "Location",
    lang === "th" ? "เพศ" : "Gender",
    lang === "th" ? "ช่วงอายุ" : "Age Range",
    lang === "th" ? "อายุงาน" : "Tenure",
    lang === "th" ? "วันที่ส่ง" : "Completed At",
    lang === "th" ? "เวลา (วินาที)" : "Time Spent (s)",
  ];

  const questionHeaders = questions.map(
    (q) =>
      `[${q.id}] ${(lang === "th" ? q.textTh : q.textEn).substring(0, 60)}${(lang === "th" ? q.textTh : q.textEn).length > 60 ? "…" : ""}`
  );

  const header = [...demographicCols, ...questionHeaders];

  const dataRows = responses.map((r) => {
    const survey = surveys.find((s) => s.id === r.survey_id);
    const demo = r.demographics || {};
    const answersMap: Record<string, any> = {};
    r.response_answers?.forEach((ans: any) => {
      answersMap[ans.question_id] = getAnswerDisplay(ans);
    });

    return [
      r.id,
      lang === "th" ? (survey?.titleTh ?? "Unknown") : (survey?.titleEn ?? "Unknown"),
      survey?.surveyType ?? "N/A",
      demo.department ?? "N/A",
      demo.businessUnit ?? demo.business_unit ?? "N/A",
      demo.level ?? "N/A",
      demo.location ?? "N/A",
      demo.gender ?? "N/A",
      demo.ageRange ?? demo.age_range ?? "N/A",
      demo.tenure ?? "N/A",
      r.completed_at ? new Date(r.completed_at).toLocaleString() : "N/A",
      r.time_spent_seconds ?? "N/A",
      ...questions.map((q) => answersMap[q.id] ?? "—"),
    ];
  });

  const allRows = [header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  autoFitColumns(ws, allRows);
  styleHeaderRow(ws, header.length);
  return ws;
}

function buildDeptSheet(responses: any[], lang: "en" | "th"): XLSX.WorkSheet {
  const deptMap: Record<string, { sum: number; count: number; responses: number }> = {};

  responses.forEach((r) => {
    const dept = r.demographics?.department || "Unknown";
    if (!deptMap[dept]) deptMap[dept] = { sum: 0, count: 0, responses: 0 };
    deptMap[dept].responses += 1;
    r.response_answers?.forEach((a: any) => {
      if (a.numeric_value !== null && a.numeric_value !== undefined) {
        deptMap[dept].sum += Number(a.numeric_value);
        deptMap[dept].count += 1;
      }
    });
  });

  const header = [
    lang === "th" ? "หน่วยงาน" : "Department",
    lang === "th" ? "จำนวนผู้ตอบ" : "Responses",
    lang === "th" ? "คะแนนเฉลี่ย" : "Avg Score",
    lang === "th" ? "จำนวนคำตอบ" : "Answer Count",
  ];

  const rows = Object.entries(deptMap).map(([dept, stats]) => [
    dept,
    stats.responses,
    stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : "N/A",
    stats.count,
  ]);

  rows.sort((a, b) => (b[2] as number) - (a[2] as number));

  const allRows = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  autoFitColumns(ws, allRows);
  styleHeaderRow(ws, header.length);
  return ws;
}

function buildQuestionMapSheet(
  questions: ExportQuestion[],
  lang: "en" | "th"
): XLSX.WorkSheet {
  const header = [
    "Question ID",
    "Section (EN)",
    "Section (TH)",
    "Question (EN)",
    "Question (TH)",
    "Answer Choices (EN)",
  ];

  const rows = questions.map((q) => [
    q.id,
    q.sectionTitleEn,
    q.sectionTitleTh,
    q.textEn,
    q.textTh,
    q.choices?.map((c) => c.labelEn).join(" | ") ?? "—",
  ]);

  const allRows = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  autoFitColumns(ws, allRows);
  styleHeaderRow(ws, header.length);
  return ws;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Download a fully formatted multi-sheet .xlsx workbook.
 */
export function exportToExcel(
  responses: any[],
  surveys: MockSurvey[],
  questions: ExportQuestion[],
  filters: ExportFilters,
  lang: "en" | "th" = "en"
): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(responses, surveys, filters, lang), "Summary");
  XLSX.utils.book_append_sheet(wb, buildResponsesSheet(responses, surveys, questions, lang), "Responses");
  XLSX.utils.book_append_sheet(wb, buildDeptSheet(responses, lang), "By Department");
  XLSX.utils.book_append_sheet(wb, buildQuestionMapSheet(questions, lang), "Question Map");

  const surveyName =
    filters.surveyId !== "all"
      ? surveys.find((s) => s.id === filters.surveyId)?.titleEn?.replace(/[^a-zA-Z0-9]/g, "-") ?? "survey"
      : "all-surveys";
  const date = new Date().toISOString().split("T")[0];
  const fileName = `hrpulse-raw-data-${surveyName}-${date}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Download a flat CSV of all responses (respects current filters).
 */
export function exportToCSV(
  responses: any[],
  surveys: MockSurvey[],
  questions: ExportQuestion[],
  lang: "en" | "th" = "en"
): string {
  const demographicCols = [
    "Response ID", "Survey", "Type", "Department", "Business Unit",
    "Level", "Location", "Gender", "Age Range", "Tenure",
    "Completed At", "Time Spent (s)",
  ];
  const questionHeaders = questions.map((q) => `[${q.id}] ${lang === "th" ? q.textTh : q.textEn}`);
  const header = [...demographicCols, ...questionHeaders];

  const rows = responses.map((r) => {
    const survey = surveys.find((s) => s.id === r.survey_id);
    const demo = r.demographics || {};
    const answersMap: Record<string, any> = {};
    r.response_answers?.forEach((ans: any) => {
      answersMap[ans.question_id] = getAnswerDisplay(ans);
    });

    return [
      r.id,
      lang === "th" ? (survey?.titleTh ?? "") : (survey?.titleEn ?? ""),
      survey?.surveyType ?? "",
      demo.department ?? "",
      demo.businessUnit ?? demo.business_unit ?? "",
      demo.level ?? "",
      demo.location ?? "",
      demo.gender ?? "",
      demo.ageRange ?? demo.age_range ?? "",
      demo.tenure ?? "",
      r.completed_at ? new Date(r.completed_at).toLocaleString() : "",
      r.time_spent_seconds ?? "",
      ...questions.map((q) => answersMap[q.id] ?? ""),
    ];
  });

  const escapeCSV = (v: any) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csvLines = [header, ...rows].map((row) => row.map(escapeCSV).join(","));
  return csvLines.join("\n");
}

/**
 * Download as .csv file.
 */
export function downloadCSV(
  responses: any[],
  surveys: MockSurvey[],
  questions: ExportQuestion[],
  filters: ExportFilters,
  lang: "en" | "th" = "en"
): void {
  const csv = exportToCSV(responses, surveys, questions, lang);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const surveyName =
    filters.surveyId !== "all"
      ? surveys.find((s) => s.id === filters.surveyId)?.titleEn?.replace(/[^a-zA-Z0-9]/g, "-") ?? "survey"
      : "all-surveys";
  a.download = `hrpulse-raw-data-${surveyName}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download CSV then open Google Sheets new tab.
 * Returns the sheets.new URL for the caller to use in a toast.
 */
export function exportToGoogleSheets(
  responses: any[],
  surveys: MockSurvey[],
  questions: ExportQuestion[],
  filters: ExportFilters,
  lang: "en" | "th" = "en"
): string {
  // Step 1: trigger CSV download
  downloadCSV(responses, surveys, questions, filters, lang);
  // Step 2: return URL for caller to open
  return "https://sheets.new";
}

/**
 * Download raw JSON (legacy behaviour, preserved).
 */
export function downloadJSON(
  responses: any[],
  surveys: MockSurvey[],
  questions: ExportQuestion[],
  filters: ExportFilters,
  lang: "en" | "th" = "en"
): void {
  const data = responses.map((r) => {
    const answers: Record<string, any> = {};
    r.response_answers?.forEach((ans: any) => {
      const q = questions.find((q) => q.id === ans.question_id);
      const qText = q ? (lang === "th" ? q.textTh : q.textEn) : ans.question_id;
      answers[qText] = getAnswerDisplay(ans);
    });
    return {
      id: r.id,
      survey: surveys.find((s) => s.id === r.survey_id)?.titleEn ?? "Unknown",
      department: r.demographics?.department ?? "N/A",
      location: r.demographics?.location ?? "N/A",
      completedAt: r.completed_at,
      ...answers,
    };
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hrpulse-raw-data-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
