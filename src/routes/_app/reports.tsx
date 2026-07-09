import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText, FileBarChart, Download, Search, Filter, Calendar, Clock, Lock,
  ArrowRight, Sparkles, Database, ShieldCheck, ChevronRight, Share2, Printer,
  Layers, Binary, Terminal, Info, Zap, BarChart3, TrendingUp, Users, Target,
  Activity, FileSpreadsheet, FileJson, ExternalLink, HelpCircle, AlertTriangle, ListChecks, Grid3x3, LayoutList, ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";

// Recharts imports
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

// API services
import {
  getSurveys,
  getSurveyResponses,
  getSurveySections,
  type MockSurvey,
} from "@/services/api";
import {
  getEngagementTrend,
  getCategoryScores,
  getEngagementByDept,
  getResponseDistribution,
  type EngagementTrend,
  type CategoryScore,
  type EngagementByDept,
  type ResponseDistribution,
} from "@/services/api/analytics";
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

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

type PageMode = "dashboard" | "sheet" | "table";

function ReportsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Route protection
  useEffect(() => {
    if (user && user.role === "employee") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  // Master lists
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("all");
  const [questions, setQuestions] = useState<ExportQuestion[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  // Filters & Page options
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [pageMode, setPageMode] = useState<PageMode>("dashboard");
  const [loading, setLoading] = useState(true);

  // Analytics data
  const [trendData, setTrendData] = useState<EngagementTrend[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [engagementByDept, setEngagementByDept] = useState<EngagementByDept[]>([]);
  const [distribution, setDistribution] = useState<ResponseDistribution[]>([]);

  // Raw data page state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "completed_at",
    direction: "desc",
  });

  // Response detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailAnswers, setDetailAnswers] = useState<DetailAnswer[]>([]);
  const [detailFeedback, setDetailFeedback] = useState<DetailFeedback[]>([]);

  // ── Initial Fetching ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const surveysRes = await getSurveys();
        setSurveys(surveysRes);
        if (surveysRes.length > 0) {
          // Default to first active survey or "all"
          setSelectedSurveyId("all");
        }
      } catch (err) {
        toast.error(lang === "th" ? "โหลดข้อมูลแบบสำรวจไม่สำเร็จ" : "Failed to load surveys");
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [lang]);

  // ── Dynamic loading depending on selectedSurveyId ───────────────────────────
  const fetchSurveyDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch raw responses and analytical stats in parallel
      const [responsesRes, trendRes, categoryRes, deptRes, distRes] = await Promise.all([
        getSurveyResponses(selectedSurveyId),
        getEngagementTrend(selectedSurveyId, "all", "all"),
        getCategoryScores(selectedSurveyId, "all", "all"),
        getEngagementByDept(selectedSurveyId, "all"),
        getResponseDistribution(selectedSurveyId, "all", "all"),
      ]);

      setResponses(responsesRes);
      setTrendData(trendRes);
      setCategoryScores(categoryRes);
      setEngagementByDept(deptRes);
      setDistribution(distRes);

      // 2. Fetch specific questions metadata for columns mapping
      let allSecs: any[] = [];
      if (selectedSurveyId === "all") {
        const sectionsPromises = surveys.map((s) => getSurveySections(s.id));
        allSecs = (await Promise.all(sectionsPromises)).flat();
      } else {
        allSecs = await getSurveySections(selectedSurveyId);
      }

      const questionsMap: ExportQuestion[] = [];
      allSecs.forEach((sec) => {
        sec.questions?.forEach((q: any) => {
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
      setQuestions(questionsMap);
    } catch (err) {
      console.error(err);
      toast.error(lang === "th" ? "เกิดข้อผิดพลาดในการดึงข้อมูล" : "Error fetching details");
    } finally {
      setLoading(false);
    }
  }, [selectedSurveyId, surveys, lang]);

  useEffect(() => {
    if (surveys.length > 0) {
      fetchSurveyDetails();
    }
  }, [selectedSurveyId, surveys, fetchSurveyDetails]);

  // ── Departments list derived from responses ───────────────────────────────
  const departments = useMemo(() => {
    const depts = new Set<string>();
    responses.forEach((r) => {
      const dept = r.demographics?.department || r.demographics?.dept;
      if (dept) depts.add(dept);
    });
    return Array.from(depts).sort();
  }, [responses]);

  // ── Selected Survey Info ───────────────────────────────────────────────────
  const activeSurvey = useMemo(() => {
    return surveys.find((s) => s.id === selectedSurveyId);
  }, [surveys, selectedSurveyId]);

  const activeSurveyTitle = useMemo(() => {
    if (selectedSurveyId === "all") return lang === "th" ? "แคมเปญแบบสำรวจทั้งหมด" : "All Survey Campaigns";
    return activeSurvey ? (lang === "th" ? activeSurvey.titleTh : activeSurvey.titleEn) : "";
  }, [selectedSurveyId, activeSurvey, lang]);

  const targetResponses = useMemo(() => {
    if (selectedSurveyId === "all") {
      return surveys.reduce((sum, s) => sum + (s.target || 0), 0) || 100;
    }
    return activeSurvey?.target || 100;
  }, [selectedSurveyId, surveys, activeSurvey]);

  // ── Calculation of strategic metrics ───────────────────────────────────────
  const metrics = useMemo(() => {
    const totalCount = responses.length;
    let sum = 0;
    let numericCount = 0;

    responses.forEach((r) => {
      r.response_answers?.forEach((a: any) => {
        if (a.numeric_value !== null && a.numeric_value !== undefined) {
          sum += Number(a.numeric_value);
          numericCount += 1;
        }
      });
    });

    const avgScore = numericCount > 0 ? Number((sum / numericCount).toFixed(2)) : 0;
    const participationRate = targetResponses > 0 ? Math.round((totalCount / targetResponses) * 100) : 0;

    return {
      totalCount,
      avgScore,
      participationRate,
    };
  }, [responses, targetResponses]);

  // ── Filtering & Sorting of Raw Responses ───────────────────────────────────
  const filteredResponses = useMemo(() => {
    let result = responses.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.demographics?.department || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const dept = r.demographics?.department || r.demographics?.dept;
      const matchesDept = filterDept === "all" || dept === filterDept;

      return matchesSearch && matchesDept;
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
  }, [responses, searchQuery, filterDept, sortConfig, surveys]);

  const paginatedResponses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResponses.slice(start, start + pageSize);
  }, [filteredResponses, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredResponses.length / pageSize);

  const toggleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  // ── Open response detail modal ─────────────────────────────────────────────
  const handleOpenDetail = useCallback(async (row: any) => {
    setSelectedResponse(row);
    setDetailOpen(true);
    setDetailAnswers([]);
    setDetailFeedback([]);
    setLoadingDetail(true);
    try {
      const detail = await getResponseDetail(row.id);
      setDetailAnswers(detail.answers);
      setDetailFeedback(detail.feedback);
    } catch (err) {
      console.error(err);
      toast.error(lang === "th" ? "โหลดข้อมูลส่วนบุคคลไม่สำเร็จ" : "Failed to load detail");
    } finally {
      setLoadingDetail(false);
    }
  }, [lang]);

  const groupedDetailAnswers = useMemo(() => {
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

  // ── Exports logic ──────────────────────────────────────────────────────────
  const currentFilters: ExportFilters = {
    surveyId: selectedSurveyId,
    department: filterDept,
    search: searchQuery,
  };

  const handleExcelExport = () => {
    exportToExcel(filteredResponses, surveys, questions, currentFilters, lang as "en" | "th");
    toast.success(lang === "th" ? "ดาวน์โหลดไฟล์รายงาน Excel สำเร็จ" : "Report package downloaded in Excel format");
  };

  const handleCSVExport = () => {
    downloadCSV(filteredResponses, surveys, questions, currentFilters, lang as "en" | "th");
    toast.success(lang === "th" ? "ดาวน์โหลดไฟล์ CSV สำเร็จ" : "Raw data downloaded in CSV format");
  };

  const handleJSONExport = () => {
    downloadJSON(filteredResponses, surveys, questions, currentFilters, lang as "en" | "th");
    toast.success(lang === "th" ? "ดาวน์โหลดไฟล์ JSON สำเร็จ" : "Raw data exported as JSON");
  };

  if (!user || user.role === "employee") return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === "th" ? "ผลการตอบแบบสำรวจ" : "Survey Results"}
          </h1>
          <p className="text-[15px] font-medium text-slate-400">
            {lang === "th"
              ? "เลือกแบบสำรวจที่ต้องการเพื่อดูผลการวิเคราะห์ สถิติเชิงภาพ หรือตรวจสอบและดาวน์โหลดตารางข้อมูลดิบ"
              : "Select a survey topic to view visual analytics, explore raw data spreadsheets, or export report packages."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 font-bold text-xs gap-2.5 shadow-sm uppercase tracking-wider"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            {lang === "th" ? "พิมพ์รายงาน (PDF)" : "Print PDF"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 px-4 rounded-xl bg-slate-900 dark:bg-primary text-white hover:bg-slate-850 dark:hover:bg-primary/95 font-bold text-xs uppercase tracking-wider gap-2 shadow-md">
                <Download className="w-4 h-4" />
                {lang === "th" ? "ดาวน์โหลดรายงาน" : "Download Package"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-2xl">
              <DropdownMenuItem onClick={handleExcelExport} className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">Excel Report</div>
                  <div className="text-[9px] text-slate-400">Complete multi-sheet dossier</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCSVExport} className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">CSV Data</div>
                  <div className="text-[9px] text-slate-400">Raw response rows only</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleJSONExport} className="flex items-center gap-3 rounded-lg h-10 px-3 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20">
                <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">JSON Data</div>
                  <div className="text-[9px] text-slate-400">For programmatic systems</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Main Layout with Survey Segmentation Sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* 1. Left Sidebar: Survey List / Segmentation */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {lang === "th" ? "เลือกแคมเปญแบบสำรวจ" : "Survey Topics"}
              </h3>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => setSelectedSurveyId("all")}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between",
                  selectedSurveyId === "all"
                    ? "bg-slate-900 dark:bg-primary text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>{lang === "th" ? "แคมเปญทั้งหมด" : "All Campaigns"}</span>
                </div>
                <Badge variant="outline" className={cn("text-[9px]", selectedSurveyId === "all" ? "border-white/20 text-white" : "text-slate-400")}>
                  {surveys.length}
                </Badge>
              </button>

              <Separator className="my-2 bg-slate-100 dark:bg-slate-800" />

              {surveys.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSurveyId(s.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl transition-all space-y-1",
                    selectedSurveyId === s.id
                      ? "bg-slate-900 dark:bg-primary text-white shadow-md"
                      : "text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-[13px] tracking-tight leading-tight line-clamp-1">
                      {lang === "th" ? s.titleTh : s.titleEn}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] uppercase tracking-wider px-1.5 py-0 shrink-0",
                        s.status === "Active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        s.status === "Closed" ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" :
                        s.status === "Archived" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                        "bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] opacity-75">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{s.startDate} - {s.endDate}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* 2. Right Pane: Detailed Metrics & Reports Visuals */}
        <div className="xl:col-span-3 space-y-6">

          {/* Survey Title Bar */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                {lang === "th" ? "กำลังเลือกดูแบบสำรวจ" : "Active Focus Topic"}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeSurveyTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-xs font-bold capitalize">
                Type: {activeSurvey?.surveyType || "identified"}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs font-bold">
                {lang === "th" ? "กลุ่มเป้าหมาย" : "Target"}: {targetResponses}
              </Badge>
            </div>
          </div>

          {/* ── Key Metrics Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: lang === "th" ? "การมีส่วนร่วมของพนักงาน" : "Participation Rate",
                value: `${metrics.participationRate}%`,
                desc: `${metrics.totalCount} / ${targetResponses} responses`,
                icon: Users,
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-950/20",
              },
              {
                label: lang === "th" ? "คะแนนความผูกพันเฉลี่ย" : "Avg Engagement Score",
                value: `${metrics.avgScore} / 5.00`,
                desc: "Calculated across rating answers",
                icon: TrendingUp,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
              },
              {
                label: lang === "th" ? "จำนวนการส่งทั้งหมด" : "Total Responses",
                value: metrics.totalCount.toLocaleString(),
                desc: "Strictly bound to database records",
                icon: Database,
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-900/20",
              },
            ].map((card) => (
              <div key={card.label} className="p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm", card.bg, card.color)}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 leading-none">{card.value}</p>
                  <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 mt-2">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Main Panel Tabs ── */}
          <Tabs value={pageMode} onValueChange={(val) => setPageMode(val as PageMode)} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
              <TabsList className="bg-white/50 dark:bg-slate-800/50 h-10 p-1 rounded-lg border border-slate-200 dark:border-slate-700 gap-1">
                <TabsTrigger value="dashboard" className="h-8 px-4 rounded-md font-bold uppercase tracking-wider text-[10px] gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {lang === "th" ? "ผลการวิเคราะห์ (Dashboard)" : "Analytics Dashboard"}
                </TabsTrigger>
                <TabsTrigger value="sheet" className="h-8 px-4 rounded-md font-bold uppercase tracking-wider text-[10px] gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  {lang === "th" ? "หน้าตาราง (Spreadsheet)" : "Spreadsheet View"}
                </TabsTrigger>
                <TabsTrigger value="table" className="h-8 px-4 rounded-md font-bold uppercase tracking-wider text-[10px] gap-2">
                  <LayoutList className="w-4 h-4" />
                  {lang === "th" ? "หน้าข้อมูลดิบ (Table)" : "Row Data Table"}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500 text-white font-bold gap-1 text-[9px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Data Integrity Verified
                </Badge>
              </div>
            </div>

            {/* A. Analytics Dashboard */}
            <TabsContent value="dashboard" className="space-y-6 outline-none">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900/30 rounded-2xl border">
                  <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Analytics Dashboard…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* 1. Category Engagement Scores */}
                  <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-500" />
                        {lang === "th" ? "คะแนนความผูกพันแยกตามหมวดหมู่" : "Category Dimension Scores"}
                      </CardTitle>
                      <CardDescription>Dimension evaluation across survey questions</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                      {categoryScores.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryScores}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} />
                            <Radar name="Engagement Score" dataKey="score" stroke="#0f172a" fill="#3b82f6" fillOpacity={0.4} />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400 italic">
                          No category metrics available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 2. Department Breakdown */}
                  <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-500" />
                        {lang === "th" ? "คะแนนเฉลี่ยรายฝ่าย" : "Department Engagement Scores"}
                      </CardTitle>
                      <CardDescription>Average score comparison across departments</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                      {engagementByDept.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={engagementByDept} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 5]} />
                            <YAxis type="category" dataKey="dept" width={100} tick={{ fontSize: 11, fontWeight: "bold" }} />
                            <Tooltip />
                            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                              {engagementByDept.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0f172a" : "#3b82f6"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400 italic">
                          No departmental breakdown metrics
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 3. Engagement Score Trend */}
                  <Card className="md:col-span-2 rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        {lang === "th" ? "แนวโน้มคะแนนความผูกพัน" : "Engagement Score Trend"}
                      </CardTitle>
                      <CardDescription>Chronological trend projection of submissions</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[240px]">
                      {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" tick={{ fontSize: 10, fontWeight: "bold" }} />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400 italic">
                          No trend line dataset available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* B. Google Sheets Spreadsheet View */}
            <TabsContent value="sheet" className="outline-none">
              <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
                <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/10">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "ตารางกริดข้อมูลแบบ Google Sheets" : "Interactive Spreadsheet Grid"}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Click on any row to drill down into the response metrics</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={lang === "th" ? "ค้นหาข้อมูลในตาราง…" : "Search grid cells…"}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-56 h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="relative h-[550px] overflow-hidden">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50">
                      <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                    </div>
                  ) : (
                    <SpreadsheetView
                      responses={filteredResponses}
                      surveys={surveys}
                      questions={questions}
                      search={searchQuery}
                      onRowClick={handleOpenDetail}
                    />
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* C. Traditional Paginated Data Table */}
            <TabsContent value="table" className="space-y-4 outline-none">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                    <Input
                      placeholder={lang === "th" ? "ค้นหารหัสตอบกลับ..." : "Search responses ID..."}
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="h-9 pl-9 rounded-lg"
                    />
                  </div>
                  <Select value={filterDept} onValueChange={(val) => { setFilterDept(val); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[180px] h-9 rounded-lg">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{lang === "th" ? "ทุกฝ่าย" : "All Departments"}</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs font-bold text-slate-400">
                  {lang === "th" ? "พบข้อมูล" : "FOUND"}: {filteredResponses.length} {lang === "th" ? "รายการ" : "records"}
                </div>
              </div>

              <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/30">
                      <TableRow>
                        <TableHead onClick={() => toggleSort("id")} className="cursor-pointer font-bold select-none h-11 text-xs">
                          Response ID <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-70" />
                        </TableHead>
                        <TableHead onClick={() => toggleSort("survey")} className="cursor-pointer font-bold select-none h-11 text-xs">
                          {lang === "th" ? "แบบสำรวจ" : "Survey"} <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-70" />
                        </TableHead>
                        <TableHead onClick={() => toggleSort("dept")} className="cursor-pointer font-bold select-none h-11 text-xs">
                          {lang === "th" ? "ฝ่าย" : "Department"} <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-70" />
                        </TableHead>
                        <TableHead onClick={() => toggleSort("completed_at")} className="cursor-pointer font-bold select-none h-11 text-xs">
                          {lang === "th" ? "วันที่เสร็จสิ้น" : "Completed At"} <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-70" />
                        </TableHead>
                        <TableHead className="font-bold h-11 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-40 text-center">
                            <div className="w-7 h-7 rounded-full border-2 border-slate-100 border-t-primary animate-spin mx-auto mb-2" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verifying D1 data…</span>
                          </TableCell>
                        </TableRow>
                      ) : paginatedResponses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                            No records found matching filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedResponses.map((row) => {
                          const survey = surveys.find((s) => s.id === row.survey_id);
                          return (
                            <TableRow key={row.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/40">
                              <TableCell className="font-mono font-bold text-xs max-w-[140px] truncate">
                                {row.id}
                              </TableCell>
                              <TableCell className="font-medium text-xs max-w-[200px] truncate">
                                {lang === "th" ? (survey?.titleTh ?? "—") : (survey?.titleEn ?? "—")}
                              </TableCell>
                              <TableCell className="font-semibold text-xs">
                                {row.demographics?.department || row.demographics?.dept || "N/A"}
                              </TableCell>
                              <TableCell className="text-xs text-slate-450 dark:text-slate-400 font-medium">
                                {row.completed_at ? new Date(row.completed_at).toLocaleString() : "N/A"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(row)}
                                  className="h-8 rounded-lg text-xs font-bold gap-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5 text-primary" />
                                  {lang === "th" ? "รายละเอียด" : "Drill Down"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/10">
                    <div className="text-xs font-medium text-slate-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 rounded-lg"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 rounded-lg"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Drill-down Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl rounded-2xl dark:bg-slate-900">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-5.5 h-5.5 text-emerald-500" />
              {lang === "th" ? "รายละเอียดการตอบแบบสำรวจ" : "Individual Submission Dossier"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Response ID: {selectedResponse?.id}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-9 h-9 rounded-full border-3 border-slate-100 border-t-primary animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling details…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-h-[70vh] overflow-y-auto pr-1">

              {/* Left Column: Demographics */}
              <div className="md:col-span-1 space-y-4">
                <Card className="rounded-xl border border-slate-150 p-4 space-y-3 dark:bg-slate-950/20">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    {lang === "th" ? "ข้อมูลผู้ตอบ (Demographics)" : "Demographics"}
                  </h4>
                  <Separator />
                  <div className="space-y-3">
                    {[
                      { label: "Department", value: selectedResponse?.demographics?.department || selectedResponse?.demographics?.dept },
                      { label: "Business Unit", value: selectedResponse?.demographics?.businessUnit || selectedResponse?.demographics?.business_unit },
                      { label: "Level", value: selectedResponse?.demographics?.level },
                      { label: "Location", value: selectedResponse?.demographics?.location },
                      { label: "Gender", value: selectedResponse?.demographics?.gender },
                      { label: "Age range", value: selectedResponse?.demographics?.ageRange || selectedResponse?.demographics?.age_range },
                      { label: "Tenure", value: selectedResponse?.demographics?.tenure },
                    ].map((d) => (
                      <div key={d.label} className="space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.label}</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{d.value || "—"}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Metadata */}
                <Card className="rounded-xl border border-slate-150 p-4 space-y-2.5 dark:bg-slate-950/20 text-xs">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submission Metadata</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Completed At</span>
                    <span className="font-semibold">{selectedResponse?.completed_at ? new Date(selectedResponse.completed_at).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time spent</span>
                    <span className="font-semibold">{selectedResponse?.time_spent_seconds ?? "—"} seconds</span>
                  </div>
                </Card>
              </div>

              {/* Right Column: Answers list */}
              <div className="md:col-span-2 space-y-4">
                <ScrollArea className="h-[480px] pr-2">
                  <div className="space-y-5">
                    {Object.entries(groupedDetailAnswers).map(([category, answers]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">
                          {category}
                        </h4>
                        <div className="space-y-2.5">
                          {answers.map((ans) => {
                            const isNumeric = ans.numeric_value !== null && ans.numeric_value !== undefined;
                            return (
                              <div key={ans.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-350 leading-tight">
                                  {lang === "th" ? ans.question?.text_th : ans.question?.text_en}
                                </p>
                                <div className="flex items-center gap-3">
                                  {isNumeric ? (
                                    <div className="flex items-center gap-1.5">
                                      <Badge className="bg-primary hover:bg-primary font-bold text-xs h-6 px-2.5">
                                        Score: {ans.numeric_value}
                                      </Badge>
                                      <span className="text-xs text-slate-400 font-semibold">
                                        (out of 5)
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-950 px-2 py-1 rounded border dark:border-slate-800">
                                      Answer: {ans.text_value || ans.array_text_value?.join(", ") || (ans.jsonb_value ? JSON.stringify(ans.jsonb_value) : "—")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Feedback section */}
                    {detailFeedback.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 border-l-4 border-amber-500 pl-3">
                          {lang === "th" ? "ความคิดเห็นและข้อเสนอแนะ" : "Written Comments"}
                        </h4>
                        <div className="space-y-2">
                          {detailFeedback.map((f) => (
                            <div key={f.id} className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-xs leading-relaxed space-y-1">
                              <p className="font-bold text-slate-500 dark:text-slate-400">
                                Question: {lang === "th" ? f.questions?.text_en : f.questions?.text_th}
                              </p>
                              <p className="font-semibold text-slate-800 dark:text-slate-200 italic">
                                "{f.text_value}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default ReportsPage;
