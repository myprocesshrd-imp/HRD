import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Users, BarChart3, TrendingUp, Calendar,
  ArrowRight, MessageSquare,
  Activity, Target, Shield,
  Compass, Database, Terminal,
  Star, Filter,
  Heart, AlertTriangle, CheckCircle2,
  Award, ArrowUpRight, ArrowDownRight, RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getSurveys, type MockSurvey } from "@/services/api/surveys";
import { getDepartments } from "@/services/api/departments";
import { getBusinessUnits } from "@/services/api/business-units";
import { getDemographicOptions, type DemographicOption } from "@/services/api/demographic-options";
import { supabaseAdmin } from "@/lib/supabase";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

// ── Types ──────────────────────────────────────────────────────────────────
interface SectionStat {
  sectionId: string;
  sectionCode: string;
  titleEn: string;
  titleTh: string;
  score: number;
  count: number;
}

interface DemographicStat {
  label: string;
  score: number;
  count: number;
}

// radar data: { dimension: string, [group]: score, ... }
type DimensionByGroupRow = Record<string, string | number>;

interface DashboardData {
  totalResponses: number;
  totalTarget: number;
  participationRate: number;
  overallScore: number;
  sectionStats: SectionStat[];
  ageStats: DemographicStat[];
  levelStats: DemographicStat[];
  trendData: { date: string; score: number }[];
  /** Radar data: each row = one section, columns = age groups */
  ageSectionRadar: DimensionByGroupRow[];
  ageSectionGroups: string[];
  /** Radar data: each row = one section, columns = job levels */
  levelSectionRadar: DimensionByGroupRow[];
  levelSectionGroups: string[];
}

// ── Helper: fetch full analytics from Supabase in one go ──────────────────
async function fetchAnalyticsData(filters: {
  surveyId: string;
  dept: string;
  bu: string;
  ageRange: string;
  tenure: string;
  gender: string;
  location: string;
  startDate: string;
  endDate: string;
}): Promise<{
  responses: any[];
  answers: any[];
}> {
  // Build survey_responses query
  let respQuery = supabaseAdmin
    .from("survey_responses")
    .select(`
      id,
      survey_id,
      created_at,
      demographics,
      response_answers(
        numeric_value,
        questions(
          id,
          section_id,
          sections(id, code, title_en, title_th)
        )
      )
    `)
    .eq("status", "completed");

  if (filters.surveyId !== "all") respQuery = respQuery.eq("survey_id", filters.surveyId);
  if (filters.dept !== "all") respQuery = respQuery.eq("demographics->>department", filters.dept);
  if (filters.bu !== "all") respQuery = respQuery.eq("demographics->>businessUnit", filters.bu);
  if (filters.ageRange !== "all") respQuery = respQuery.eq("demographics->>ageRange", filters.ageRange);
  if (filters.tenure !== "all") respQuery = respQuery.eq("demographics->>tenure", filters.tenure);
  if (filters.gender !== "all") respQuery = respQuery.eq("demographics->>gender", filters.gender);
  if (filters.location !== "all") respQuery = respQuery.eq("demographics->>location", filters.location);
  if (filters.startDate) respQuery = respQuery.gte("created_at", filters.startDate);
  if (filters.endDate) respQuery = respQuery.lte("created_at", filters.endDate + "T23:59:59");

  const { data: responses, error } = await respQuery;
  if (error) {
    console.error("Dashboard fetch error:", error);
    return { responses: [], answers: [] };
  }
  return { responses: responses || [], answers: [] };
}

// ── Compute analytics from raw responses ──────────────────────────────────
function computeStats(
  responses: any[],
  totalTarget: number
): DashboardData {
  const sectionMap: Record<string, { titleEn: string; titleTh: string; code: string; sum: number; count: number }> = {};
  const ageMap: Record<string, { sum: number; count: number }> = {};
  const levelMap: Record<string, { sum: number; count: number }> = {};
  const dayMap: Record<string, { sum: number; count: number }> = {};

  // Section × Age group breakdown
  const ageSectionMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  // Section × Level breakdown
  const levelSectionMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  // section metadata for radar labels
  const sectionMeta: Record<string, { titleEn: string; titleTh: string }> = {};

  let globalSum = 0;
  let globalCount = 0;

  for (const resp of responses) {
    const answers: any[] = resp.response_answers || [];
    let respSum = 0;
    let respCount = 0;

    for (const ans of answers) {
      if (ans.numeric_value === null || ans.numeric_value === undefined) continue;
      const val = Number(ans.numeric_value);
      const q = ans.questions;
      if (!q) continue;
      const sec = q.sections;
      if (!sec) continue;

      const sid = sec.id;
      if (!sectionMap[sid]) {
        sectionMap[sid] = {
          titleEn: sec.title_en || sec.code,
          titleTh: sec.title_th || sec.code,
          code: sec.code,
          sum: 0,
          count: 0
        };
      }
      sectionMap[sid].sum += val;
      sectionMap[sid].count += 1;
      sectionMeta[sid] = { titleEn: sec.title_en || sec.code, titleTh: sec.title_th || sec.code };

      globalSum += val;
      globalCount += 1;
      respSum += val;
      respCount += 1;

      // Section × demographic breakdown
      if (resp.demographics) {
        const dem = resp.demographics as Record<string, string>;
        const age = dem.ageRange;
        const lvl = dem.level;

        if (age) {
          if (!ageSectionMap[sid]) ageSectionMap[sid] = {};
          if (!ageSectionMap[sid][age]) ageSectionMap[sid][age] = { sum: 0, count: 0 };
          ageSectionMap[sid][age].sum += val;
          ageSectionMap[sid][age].count += 1;
        }
        if (lvl) {
          if (!levelSectionMap[sid]) levelSectionMap[sid] = {};
          if (!levelSectionMap[sid][lvl]) levelSectionMap[sid][lvl] = { sum: 0, count: 0 };
          levelSectionMap[sid][lvl].sum += val;
          levelSectionMap[sid][lvl].count += 1;
        }
      }
    }

    // Per-response score for demographic breakdown
    const rScore = respCount > 0 ? respSum / respCount : 0;
    if (rScore > 0 && resp.demographics) {
      const dem = resp.demographics as Record<string, string>;

      // Age breakdown
      const age = dem.ageRange;
      if (age) {
        if (!ageMap[age]) ageMap[age] = { sum: 0, count: 0 };
        ageMap[age].sum += rScore;
        ageMap[age].count += 1;
      }

      // Level breakdown
      const lvl = dem.level;
      if (lvl) {
        if (!levelMap[lvl]) levelMap[lvl] = { sum: 0, count: 0 };
        levelMap[lvl].sum += rScore;
        levelMap[lvl].count += 1;
      }

      // Trend breakdown
      const day = (resp.created_at || "").split("T")[0];
      if (day) {
        if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
        dayMap[day].sum += rScore;
        dayMap[day].count += 1;
      }
    }
  }

  const overallScore = globalCount > 0 ? Number((globalSum / globalCount).toFixed(2)) : 0;
  const participationRate = totalTarget > 0
    ? Math.min(100, Math.round((responses.length / totalTarget) * 100))
    : responses.length > 0 ? 100 : 0;

  // Section stats sorted by score desc (exclude "comment/feedback" sections)
  const sectionStats: SectionStat[] = Object.entries(sectionMap)
    .map(([id, s]) => ({
      sectionId: id,
      sectionCode: s.code,
      titleEn: s.titleEn,
      titleTh: s.titleTh,
      score: Number((s.sum / s.count).toFixed(2)),
      count: s.count
    }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.score - a.score);

  const ageStats: DemographicStat[] = Object.entries(ageMap)
    .map(([label, s]) => ({
      label,
      score: Number((s.sum / s.count).toFixed(2)),
      count: s.count
    }))
    .sort((a, b) => b.score - a.score);

  const levelStats: DemographicStat[] = Object.entries(levelMap)
    .map(([label, s]) => ({
      label,
      score: Number((s.sum / s.count).toFixed(2)),
      count: s.count
    }))
    .sort((a, b) => b.score - a.score);

  const trendData = Object.entries(dayMap)
    .map(([date, s]) => ({ date, score: Number((s.sum / s.count).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build radar data: section × age
  const ageSectionGroups = Array.from(
    new Set(Object.values(ageSectionMap).flatMap(g => Object.keys(g)))
  ).sort();
  const ageSectionRadar: DimensionByGroupRow[] = sectionStats.map(sec => {
    const row: DimensionByGroupRow = {
      dimension: sec.titleEn,
      dimensionTh: sec.titleTh
    };
    for (const grp of ageSectionGroups) {
      const g = ageSectionMap[sec.sectionId]?.[grp];
      row[grp] = g ? Number((g.sum / g.count).toFixed(2)) : 0;
    }
    return row;
  });

  // Build radar data: section × level
  const levelSectionGroups = Array.from(
    new Set(Object.values(levelSectionMap).flatMap(g => Object.keys(g)))
  ).sort();
  const levelSectionRadar: DimensionByGroupRow[] = sectionStats.map(sec => {
    const row: DimensionByGroupRow = {
      dimension: sec.titleEn,
      dimensionTh: sec.titleTh
    };
    for (const grp of levelSectionGroups) {
      const g = levelSectionMap[sec.sectionId]?.[grp];
      row[grp] = g ? Number((g.sum / g.count).toFixed(2)) : 0;
    }
    return row;
  });

  return {
    totalResponses: responses.length,
    totalTarget,
    participationRate,
    overallScore,
    sectionStats,
    ageStats,
    levelStats,
    trendData,
    ageSectionRadar,
    ageSectionGroups,
    levelSectionRadar,
    levelSectionGroups,
  };
}

// ── Employee dashboard (simple) ────────────────────────────────────────────
function EmployeeDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstActiveSurveyId, setFirstActiveSurveyId] = useState<string | null>(null);

  useEffect(() => {
    getSurveys().then((data) => {
      const active = data.filter((s) => s.status === "Active");
      if (active.length > 0) {
        setFirstActiveSurveyId(active[0].id);
      }
    });
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <div className="flex items-start justify-between gap-6 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Star className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "th" ? `ยินดีต้อนรับ, ${user?.nameTh}` : `Welcome back, ${user?.nameEn}`}
            </h1>
          </div>
          <p className="text-[15px] font-medium text-slate-400">
            {t("dash.employee.heroSubtitle")}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            if (firstActiveSurveyId) {
              navigate({ to: "/survey", search: { id: firstActiveSurveyId } });
            } else {
              navigate({ to: "/" });
            }
          }}
          className="rounded-xl font-bold text-[13px] uppercase tracking-wider transition-all group/btn shadow-md"
        >
          {t("dash.employee.startSurvey")}
          <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { labelKey: "dash.employee.kpi1Label" as const, value: "12", icon: Target, color: "text-primary", bg: "bg-primary/5" },
          { labelKey: "dash.employee.kpi2Label" as const, value: lang === "th" ? "4 รอบ" : "4 Cycles", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { labelKey: "dash.employee.kpi3Label" as const, value: lang === "th" ? "สูง" : "High", icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
        ].map((kpi) => (
          <div key={kpi.labelKey} className="flex items-center gap-5 p-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", kpi.bg, kpi.color)}>
              <kpi.icon className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t(kpi.labelKey)}</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score color helpers ────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 4.0) return "#10b981";
  if (score >= 3.0) return "#6366f1";
  if (score >= 2.0) return "#f59e0b";
  return "#f43f5e";
}

// ── Admin Analytics Dashboard ──────────────────────────────────────────────
function AdminDashboard() {
  const { lang } = useI18n();

  // All lookup data
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [businessUnits, setBusinessUnits] = useState<string[]>([]);
  const [demoOptions, setDemoOptions] = useState<DemographicOption[]>([]);

  // Filters
  const [selectedSurvey, setSelectedSurvey] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedBU, setSelectedBU] = useState("all");
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedTenure, setSelectedTenure] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load lookups once
  useEffect(() => {
    async function loadLookups() {
      try {
        const [s, d, bu, opts] = await Promise.all([
          getSurveys(),
          getDepartments(),
          getBusinessUnits(),
          getDemographicOptions(),
        ]);
        setSurveys(s);
        setDepartments(d);
        setBusinessUnits((bu as any[]).map((b) => b.name_en || b.name || "").filter(Boolean));
        setDemoOptions(opts);
      } catch (e) {
        console.error("Lookup load error:", e);
      }
    }
    loadLookups();
  }, []);

  const totalTarget = useMemo(() => {
    if (selectedSurvey === "all") return surveys.reduce((s, sv) => s + (sv.target || 0), 0) || 0;
    return surveys.find(s => s.id === selectedSurvey)?.target || 0;
  }, [surveys, selectedSurvey]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { responses } = await fetchAnalyticsData({
        surveyId: selectedSurvey,
        dept: selectedDept,
        bu: selectedBU,
        ageRange: selectedAge,
        tenure: selectedTenure,
        gender: selectedGender,
        location: selectedLocation,
        startDate,
        endDate,
      });
      setData(computeStats(responses, totalTarget));
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedSurvey, selectedDept, selectedBU, selectedAge, selectedTenure, selectedGender, selectedLocation, startDate, endDate, totalTarget]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived option lists from demoOptions
  const ageOptions = useMemo(() => demoOptions.filter(o => o.field_key === "ageRanges"), [demoOptions]);
  const tenureOptions = useMemo(() => demoOptions.filter(o => o.field_key === "tenures"), [demoOptions]);
  const genderOptions = useMemo(() => demoOptions.filter(o => o.field_key === "genders"), [demoOptions]);
  const locationOptions = useMemo(() => demoOptions.filter(o => o.field_key === "locations"), [demoOptions]);

  const resetFilters = () => {
    setSelectedSurvey("all");
    setSelectedDept("all");
    setSelectedBU("all");
    setSelectedAge("all");
    setSelectedTenure("all");
    setSelectedGender("all");
    setSelectedLocation("all");
    setStartDate("");
    setEndDate("");
  };

  const top3 = data?.sectionStats.slice(0, 3) ?? [];
  const bottom3 = data?.sectionStats.length
    ? data.sectionStats.slice(-Math.min(3, data.sectionStats.length)).reverse()
    : [];

  // Shared select style helper
  const selectTriggerCls = "h-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-900";
  const selectContentCls = "rounded-xl dark:bg-slate-900";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === "th" ? "แดชบอร์ดผลวิเคราะห์ความผูกพัน" : "Engagement Analytics Dashboard"}
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-400 pl-[52px]">
            {lang === "th"
              ? "รายงานผลการวิเคราะห์ความผูกพันพนักงานเชิงลึก เพื่อการวางแผน HR เชิงยุทธศาสตร์"
              : "Deep-dive employee engagement analysis for strategic HR workforce planning."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}
          className="shrink-0 rounded-xl h-9 gap-2 text-xs font-bold border-slate-200 dark:border-slate-700">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          {lang === "th" ? "รีเฟรช" : "Refresh"}
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900/60">
        <CardHeader className="px-6 py-3.5 border-b dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-white">
                {lang === "th" ? "ตัวกรองข้อมูล" : "Filters"}
              </span>
              {data && (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {data.totalResponses} {lang === "th" ? "ผู้ตอบ" : "responses"}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}
              className="h-7 text-[10px] font-bold text-slate-500 hover:text-rose-600 uppercase tracking-wider">
              {lang === "th" ? "ล้างค่า" : "Reset All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">

            {/* Survey */}
            <div className="space-y-1 col-span-2 lg:col-span-2">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "แบบสำรวจ" : "Survey"}
              </Label>
              <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทุกแคมเปญ" : "All Campaigns"}</SelectItem>
                  {surveys.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {lang === "th" ? s.titleTh : s.titleEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Unit */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "หน่วยงาน" : "Business Unit"}
              </Label>
              <Select value={selectedBU} onValueChange={setSelectedBU}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {businessUnits.filter(Boolean).map(bu => (
                    <SelectItem key={bu} value={bu} className="text-xs">{bu}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "ฝ่าย" : "Department"}
              </Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Age / Generation */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "ช่วงอายุ" : "Age Range"}
              </Label>
              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {ageOptions.map(o => (
                    <SelectItem key={o.value} value={o.label_en} className="text-xs">
                      {lang === "th" ? o.label_th : o.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tenure */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "อายุงาน" : "Tenure"}
              </Label>
              <Select value={selectedTenure} onValueChange={setSelectedTenure}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {tenureOptions.map(o => (
                    <SelectItem key={o.value} value={o.label_en} className="text-xs">
                      {lang === "th" ? o.label_th : o.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "เพศ" : "Gender"}
              </Label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {genderOptions.map(o => (
                    <SelectItem key={o.value} value={o.label_en} className="text-xs">
                      {lang === "th" ? o.label_th : o.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location (Site) */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "สถานที่" : "Location"}
              </Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {locationOptions.map(o => (
                    <SelectItem key={o.value} value={o.label_en} className="text-xs">
                      {lang === "th" ? o.label_th : o.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Date range row */}
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-xs">
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "ตั้งแต่วันที่" : "From Date"}
              </Label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "ถึงวันที่" : "To Date"}
              </Label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-800 border-t-indigo-500 animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {lang === "th" ? "กำลังโหลดข้อมูล..." : "Loading analytics..."}
          </p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Row 1: KPI Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* 1: Overall Engagement */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 flex flex-col">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "คะแนน Engagement ภาพรวม" : "Overall Engagement Score"}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "คะแนนเฉลี่ยทุกมิติ" : "Average across all dimensions"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-5xl font-black tracking-tight" style={{ color: scoreColor(data.overallScore) }}>
                    {data.overallScore > 0 ? data.overallScore.toFixed(2) : "—"}
                    <span className="text-base font-semibold text-slate-400 ml-1">/5.00</span>
                  </div>
                  {data.totalResponses === 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      {lang === "th" ? "ยังไม่มีข้อมูลผู้ตอบ" : "No responses yet"}
                    </p>
                  )}
                </div>
                {/* Sparkline */}
                {data.trendData.length > 1 && (
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trendData}>
                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.08} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {data.totalResponses} {lang === "th" ? "ผู้ตอบ" : "responses"}
                  </span>
                  <span className="font-bold" style={{ color: scoreColor(data.overallScore) }}>
                    {data.overallScore >= 4 ? (lang === "th" ? "ดีเยี่ยม" : "Excellent")
                      : data.overallScore >= 3 ? (lang === "th" ? "ดี" : "Good")
                      : data.overallScore >= 2 ? (lang === "th" ? "พอใช้" : "Fair")
                      : data.overallScore > 0 ? (lang === "th" ? "ต้องปรับปรุง" : "Needs Work")
                      : (lang === "th" ? "ไม่มีข้อมูล" : "No Data")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 2: Participation Rate */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 flex flex-col">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "อัตราการเข้าร่วมตอบ" : "Participation Rate"}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "ผู้ส่งแบบสอบถาม / เป้าหมาย" : "Submissions vs. target"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex items-center gap-6">
                {/* Radial gauge */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="7" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#10b981" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 26}
                      strokeDashoffset={2 * Math.PI * 26 * (1 - data.participationRate / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">{data.participationRate}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{data.participationRate}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{data.totalResponses}</span>
                    {lang === "th" ? " จาก " : " of "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{data.totalTarget || "—"}</span>
                    {lang === "th" ? " คน" : " target"}
                  </div>
                  {data.totalTarget === 0 && (
                    <p className="text-[10px] text-amber-500 font-semibold mt-1">
                      {lang === "th" ? "ไม่ได้ตั้งเป้าหมาย" : "No target set"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3: Best & Worst at a glance */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 flex flex-col">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "มิติดีที่สุด / แย่ที่สุด" : "Best & Worst Dimension"}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "คะแนนสูงสุดและต่ำสุดในรอบนี้" : "Highest & lowest scoring areas"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-center gap-3">
                {data.sectionStats.length === 0 ? (
                  <p className="text-center text-xs text-slate-400">
                    {lang === "th" ? "ไม่มีข้อมูลมิติ" : "No dimension data"}
                  </p>
                ) : (
                  <>
                    {/* Best */}
                    {data.sectionStats[0] && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            {lang === "th" ? "ดีที่สุด" : "Best"}
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                            {lang === "th" ? data.sectionStats[0].titleTh : data.sectionStats[0].titleEn}
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {data.sectionStats[0].score.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400 ml-0.5">/5</span>
                        </div>
                      </div>
                    )}
                    {/* Worst */}
                    {data.sectionStats[data.sectionStats.length - 1] && data.sectionStats.length > 1 && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[9px] font-black text-rose-600 uppercase tracking-widest mb-0.5">
                            <ArrowDownRight className="w-3 h-3" />
                            {lang === "th" ? "ต้องปรับปรุง" : "Worst"}
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                            {lang === "th"
                              ? data.sectionStats[data.sectionStats.length - 1].titleTh
                              : data.sectionStats[data.sectionStats.length - 1].titleEn}
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <span className="text-base font-black text-rose-600 dark:text-rose-400">
                            {data.sectionStats[data.sectionStats.length - 1].score.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-400 ml-0.5">/5</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Top 3 & Bottom 3 ── */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
            <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === "th" ? "อันดับมิติ: ดีที่สุด 3 อันดับ vs แย่ที่สุด 3 อันดับ" : "Dimension Rankings: Top 3 vs Bottom 3"}
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {lang === "th"
                  ? "เปรียบเทียบมิติที่มีผลลัพธ์สูงสุดและต่ำสุดเพื่อกำหนดแผนพัฒนาองค์กร"
                  : "Compare highest and lowest performing engagement dimensions for strategic action planning"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {data.sectionStats.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400">
                  {lang === "th" ? "ไม่มีข้อมูลมิติ — กรุณาตรวจสอบว่ามีคำตอบในฐานข้อมูล" : "No dimension data — ensure responses have been submitted with numeric answers."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Top 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest pb-2 border-b dark:border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === "th" ? "มิติที่มีคะแนนสูงสุด 3 อันดับ" : "Top 3 Highest Scoring"}
                    </div>
                    {top3.length === 0 ? (
                      <p className="text-xs text-slate-400">{lang === "th" ? "ไม่มีข้อมูล" : "No data"}</p>
                    ) : top3.map((item, idx) => (
                      <div key={item.sectionId} className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            {lang === "th" ? item.titleTh : item.titleEn}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{item.count} {lang === "th" ? "คำตอบ" : "answers"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{item.score.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 ml-0.5">/5</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest pb-2 border-b dark:border-slate-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {lang === "th" ? "มิติที่ต้องปรับปรุง 3 อันดับ" : "Bottom 3 (Needs Improvement)"}
                    </div>
                    {bottom3.length === 0 ? (
                      <p className="text-xs text-slate-400">{lang === "th" ? "ไม่มีข้อมูล" : "No data"}</p>
                    ) : bottom3.map((item, idx) => (
                      <div key={item.sectionId} className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            {lang === "th" ? item.titleTh : item.titleEn}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{item.count} {lang === "th" ? "คำตอบ" : "answers"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400">{item.score.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 ml-0.5">/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Row 3: All Dimensions Bar Chart ── */}
          {data.sectionStats.length > 0 && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === "th" ? "คะแนนรายมิติทั้งหมด" : "All Dimension Scores"}
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === "th" ? "ภาพรวมคะแนนเฉลี่ยแยกตามมิติการสำรวจทั้งหมด" : "Complete breakdown of average scores per survey dimension"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6" style={{ height: Math.max(280, data.sectionStats.length * 52 + 60) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.sectionStats}
                    layout="vertical"
                    margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" className="dark:opacity-10" />
                    <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5]} />
                    <YAxis type="category" dataKey={lang === "th" ? "titleTh" : "titleEn"} stroke="#94a3b8" fontSize={9} fontWeight={600} tickLine={false} axisLine={false} width={160} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as SectionStat;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-white text-xs max-w-[240px]">
                          <p className="font-bold mb-1 leading-snug">{lang === "th" ? d.titleTh : d.titleEn}</p>
                          <p className="font-black" style={{ color: scoreColor(d.score) }}>{d.score.toFixed(2)} / 5.00</p>
                          <p className="text-slate-400 mt-0.5">{d.count} {lang === "th" ? "คำตอบ" : "answers"}</p>
                        </div>
                      );
                    }} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={24} label={{ position: "right", fontSize: 10, fontWeight: 700, fill: "#64748b", formatter: (v: number) => v.toFixed(2) }}>
                      {data.sectionStats.map((entry, i) => (
                        <Cell key={i} fill={scoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ── Row 4: Demographic Charts (Age & Level) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Engagement by Age / Generation */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "คะแนน Engagement ตามกลุ่มอายุ / Generation" : "Engagement Score by Age / Generation"}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "เปรียบเทียบระหว่างกลุ่มคน Gen Z / Y / X / BB" : "Cross-generational sentiment comparison"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 h-[280px]">
                {data.ageStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === "th" ? "ไม่มีข้อมูลกลุ่มอายุ" : "No age range data"}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.ageStats} margin={{ top: 16, right: 10, left: -20, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false}
                        angle={-20} textAnchor="end" interval={0} />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5]} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as DemographicStat;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-white text-xs">
                            <p className="font-bold mb-1">{d.label}</p>
                            <p className="text-indigo-400 font-black">{d.score.toFixed(2)} / 5.00</p>
                            <p className="text-slate-400 mt-0.5">{d.count} {lang === "th" ? "ผู้ตอบ" : "respondents"}</p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {data.ageStats.map((entry, i) => (
                          <Cell key={i} fill={scoreColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Engagement by Job Level */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-indigo-500" />
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "คะแนน Engagement ตามระดับตำแหน่ง" : "Engagement Score by Job Level"}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "จาก Worker ถึง Director — วิเคราะห์ตามลำดับชั้น" : "From Worker to Director — hierarchical sentiment analysis"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 h-[280px]">
                {data.levelStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === "th" ? "ไม่มีข้อมูลระดับตำแหน่ง" : "No job level data"}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.levelStats} margin={{ top: 16, right: 10, left: -20, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false}
                        angle={-20} textAnchor="end" interval={0} />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5]} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as DemographicStat;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-white text-xs">
                            <p className="font-bold mb-1">{d.label}</p>
                            <p className="text-emerald-400 font-black">{d.score.toFixed(2)} / 5.00</p>
                            <p className="text-slate-400 mt-0.5">{d.count} {lang === "th" ? "ผู้ตอบ" : "respondents"}</p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {data.levelStats.map((entry, i) => (
                          <Cell key={i} fill={scoreColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 5: Satisfaction Detail by Age Group & Level ── */}
          {(data.ageSectionRadar.length > 0 || data.levelSectionRadar.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* ── Detail: Satisfaction by Dimension per Age Group ── */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
                <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-violet-500" />
                    <div>
                      <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === "th"
                          ? "มิติที่พนักงานพึงพอใจ แยกตามกลุ่มอายุ"
                          : "Satisfaction by Dimension — per Age Group"}
                      </CardTitle>
                      <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {lang === "th"
                          ? "รายละเอียดด้านที่แต่ละ Generation พึงพอใจสูงสุด"
                          : "Which dimensions each generation values most"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {data.ageSectionRadar.length === 0 || data.ageSectionGroups.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
                      {lang === "th" ? "ไม่มีข้อมูลรายละเอียด" : "No detail data available"}
                    </div>
                  ) : (
                    <>
                      {/* Grouped Bar: dimension × age group */}
                      <div style={{ height: Math.max(300, data.ageSectionRadar.length * 44 + 60) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.ageSectionRadar}
                            layout="vertical"
                            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" className="dark:opacity-10" />
                            <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5]} />
                            <YAxis
                              type="category"
                              dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                              stroke="#94a3b8" fontSize={8} fontWeight={600} tickLine={false} axisLine={false} width={140}
                            />
                            <Tooltip
                              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#fff" }}
                              formatter={(value: number, name: string) => [value.toFixed(2) + " / 5", name]}
                            />
                            <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 8 }} />
                            {data.ageSectionGroups.map((grp, i) => {
                              const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];
                              return (
                                <Bar key={grp} dataKey={grp} name={grp} fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]} maxBarSize={12} />
                              );
                            })}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Radar chart overlay */}
                      <div className="mt-4 pt-4 border-t dark:border-slate-800">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                          {lang === "th" ? "มุมมอง Radar — ภาพรวมทุกมิติ" : "Radar View — All Dimensions"}
                        </p>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={data.ageSectionRadar}>
                              <PolarGrid stroke="#e2e8f0" className="dark:opacity-10" />
                              <PolarAngleAxis
                                dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                                tick={{ fontSize: 8, fontWeight: 700, fill: "#64748b" }}
                              />
                              {data.ageSectionGroups.map((grp, i) => {
                                const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];
                                return (
                                  <Radar key={grp} name={grp} dataKey={grp}
                                    stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12}
                                    strokeWidth={2} dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                                  />
                                );
                              })}
                              <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                              <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#fff" }}
                                formatter={(value: number, name: string) => [value.toFixed(2) + " / 5", name]}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Detail: Satisfaction by Dimension per Job Level ── */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
                <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-violet-500" />
                    <div>
                      <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === "th"
                          ? "มิติที่พนักงานพึงพอใจ แยกตามระดับตำแหน่ง"
                          : "Satisfaction by Dimension — per Job Level"}
                      </CardTitle>
                      <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {lang === "th"
                          ? "รายละเอียดด้านที่แต่ละระดับตำแหน่งพึงพอใจสูงสุด"
                          : "Which dimensions each job level values most"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {data.levelSectionRadar.length === 0 || data.levelSectionGroups.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">
                      {lang === "th" ? "ไม่มีข้อมูลรายละเอียด" : "No detail data available"}
                    </div>
                  ) : (
                    <>
                      {/* Grouped Bar: dimension × level */}
                      <div style={{ height: Math.max(300, data.levelSectionRadar.length * 44 + 60) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.levelSectionRadar}
                            layout="vertical"
                            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" className="dark:opacity-10" />
                            <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5]} />
                            <YAxis
                              type="category"
                              dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                              stroke="#94a3b8" fontSize={8} fontWeight={600} tickLine={false} axisLine={false} width={140}
                            />
                            <Tooltip
                              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#fff" }}
                              formatter={(value: number, name: string) => [value.toFixed(2) + " / 5", name]}
                            />
                            <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 8 }} />
                            {data.levelSectionGroups.map((grp, i) => {
                              const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];
                              return (
                                <Bar key={grp} dataKey={grp} name={grp} fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]} maxBarSize={12} />
                              );
                            })}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Radar chart overlay */}
                      <div className="mt-4 pt-4 border-t dark:border-slate-800">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                          {lang === "th" ? "มุมมอง Radar — ภาพรวมทุกมิติ" : "Radar View — All Dimensions"}
                        </p>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={data.levelSectionRadar}>
                              <PolarGrid stroke="#e2e8f0" className="dark:opacity-10" />
                              <PolarAngleAxis
                                dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                                tick={{ fontSize: 8, fontWeight: 700, fill: "#64748b" }}
                              />
                              {data.levelSectionGroups.map((grp, i) => {
                                const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];
                                return (
                                  <Radar key={grp} name={grp} dataKey={grp}
                                    stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12}
                                    strokeWidth={2} dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                                  />
                                );
                              })}
                              <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                              <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#fff" }}
                                formatter={(value: number, name: string) => [value.toFixed(2) + " / 5", name]}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-slate-800 opacity-40">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          HR Pulse Analytics Protocol v2.0
        </div>
        <div className="flex items-center gap-4">
          {[{ icon: Database, text: "Supabase Primary" }, { icon: Shield, text: "SOC3 Compliant" }].map(item => (
            <div key={item.text} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <item.icon className="w-3 h-3" />
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Route Component ────────────────────────────────────────────────────────
function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "employee") {
      navigate({ to: "/home", replace: true });
    }
  }, [user, navigate]);

  if (user?.role === "employee") return null;
  return <AdminDashboard />;
}

export default DashboardPage;
