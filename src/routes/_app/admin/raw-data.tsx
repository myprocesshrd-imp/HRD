import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Database, Search, Download, ChevronRight, ChevronLeft,
  ArrowUpDown, Eye, Clock, Calendar, Building2,
  Layers, FileSpreadsheet, FileJson, FileText,
  ExternalLink, LayoutList, Grid3x3, Users, TrendingUp,
} from "lucide-react";
import {
  getSurveyResponses,
  getSurveys,
  getSurveySections,
  type MockSurvey,
} from "@/services/api";
import {
  getResponseDetail,
  type DetailAnswer,
  type DetailFeedback,
} from "@/services/api/responses";
import {
  exportToExcel,
  downloadCSV,
  downloadJSON,
  exportToGoogleSheets,
  type ExportQuestion,
  type ExportFilters,
} from "@/services/api/export";
import { SpreadsheetView } from "@/components/admin/spreadsheet-view";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/raw-data")({
  component: RawDataPage,
});

type ViewMode = "table" | "sheet";

function RawDataPage() {
  const { t, lang } = useI18n();

  const [responses, setResponses] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [viewingResponse, setViewingResponse] = useState<any | null>(null);
  const [allQuestions, setAllQuestions] = useState<ExportQuestion[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailAnswers, setDetailAnswers] = useState<DetailAnswer[]>([]);
  const [detailFeedback, setDetailFeedback] = useState<DetailFeedback[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "completed_at",
    direction: "desc",
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [surveysRes, initialResponses] = await Promise.all([
        getSurveys(),
        getSurveyResponses("all"),
      ]);
      setSurveys(surveysRes);
      setResponses(initialResponses);

      if (surveysRes.length > 0) {
        const sectionsPromises = surveysRes.map((s) => getSurveySections(s.id));
        const allSecs = await Promise.all(sectionsPromises);
        const questionsMap: ExportQuestion[] = [];
        allSecs.flat().forEach((sec) => {
          sec.questions.forEach((q) => {
            if (!questionsMap.find((item) => item.id === q.id)) {
              questionsMap.push({
                id: q.id,
                textEn: q.textEn,
                textTh: q.textTh,
                choices: q.choices,
                sectionTitleEn: sec.titleEn,
                sectionTitleTh: sec.titleTh,
              });
            }
          });
        });
        setAllQuestions(questionsMap);
      }
    } catch (err) {
      console.error("Error loading raw data:", err);
      toast.error("Failed to load raw data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtering & sorting ───────────────────────────────────────────────────

  const departments = useMemo(() => {
    const depts = new Set<string>();
    responses.forEach((r) => {
      const dept = r.demographics?.department || r.demographics?.dept;
      if (dept) depts.add(dept);
    });
    return Array.from(depts).sort();
  }, [responses]);

  const sortedAndFilteredResponses = useMemo(() => {
    let result = responses.filter((r) => {
      const matchesSearch =
        !search ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        (r.demographics?.department || "").toLowerCase().includes(search.toLowerCase());
      const matchesSurvey = selectedSurvey === "all" || r.survey_id === selectedSurvey;
      const dept = r.demographics?.department || r.demographics?.dept;
      const matchesDept = selectedDept === "all" || dept === selectedDept;
      return matchesSearch && matchesSurvey && matchesDept;
    });

    result.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      if (sortConfig.key === "survey") {
        aVal = surveys.find((s) => s.id === a.survey_id)?.titleEn || "";
        bVal = surveys.find((s) => s.id === b.survey_id)?.titleEn || "";
      } else if (sortConfig.key === "dept") {
        aVal = a.demographics?.department || a.demographics?.dept || "";
        bVal = b.demographics?.department || b.demographics?.dept || "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [responses, search, selectedSurvey, selectedDept, sortConfig, surveys]);

  const paginatedResponses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredResponses.slice(start, start + pageSize);
  }, [sortedAndFilteredResponses, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAndFilteredResponses.length / pageSize);

  const toggleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  // ── Quick stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = sortedAndFilteredResponses.length;
    const uniqueDepts = new Set(
      sortedAndFilteredResponses.map((r) => r.demographics?.department || "N/A")
    ).size;

    const numericValues: number[] = [];
    sortedAndFilteredResponses.forEach((r) => {
      r.response_answers?.forEach((a: any) => {
        if (a.numeric_value !== null && a.numeric_value !== undefined) {
          numericValues.push(Number(a.numeric_value));
        }
      });
    });
    const avgScore =
      numericValues.length > 0
        ? (numericValues.reduce((s, v) => s + v, 0) / numericValues.length).toFixed(2)
        : "—";

    const dates = sortedAndFilteredResponses
      .map((r) => r.completed_at)
      .filter(Boolean)
      .sort();
    const dateRange =
      dates.length >= 2
        ? `${new Date(dates[0]).toLocaleDateString()} – ${new Date(dates[dates.length - 1]).toLocaleDateString()}`
        : dates.length === 1
        ? new Date(dates[0]).toLocaleDateString()
        : "—";

    return { total, uniqueDepts, avgScore, dateRange };
  }, [sortedAndFilteredResponses]);

  // ── Open detail dialog ─────────────────────────────────────────────────

  const openDetail = useCallback(async (row: any) => {
    setViewingResponse(row);
    setDetailOpen(true);
    setDetailAnswers([]);
    setDetailFeedback([]);
    setLoadingDetail(true);
    try {
      const detail = await getResponseDetail(row.id);
      setDetailAnswers(detail.answers);
      setDetailFeedback(detail.feedback);
    } catch (err) {
      console.error("Failed to load response detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setViewingResponse(null);
    setDetailAnswers([]);
    setDetailFeedback([]);
  }, []);

  // ── Grouped answers for detail dialog (from on-demand fetch) ─────────────

  const groupedAnswers = useMemo(() => {
    const groups: Record<string, DetailAnswer[]> = {};
    detailAnswers.forEach((ans) => {
      const sec = ans.question?.section;
      const cat = sec
        ? lang === "th"
          ? sec.title_th || sec.title_en
          : sec.title_en || sec.title_th
        : lang === "th" ? "อื่น ๆ" : "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ans);
    });
    return groups;
  }, [detailAnswers, lang]);

  // ── Export helpers ────────────────────────────────────────────────────────

  const currentFilters: ExportFilters = {
    surveyId: selectedSurvey,
    department: selectedDept,
    search,
  };

  const handleExcelExport = () => {
    exportToExcel(sortedAndFilteredResponses, surveys, allQuestions, currentFilters, lang as "en" | "th");
    toast.success(lang === "th" ? "ดาวน์โหลด Excel สำเร็จ" : "Excel file downloaded");
  };

  const handleCSVExport = () => {
    downloadCSV(sortedAndFilteredResponses, surveys, allQuestions, currentFilters, lang as "en" | "th");
    toast.success(lang === "th" ? "ดาวน์โหลด CSV สำเร็จ" : "CSV file downloaded");
  };

  const handleJSONExport = () => {
    downloadJSON(sortedAndFilteredResponses, surveys, allQuestions, currentFilters, lang as "en" | "th");
    toast.success(lang === "th" ? "ดาวน์โหลด JSON สำเร็จ" : "JSON file downloaded");
  };

  const handleGoogleSheets = () => {
    const url = exportToGoogleSheets(
      sortedAndFilteredResponses,
      surveys,
      allQuestions,
      currentFilters,
      lang as "en" | "th"
    );
    toast(
      lang === "th"
        ? "ดาวน์โหลด CSV แล้ว — เปิด Google Sheets และนำเข้าไฟล์"
        : "CSV downloaded — open Google Sheets and import the file",
      {
        action: {
          label: lang === "th" ? "เปิด Sheets" : "Open Sheets",
          onClick: () => window.open(url, "_blank"),
        },
        duration: 8000,
      }
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Loading Raw Intel…
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "th" ? "ข้อมูลดิบแบบสำรวจ" : "Survey Response Data"}
            </h1>
          </div>
          <p className="text-[15px] font-medium text-slate-400 ml-13">
            {lang === "th"
              ? "ข้อมูลดิบรายคนเพื่อการตรวจสอบความถูกต้อง"
              : "Detailed response-level data for cross-verification."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={loadData}
            className="rounded-xl h-11 px-5 border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider dark:bg-slate-900/50 dark:text-slate-300"
          >
            <Clock className="w-4 h-4 mr-2" />
            {lang === "th" ? "รีเฟรช" : "Refresh"}
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white rounded-xl h-11 px-5 shadow-lg shadow-slate-900/10 dark:shadow-primary/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <Download className="w-4 h-4" />
                {lang === "th" ? "ส่งออก" : "Export"}
                <ChevronRight className="w-3.5 h-3.5 rotate-90 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl shadow-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 p-1.5"
            >
              <DropdownMenuItem
                onClick={handleExcelExport}
                className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group"
              >
                <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">
                    Excel (.xlsx)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lang === "th" ? "4 แผ่น: สรุป, ข้อมูล, แผนก, คำถาม" : "4 sheets: Summary, Data, Dept, Questions"}
                  </div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleCSVExport}
                className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
              >
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">CSV</div>
                  <div className="text-[10px] text-slate-400">
                    {lang === "th" ? "แบบน้ำหนักเบา ใช้กับทุกโปรแกรม" : "Lightweight, universal"}
                  </div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleJSONExport}
                className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 group"
              >
                <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">JSON</div>
                  <div className="text-[10px] text-slate-400">
                    {lang === "th" ? "สำหรับนักพัฒนา" : "For developers"}
                  </div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

              <DropdownMenuItem
                onClick={handleGoogleSheets}
                className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 group"
              >
                <div className="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    Google Sheets
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lang === "th" ? "ดาวน์โหลด CSV แล้วเปิด Sheets" : "Download CSV + open Sheets"}
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Quick-stat strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: lang === "th" ? "รายการทั้งหมด" : "Total Responses",
            value: stats.total.toLocaleString(),
            icon: Database,
            color: "text-primary",
            bg: "bg-primary/5 dark:bg-primary/10",
          },
          {
            label: lang === "th" ? "หน่วยงาน" : "Departments",
            value: stats.uniqueDepts,
            icon: Building2,
            color: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-50 dark:bg-violet-900/20",
          },
          {
            label: lang === "th" ? "คะแนนเฉลี่ย" : "Avg Score",
            value: stats.avgScore,
            icon: TrendingUp,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: lang === "th" ? "ช่วงวันที่" : "Date Range",
            value: stats.dateRange,
            icon: Calendar,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            small: true,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3.5 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                s.bg,
                s.color
              )}
            >
              <s.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                {s.label}
              </div>
              <div
                className={cn(
                  "font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate",
                  s.small ? "text-[13px]" : "text-xl"
                )}
              >
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Card ── */}
      <Card className="rounded-3xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
        <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={
                  lang === "th" ? "ค้นหา ID หรือ หน่วยงาน…" : "Search ID or Department…"
                }
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-10 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Survey filter */}
            <Select value={selectedSurvey} onValueChange={(v) => { setSelectedSurvey(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[185px] h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white">
                <SelectValue placeholder="All Surveys" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl dark:bg-slate-900">
                <SelectItem value="all">{lang === "th" ? "ทุกแบบสำรวจ" : "All Surveys"}</SelectItem>
                {surveys.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {lang === "th" ? s.titleTh : s.titleEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dept filter */}
            <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[165px] h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white">
                <SelectValue placeholder="All Depts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl dark:bg-slate-900">
                <SelectItem value="all">{lang === "th" ? "ทุกหน่วยงาน" : "All Departments"}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Record count */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner">
              <Layers className="w-3.5 h-3.5" />
              {lang === "th" ? "รายการ" : "TOTAL"}: {sortedAndFilteredResponses.length}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("table")}
                className={cn(
                  "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all gap-1.5",
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <LayoutList className="w-3.5 h-3.5" />
                {lang === "th" ? "ตาราง" : "Table"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("sheet")}
                className={cn(
                  "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all gap-1.5",
                  viewMode === "sheet"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                Sheet
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Table View ── */}
          {viewMode === "table" && (
            <>
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
                  <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                    <TableHead
                      className="w-[120px] font-bold uppercase tracking-widest text-[10px] py-4 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => toggleSort("id")}
                    >
                      <div className="flex items-center gap-1">
                        ID {sortConfig.key === "id" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-bold uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                      onClick={() => toggleSort("survey")}
                    >
                      <div className="flex items-center gap-1">
                        {lang === "th" ? "แบบสำรวจ" : "Survey"}
                        {sortConfig.key === "survey" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-bold uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                      onClick={() => toggleSort("dept")}
                    >
                      <div className="flex items-center gap-1">
                        {lang === "th" ? "หน่วยงาน" : "Department"}
                        {sortConfig.key === "dept" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-bold uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                      onClick={() => toggleSort("completed_at")}
                    >
                      <div className="flex items-center gap-1">
                        {lang === "th" ? "วันที่" : "Date"}
                        {sortConfig.key === "completed_at" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">
                      {lang === "th" ? "การกระทำ" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResponses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <Database className="w-10 h-10" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {lang === "th" ? "ไม่พบข้อมูล" : "No matching records"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedResponses.map((r) => (
                      <TableRow
                        key={r.id}
                        className="group border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <TableCell className="font-mono text-[11px] font-medium text-slate-500">
                          {r.id.substring(0, 8)}…
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white text-sm">
                          {surveys.find((s) => s.id === r.survey_id)?.[lang === "th" ? "titleTh" : "titleEn"] ?? "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 rounded-lg px-2.5 py-0.5 text-[11px] font-bold"
                          >
                            {r.demographics?.department || r.demographics?.dept || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(r.completed_at).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                            onClick={() => openDetail(r)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {lang === "th" ? "แสดง" : "Showing"}{" "}
                  {Math.min(sortedAndFilteredResponses.length, (currentPage - 1) * pageSize + 1)}
                  {" – "}
                  {Math.min(sortedAndFilteredResponses.length, currentPage * pageSize)}
                  {" "}
                  {lang === "th" ? "จาก" : "of"} {sortedAndFilteredResponses.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg text-[10px] font-bold",
                            currentPage === pageNum
                              ? "bg-primary text-white"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && <span className="text-slate-400 px-1">…</span>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Sheet View ── */}
          {viewMode === "sheet" && (
            <SpreadsheetView
              responses={sortedAndFilteredResponses}
              surveys={surveys}
              questions={allQuestions}
              search={search}
              onRowClick={(r) => openDetail(r)}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 bg-slate-900 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Database className="w-24 h-24" />
            </div>
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-[0.3em]">
                  Full Intel Profile
                </span>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Response Details
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium text-[10px]">
                ID: {viewingResponse?.id}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Demographics strip */}
          <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-700 shrink-0">
            {[
              { label: lang === "th" ? "หน่วยงาน" : "Department", value: viewingResponse?.demographics?.department || viewingResponse?.demographics?.dept },
              { label: lang === "th" ? "สถานที่" : "Location", value: viewingResponse?.demographics?.location },
              { label: lang === "th" ? "วันที่ส่ง" : "Submission Date", value: viewingResponse?.completed_at ? new Date(viewingResponse.completed_at).toLocaleString() : "" },
            ].map((item, i) => (
              <div key={i} className={cn("p-3 flex flex-col gap-0.5", i < 2 && "border-r border-slate-100 dark:border-slate-700")}>
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.value || "N/A"}</span>
              </div>
            ))}
          </div>

          {/* Loading state */}
          {loadingDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "กำลังโหลดคำตอบ…" : "Loading answers…"}
              </p>
            </div>
          ) : detailAnswers.length === 0 && detailFeedback.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Database className="w-12 h-12 opacity-20" />
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">
                {lang === "th" ? "ไม่พบข้อมูลคำตอบ" : "No answer data found"}
              </p>
              <p className="text-xs text-slate-400 max-w-xs text-center opacity-60">
                {lang === "th"
                  ? "คำตอบอาจยังไม่ถูกบันทึก หรือไม่มีสิทธิ์เข้าถึงข้อมูล"
                  : "Answers may not have been saved, or insufficient permissions."}
              </p>
            </div>
          ) : (
            /* Tabbed answers */
            <div className="flex-1 flex flex-row min-h-0 bg-white dark:bg-slate-950">
              <Tabs
                defaultValue={Object.keys(groupedAnswers)[0] ?? (detailFeedback.length > 0 ? "__feedback__" : undefined)}
                className="flex-1 flex flex-row"
              >
                {/* Sidebar tabs */}
                <div className="w-[220px] border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-y-auto p-3">
                  <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                    {Object.keys(groupedAnswers).map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        className="w-full justify-start text-left rounded-xl text-[11px] font-bold px-3 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200 dark:data-[state=active]:ring-slate-700 transition-all border border-transparent whitespace-normal h-auto items-start"
                      >
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="opacity-40 text-[9px] leading-none">
                            {groupedAnswers[cat].length} {lang === "th" ? "คำถาม" : "questions"}
                          </span>
                          <span className="leading-tight">{cat}</span>
                        </div>
                      </TabsTrigger>
                    ))}
                    {detailFeedback.length > 0 && (
                      <TabsTrigger
                        value="__feedback__"
                        className="w-full justify-start text-left rounded-xl text-[11px] font-bold px-3 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-violet-500 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200 dark:data-[state=active]:ring-slate-700 transition-all border border-transparent"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="opacity-40 text-[9px] leading-none">{detailFeedback.length} items</span>
                          <span>{lang === "th" ? "ข้อเสนอแนะ" : "Open Feedback"}</span>
                        </div>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                {/* Answer content panels */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full px-7 py-6">
                    {Object.entries(groupedAnswers).map(([cat, answers]) => (
                      <TabsContent key={cat} value={cat} className="mt-0 space-y-5 pb-10">
                        <div className="mb-6 space-y-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{cat}</h3>
                          <div className="h-1 w-10 bg-primary rounded-full" />
                        </div>
                        {answers.map((ans, idx) => (
                          <AnswerCard key={ans.id ?? idx} ans={ans} lang={lang} />
                        ))}
                      </TabsContent>
                    ))}

                    {/* Feedback panel */}
                    {detailFeedback.length > 0 && (
                      <TabsContent value="__feedback__" className="mt-0 space-y-5 pb-10">
                        <div className="mb-6 space-y-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            {lang === "th" ? "ข้อเสนอแนะเพิ่มเติม" : "Open Feedback"}
                          </h3>
                          <div className="h-1 w-10 bg-violet-500 rounded-full" />
                        </div>
                        {detailFeedback.map((fb, idx) => (
                          <div key={fb.id ?? idx} className="relative pl-6 border-l-2 border-violet-100 dark:border-violet-900/40">
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-400 border-2 border-white dark:border-slate-950" />
                            <div className="space-y-2">
                              {fb.questions && (
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">
                                  {lang === "th" ? fb.questions.text_th : fb.questions.text_en}
                                </h4>
                              )}
                              <div className="px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/40 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                {fb.text_value || <span className="opacity-40 italic">—</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    )}
                  </ScrollArea>
                </div>
              </Tabs>
            </div>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {!loadingDetail && (
                <>{detailAnswers.length} {lang === "th" ? "คำตอบ" : "answers"}
                {detailFeedback.length > 0 && ` · ${detailFeedback.length} ${lang === "th" ? "ข้อเสนอแนะ" : "feedback"}`}</>
              )}
            </div>
            <Button
              variant="outline"
              onClick={closeDetail}
              className="h-9 px-8 rounded-xl font-bold uppercase tracking-wider text-[10px]"
            >
              {lang === "th" ? "ปิด" : "Close Intel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Answer Card sub-component ────────────────────────────────────────────────

function AnswerCard({ ans, lang }: { ans: DetailAnswer; lang: string }) {
  const qType = ans.question?.type ?? "";
  const questionText = ans.question
    ? lang === "th"
      ? ans.question.text_th || ans.question.text_en
      : ans.question.text_en || ans.question.text_th
    : null;

  const hasNumeric = ans.numeric_value !== null && ans.numeric_value !== undefined;
  const hasText = ans.text_value !== null && ans.text_value !== undefined && String(ans.text_value).trim() !== "";
  const hasArray = Array.isArray(ans.array_text_value) && ans.array_text_value.length > 0;
  const hasJsonb = ans.jsonb_value !== null && typeof ans.jsonb_value === "object" && Object.keys(ans.jsonb_value).length > 0;

  const dotColor = hasNumeric
    ? ans.numeric_value! >= 4
      ? "bg-emerald-500"
      : ans.numeric_value! <= 2
      ? "bg-rose-500"
      : "bg-amber-400"
    : hasText || hasArray || hasJsonb
    ? "bg-blue-400"
    : "bg-slate-300";

  return (
    <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 group">
      <div
        className={cn(
          "absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 shadow-sm transition-transform group-hover:scale-125",
          dotColor
        )}
      />
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
          {questionText ?? (
            <span className="opacity-40 font-mono text-xs">question_id: {ans.question?.id ?? "unknown"}</span>
          )}
        </h4>

        <div className="flex flex-wrap items-start gap-2">
          {/* Numeric (rating / NPS / binary / constant_sum) */}
          {hasNumeric && (
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "h-7 px-3 rounded-lg font-bold text-xs shadow-sm",
                  ans.numeric_value! >= 5
                    ? "bg-emerald-500 text-white"
                    : ans.numeric_value! >= 4
                    ? "bg-emerald-400 text-white"
                    : ans.numeric_value! >= 3
                    ? "bg-amber-400 text-white"
                    : ans.numeric_value! >= 2
                    ? "bg-rose-400 text-white"
                    : "bg-rose-600 text-white"
                )}
              >
                {["rating", "nps"].includes(qType) ? "Score" : "Value"}: {ans.numeric_value}
              </Badge>
              {["rating", "nps"].includes(qType) && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-4 h-4 rounded-sm",
                        i < (ans.numeric_value ?? 0)
                          ? "bg-primary"
                          : "bg-slate-100 dark:bg-slate-800"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text value */}
          {hasText && (
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg italic">
              &ldquo;{ans.text_value}&rdquo;
            </div>
          )}

          {/* Array (multiple_select / ranking) */}
          {hasArray && (
            <div className="flex flex-wrap gap-1.5">
              {ans.array_text_value!.map((val, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="rounded-lg text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                >
                  {qType === "ranking" && <span className="font-black mr-1 text-blue-400">#{i + 1}</span>}
                  {val}
                </Badge>
              ))}
            </div>
          )}

          {/* JSONB (matrix / constant_sum) */}
          {hasJsonb && (
            <div className="w-full rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden text-xs">
              {Object.entries(ans.jsonb_value!).map(([k, v], i) => (
                <div
                  key={k}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2",
                    i % 2 === 0
                      ? "bg-slate-50 dark:bg-slate-800/50"
                      : "bg-white dark:bg-slate-900"
                  )}
                >
                  <span className="font-medium text-slate-500 dark:text-slate-400 min-w-[120px] truncate">{k}</span>
                  <span className="font-bold text-slate-800 dark:text-white">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* No answer */}
          {!hasNumeric && !hasText && !hasArray && !hasJsonb && (
            <span className="text-xs text-slate-300 dark:text-slate-600 italic">
              {lang === "th" ? "ไม่มีคำตอบ" : "No answer"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
