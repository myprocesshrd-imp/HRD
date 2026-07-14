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
  Heart, AlertTriangle,
  Award, ArrowUpRight, ArrowDownRight, RefreshCw,
  Layers, Sparkles, ThumbsUp, Info, Zap, Medal, AlertOctagon, AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  PieChart, Pie, LineChart, Line, ReferenceLine
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
  deptStats: DemographicStat[];
  trendData: { date: string; score: number }[];
  /** Trend data by section: { date, [sectionId]: score } */
  trendBySection: Record<string, { sum: number; count: number }>[];
  bestSectionTrend: { date: string; score: number }[];
  worstSectionTrend: { date: string; score: number }[];
  /** Radar data: each row = one section, columns = age groups */
  ageSectionRadar: DimensionByGroupRow[];
  ageSectionGroups: string[];
  /** Radar data: each row = one section, columns = job levels */
  levelSectionRadar: DimensionByGroupRow[];
  levelSectionGroups: string[];
  /** Radar data: each row = one section, columns = business units */
  buSectionRadar: DimensionByGroupRow[];
  buSectionGroups: string[];
  /** Heatmap data: rows = departments, columns = section IDs */
  heatmapData: Record<string, any>[];
  heatmapSections: { id: string; code: string; titleEn: string; titleTh: string }[];
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
  level: string;
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
  if (filters.level !== "all") respQuery = respQuery.eq("demographics->>level", filters.level);
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
  totalTarget: number,
  bestSectionId?: string,
  worstSectionId?: string,
): DashboardData {
  const sectionMap: Record<string, { titleEn: string; titleTh: string; code: string; sum: number; count: number }> = {};
  const ageMap: Record<string, { sum: number; count: number }> = {};
  // Trend by section: { [date]: { [sectionId]: { sum, count } } }
  const sectionDayMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  const levelMap: Record<string, { sum: number; count: number }> = {};
  const buMap: Record<string, { sum: number; count: number }> = {};
  const dayMap: Record<string, { sum: number; count: number }> = {};

  // Section × Age group breakdown
  const ageSectionMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  // Section × Level breakdown
  const levelSectionMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  // Section × Business Unit breakdown
  const buSectionMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  // Department × Section heatmap mapping
  const deptSectionMap: Record<string, Record<string, { sum: number; count: number }>> = {};
  const allSectionsMeta: Record<string, { id: string; code: string; titleEn: string; titleTh: string }> = {};

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

      // Track per-section per-day for trend
      const dayKey = (resp.created_at || "").split("T")[0];
      if (dayKey) {
        if (!sectionDayMap[dayKey]) sectionDayMap[dayKey] = {};
        if (!sectionDayMap[dayKey][sid]) sectionDayMap[dayKey][sid] = { sum: 0, count: 0 };
        sectionDayMap[dayKey][sid].sum += val;
        sectionDayMap[dayKey][sid].count += 1;
      }

      globalSum += val;
      globalCount += 1;
      respSum += val;
      respCount += 1;

      // Section × demographic breakdown
      if (resp.demographics) {
        const dem = resp.demographics as Record<string, string>;
        const age = dem.ageRange;
        const lvl = dem.level;
        const dept = dem.department;

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
        const bu = dem.businessUnit || dem.business_unit;
        if (bu) {
          if (!buSectionMap[sid]) buSectionMap[sid] = {};
          if (!buSectionMap[sid][bu]) buSectionMap[sid][bu] = { sum: 0, count: 0 };
          buSectionMap[sid][bu].sum += val;
          buSectionMap[sid][bu].count += 1;
        }
        if (dept) {
          if (!deptSectionMap[dept]) deptSectionMap[dept] = {};
          if (!deptSectionMap[dept][sid]) deptSectionMap[dept][sid] = { sum: 0, count: 0 };
          deptSectionMap[dept][sid].sum += val;
          deptSectionMap[dept][sid].count += 1;
        }
      }

      if (!allSectionsMeta[sid]) {
        allSectionsMeta[sid] = {
          id: sid,
          code: sec.code,
          titleEn: sec.title_en || sec.code,
          titleTh: sec.title_th || sec.code
        };
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

      // Business Unit (หน่วยงานสังกัด) breakdown
      const bu = dem.businessUnit || dem.business_unit;
      if (bu) {
        if (!buMap[bu]) buMap[bu] = { sum: 0, count: 0 };
        buMap[bu].sum += rScore;
        buMap[bu].count += 1;
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

  const deptStats: DemographicStat[] = Object.entries(buMap)
    .map(([label, s]) => ({
      label,
      score: Number((s.sum / s.count).toFixed(2)),
      count: s.count
    }))
    .sort((a, b) => b.score - a.score);

  const trendData = Object.entries(dayMap)
    .map(([date, s]) => ({ date, score: Number((s.sum / s.count).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build per-section trend (for best/worst line chart)
  const sortedDays = Object.keys(sectionDayMap).sort();
  const _bestId = bestSectionId ?? (sectionStats[0]?.sectionId);
  const _worstId = worstSectionId ?? (sectionStats[sectionStats.length - 1]?.sectionId);
  const bestSectionTrend = sortedDays
    .map(date => ({
      date,
      score: sectionDayMap[date][_bestId]
        ? Number((sectionDayMap[date][_bestId].sum / sectionDayMap[date][_bestId].count).toFixed(2))
        : null
    }))
    .filter(d => d.score !== null) as { date: string; score: number }[];
  const worstSectionTrend = sortedDays
    .map(date => ({
      date,
      score: sectionDayMap[date][_worstId]
        ? Number((sectionDayMap[date][_worstId].sum / sectionDayMap[date][_worstId].count).toFixed(2))
        : null
    }))
    .filter(d => d.score !== null) as { date: string; score: number }[];

  const sortedSectionsForCharts = [...sectionStats].sort((a, b) => a.sectionCode.localeCompare(b.sectionCode, undefined, { numeric: true, sensitivity: 'base' }));

  // Build radar data: section × age
  const ageSectionGroups = Array.from(
    new Set(Object.values(ageSectionMap).flatMap(g => Object.keys(g)))
  ).sort();
  const ageSectionRadar: DimensionByGroupRow[] = sortedSectionsForCharts.map(sec => {
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
  const levelSectionRadar: DimensionByGroupRow[] = sortedSectionsForCharts.map(sec => {
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

  // Build radar data: section × business unit
  const buSectionGroups = Array.from(
    new Set(Object.values(buSectionMap).flatMap(g => Object.keys(g)))
  ).sort();
  const buSectionRadar: DimensionByGroupRow[] = sortedSectionsForCharts.map(sec => {
    const row: DimensionByGroupRow = {
      dimension: sec.titleEn,
      dimensionTh: sec.titleTh
    };
    for (const grp of buSectionGroups) {
      const g = buSectionMap[sec.sectionId]?.[grp];
      row[grp] = g ? Number((g.sum / g.count).toFixed(2)) : 0;
    }
    return row;
  });

  // Heatmap processing
  const heatmapSections = Object.values(allSectionsMeta).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
  );
  const heatmapData = Object.entries(deptSectionMap).map(([dept, sections]) => {
    const row: Record<string, any> = { dept };
    heatmapSections.forEach(sec => {
      const stats = sections[sec.id];
      row[sec.id] = stats ? Number((stats.sum / stats.count).toFixed(2)) : null;
    });
    return row;
  }).sort((a, b) => a.dept.localeCompare(b.dept));

  return {
    totalResponses: responses.length,
    totalTarget,
    participationRate,
    overallScore,
    sectionStats,
    ageStats,
    levelStats,
    deptStats,
    trendData,
    trendBySection: [],
    bestSectionTrend,
    worstSectionTrend,
    ageSectionRadar,
    ageSectionGroups,
    levelSectionRadar,
    levelSectionGroups,
    buSectionRadar,
    buSectionGroups,
    heatmapData,
    heatmapSections,
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
  if (score >= 5.0) return "#10b981";
  if (score >= 4.0) return "#6366f1";
  if (score >= 3.0) return "#f59e0b";
  return "#f43f5e";
}

const CORPORATE_COLORS = [
  "#1e3a5f", "#3b82f6", "#8b5cf6", "#d946ef",
  "#f43f5e", "#f97316", "#10b981", "#06b6d4",
];

/** Recharts custom tick that auto-wraps long labels into multiple lines */
function WrapTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload || x === undefined || y === undefined) return null;
  const text = payload.value || "";
  
  // Smart wrap function that respects spaces, parentheses, and maximum width
  const wrapText = (str: string, maxLen = 30): string[] => {
    if (str.length <= maxLen) return [str];
    const parenIdx = str.indexOf('(');
    if (parenIdx > 0) {
      const before = str.slice(0, parenIdx).trim();
      const after = str.slice(parenIdx).trim();
      const beforeWrapped = before.length > maxLen ? wrapText(before, maxLen) : [before];
      const afterWrapped = after.length > maxLen ? wrapText(after, maxLen) : [after];
      return [...beforeWrapped, ...afterWrapped];
    }
    const words = str.split(/\s+/);
    const linesArr: string[] = [];
    let currentLine = "";
    for (const word of words) {
      if (!word) continue;
      if (currentLine === "") {
        currentLine = word;
      } else if ((currentLine + " " + word).length <= maxLen) {
        currentLine += " " + word;
      } else {
        linesArr.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine !== "") {
      linesArr.push(currentLine);
    }
    if (linesArr.length === 1 && linesArr[0].length > maxLen) {
      const hardLines: string[] = [];
      let rest = linesArr[0];
      while (rest.length > maxLen) {
        hardLines.push(rest.slice(0, maxLen));
        rest = rest.slice(maxLen);
      }
      if (rest.length > 0) hardLines.push(rest);
      return hardLines;
    }
    return linesArr;
  };

  const lines = wrapText(text, 30);
  const lineHeight = 13;
  const startY = y + 10;
  return (
    <g>
      {lines.map((line, i) => (
        <text key={i} x={x} y={startY + i * lineHeight} textAnchor="middle" dominantBaseline="central"
          fill="#94a3b8" fontSize={9} fontWeight={600}>
          {line}
        </text>
      ))}
    </g>
  );
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
  const [selectedLevel, setSelectedLevel] = useState("all");
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
        level: selectedLevel,
        startDate,
        endDate,
      });
      setData(computeStats(responses, totalTarget));
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedSurvey, selectedDept, selectedBU, selectedAge, selectedTenure, selectedGender, selectedLocation, selectedLevel, startDate, endDate, totalTarget]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived option lists from demoOptions
  const ageOptions = useMemo(() => demoOptions.filter(o => o.field_key === "ageRanges"), [demoOptions]);
  const tenureOptions = useMemo(() => demoOptions.filter(o => o.field_key === "tenures"), [demoOptions]);
  const genderOptions = useMemo(() => demoOptions.filter(o => o.field_key === "genders"), [demoOptions]);
  const locationOptions = useMemo(() => demoOptions.filter(o => o.field_key === "locations"), [demoOptions]);
  const levelFilterOptions = useMemo(() => demoOptions.filter(o => o.field_key === "level" || o.field_key === "levels"), [demoOptions]);

  const resetFilters = () => {
    setSelectedSurvey("all");
    setSelectedDept("all");
    setSelectedBU("all");
    setSelectedAge("all");
    setSelectedTenure("all");
    setSelectedGender("all");
    setSelectedLocation("all");
    setSelectedLevel("all");
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-10 gap-3">

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

            {/* Operational Level — NEW */}
            <div className="space-y-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {lang === "th" ? "ระดับปฏิบัติการ" : "Op. Level"}
              </Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={lang === "th" ? "ทั้งหมด" : "All"} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="all" className="text-xs">{lang === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  {levelFilterOptions.map(o => (
                    <SelectItem key={o.value} value={o.label_en} className="text-xs">
                      {lang === "th" ? o.label_th : o.label_en}
                    </SelectItem>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 1: Overall Engagement */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 flex flex-col justify-between p-5 min-h-[110px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "คะแนน Engagement ภาพรวม" : "Overall Engagement Score"}
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {lang === "th" ? "คะแนนเฉลี่ยทุกมิติ" : "Average across all dimensions"}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider" style={{ background: scoreColor(data.overallScore) + "15", color: scoreColor(data.overallScore) }}>
                  {data.overallScore >= 5 ? (lang === "th" ? "ดีเยี่ยม" : "Excellent")
                    : data.overallScore >= 4 ? (lang === "th" ? "ดี" : "Good")
                    : data.overallScore >= 3 ? (lang === "th" ? "พอใช้" : "Fair")
                    : data.overallScore > 0 ? (lang === "th" ? "ต้องปรับปรุง" : "Needs Work")
                    : (lang === "th" ? "ไม่มีข้อมูล" : "No Data")}
                </span>
              </div>
              <div className="flex items-end justify-between mt-4">
                <div className="text-4xl font-black tracking-tight" style={{ color: scoreColor(data.overallScore) }}>
                  {data.overallScore > 0 ? data.overallScore.toFixed(2) : "—"}
                  <span className="text-xs font-semibold text-slate-400 ml-1">/6.00</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 text-right mb-1">
                  {data.totalResponses} {lang === "th" ? "ผู้ตอบแบบสอบถาม" : "responses"}
                </div>
              </div>
            </Card>

            {/* 2: Participation Rate */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60 flex flex-col justify-between p-5 min-h-[110px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "อัตราการเข้าร่วมตอบ" : "Participation Rate"}
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {lang === "th" ? "ผู้ส่งแบบสอบถาม / เป้าหมาย" : "Submissions vs. target"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-between mt-4">
                <div className="text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {data.participationRate}%
                </div>
                <div className="text-[10px] font-bold text-slate-400 text-right mb-1">
                  {lang === "th" ? "ส่งแล้ว " : "Submitted "}
                  <span className="text-slate-800 dark:text-slate-200">{data.totalResponses}</span>
                  {lang === "th" ? " จากเป้าหมาย " : " of target "}
                  <span className="text-slate-800 dark:text-slate-200">{data.totalTarget || "—"}</span>
                  {lang === "th" ? " คน" : " people"}
                </div>
              </div>
            </Card>

          </div>

          {/* ── Row 2: Expanded Strengths & Areas for Improvement (Theme background) ── */}
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
            <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === "th" ? "จุดเด่น & จุดที่ต้องพัฒนา" : "Strengths & Areas for Improvement"}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    {lang === "th" ? "วิเคราะห์มิติที่มีคะแนนเฉลี่ยสูงสุดและต่ำสุดตามลำดับ" : "Analysis of highest and lowest performing dimensions in rank order"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {data.sectionStats.length === 0 ? (
                <p className="text-center text-xs text-slate-400">
                  {lang === "th" ? "ไม่มีข้อมูลมิติ" : "No dimension data"}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Strengths (Green Theme) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {lang === "th" ? "จุดเด่นที่น่าประทับใจ (Top Strengths)" : "Top Strengths"}
                    </h3>
                    
                    {/* Rank 1 Strength */}
                    {data.sectionStats[0] && (
                      <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-emerald-100/50 dark:border-emerald-900/20 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Medal className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Top Impressed</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.sectionStats[0].score.toFixed(2)}</span>
                            <span className="text-[9px] font-medium text-slate-400 ml-1">/ 6.00</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {lang === "th" ? data.sectionStats[0].titleTh : data.sectionStats[0].titleEn}
                        </p>
                      </div>
                    )}

                    {/* Rank 2 Strength (Runner-up) */}
                    {data.sectionStats[1] && data.sectionStats.length > 1 && (
                      <div className="p-4 rounded-xl border border-emerald-100/60 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-emerald-100/30 dark:border-emerald-900/10 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Runner-up</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-emerald-500 dark:text-emerald-400/90">{data.sectionStats[1].score.toFixed(2)}</span>
                            <span className="text-[9px] font-medium text-slate-400 ml-1">/ 6.00</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                          {lang === "th" ? data.sectionStats[1].titleTh : data.sectionStats[1].titleEn}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Needs Action (Rose Theme) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {lang === "th" ? "จุดที่ต้องมุ่งเน้นพัฒนา (Needs Action)" : "Needs Action"}
                    </h3>

                    {/* Rank 1 Priority Focus (Lowest) */}
                    {data.sectionStats[data.sectionStats.length - 1] && (
                      <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-rose-100/50 dark:border-rose-900/20 pb-2">
                          <div className="flex items-center gap-1.5">
                            <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Priority Focus</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{data.sectionStats[data.sectionStats.length - 1].score.toFixed(2)}</span>
                            <span className="text-[9px] font-medium text-slate-400 ml-1">/ 6.00</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {lang === "th" ? data.sectionStats[data.sectionStats.length - 1].titleTh : data.sectionStats[data.sectionStats.length - 1].titleEn}
                        </p>
                      </div>
                    )}

                    {/* Rank 2 Priority Focus (2nd Lowest) */}
                    {data.sectionStats[data.sectionStats.length - 2] && data.sectionStats.length > 2 && (
                      <div className="p-4 rounded-xl border border-rose-100/60 dark:border-rose-900/20 bg-rose-50/10 dark:bg-rose-950/5 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2 border-b border-rose-100/30 dark:border-rose-900/10 pb-2">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Secondary Focus</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-rose-500 dark:text-rose-400/90">{data.sectionStats[data.sectionStats.length - 2].score.toFixed(2)}</span>
                            <span className="text-[9px] font-medium text-slate-400 ml-1">/ 6.00</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                          {lang === "th" ? data.sectionStats[data.sectionStats.length - 2].titleTh : data.sectionStats[data.sectionStats.length - 2].titleEn}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Row 3: All Dimensions Radar Chart + AI Insights ── */}
          {data.sectionStats.length > 0 && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "คะแนนรายมิติทั้งหมด" : "All Dimension Scores"}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "กราฟเรดาร์ภาพรวม + บทสรุป AI สำหรับผู้บริหาร" : "Radar overview + AI-generated executive insights"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-3">
                  {/* Radar chart — 2/3 width */}
                  <div className="lg:col-span-2 p-6 h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[...data.sectionStats].sort((a, b) => a.sectionCode.localeCompare(b.sectionCode, undefined, { numeric: true, sensitivity: 'base' }))} margin={{ top: 20, right: 50, left: 50, bottom: 20 }}>
                        <PolarGrid stroke="#e2e8f0" className="dark:opacity-10" />
                        <PolarAngleAxis
                          dataKey={lang === "th" ? "titleTh" : "titleEn"}
                          tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }}
                        />
                        <PolarRadiusAxis domain={[0, 6]} tick={false} axisLine={false} />
                        <Radar
                          name={lang === "th" ? "คะแนนเฉลี่ย" : "Avg Score"}
                          dataKey="score"
                          stroke="#1e40af"
                          fill="#1e40af"
                          fillOpacity={0.15}
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#1e40af" }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as SectionStat;
                            return (
                              <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-white text-xs max-w-[240px]">
                                <p className="font-bold mb-1 leading-snug">{lang === "th" ? d.titleTh : d.titleEn}</p>
                                <p className="font-black" style={{ color: scoreColor(d.score) }}>{d.score.toFixed(2)} / 6.00</p>
                                <p className="text-slate-400 mt-0.5">{d.count} {lang === "th" ? "คำตอบ" : "answers"}</p>
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 8 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Insights — 1/3 width */}
                  <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4">
                    {/* Header badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest" style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          AI Insights
                        </div>
                        <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">
                          {lang === "th" ? "วิเคราะห์อัตโนมัติสำหรับผู้บริหาร" : "Auto-analysis for executives"}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic insight bullets */}
                    <div className="flex flex-col gap-3 flex-1">
                      {(() => {
                        const stats = data.sectionStats;
                        if (stats.length === 0) return (
                          <p className="text-xs text-slate-400">{lang === "th" ? "ไม่มีข้อมูล" : "No data available"}</p>
                        );
                        const best = stats[0];
                        const worst = stats[stats.length - 1];
                        const avg = data.overallScore;
                        const aboveAvg = stats.filter(s => s.score >= avg);
                        const spread = Number((best.score - worst.score).toFixed(2));

                        const insights = lang === "th" ? [
                          {
                            icon: ThumbsUp,
                            color: "#10b981",
                            bg: "rgba(16,185,129,0.08)",
                            border: "rgba(16,185,129,0.2)",
                            title: "จุดเด่นสูงสุด",
                            body: `"${best.titleTh}" ทำคะแนนได้สูงที่สุดที่ ${best.score.toFixed(2)}/6.00 — ควรนำแนวทางนี้มาใช้เป็นต้นแบบในมิติอื่น`
                          },
                          {
                            icon: AlertTriangle,
                            color: "#f43f5e",
                            bg: "rgba(244,63,94,0.08)",
                            border: "rgba(244,63,94,0.2)",
                            title: "จุดที่ต้องดำเนินการทันที",
                            body: `"${worst.titleTh}" ได้คะแนนต่ำสุดที่ ${worst.score.toFixed(2)}/6.00 — แนะนำให้จัดทำ Focus Group เพื่อวิเคราะห์ปัญหาเชิงลึก`
                          },
                          {
                            icon: Info,
                            color: "#6366f1",
                            bg: "rgba(99,102,241,0.08)",
                            border: "rgba(99,102,241,0.2)",
                            title: "ภาพรวมคะแนน",
                            body: `คะแนนเฉลี่ยรวมอยู่ที่ ${avg.toFixed(2)}/6.00 — ${aboveAvg.length} จาก ${stats.length} มิติอยู่ในระดับดีขึ้นไป — ช่องว่างระหว่างมิติดีที่สุดและแย่ที่สุดอยู่ที่ ${spread} คะแนน`
                          },
                          {
                            icon: Zap,
                            color: "#f59e0b",
                            bg: "rgba(245,158,11,0.08)",
                            border: "rgba(245,158,11,0.2)",
                            title: "ข้อเสนอแนะเชิงกลยุทธ์",
                            body: spread > 1.5
                              ? `ความแตกต่างระหว่างมิติสูงถึง ${spread} คะแนน — ควรจัดสรรทรัพยากรเพื่อยกระดับมิติที่ต่ำกว่า ${avg.toFixed(2)} คะแนนก่อน`
                              : `ผลลัพธ์มีความสม่ำเสมอดี (ช่องว่างเพียง ${spread} คะแนน) — โฟกัสการพัฒนาที่ "${worst.titleTh}" เพื่อผลักดันคะแนนรวมให้สูงขึ้น`
                          },
                        ] : [
                          {
                            icon: ThumbsUp,
                            color: "#10b981",
                            bg: "rgba(16,185,129,0.08)",
                            border: "rgba(16,185,129,0.2)",
                            title: "Top Strength",
                            body: `"${best.titleEn}" leads at ${best.score.toFixed(2)}/6.00 — replicate these practices across other dimensions to drive org-wide improvement.`
                          },
                          {
                            icon: AlertTriangle,
                            color: "#f43f5e",
                            bg: "rgba(244,63,94,0.08)",
                            border: "rgba(244,63,94,0.2)",
                            title: "Immediate Action Required",
                            body: `"${worst.titleEn}" scores lowest at ${worst.score.toFixed(2)}/6.00 — recommend launching targeted focus groups to diagnose root causes.`
                          },
                          {
                            icon: Info,
                            color: "#6366f1",
                            bg: "rgba(99,102,241,0.08)",
                            border: "rgba(99,102,241,0.2)",
                            title: "Score Summary",
                            body: `Overall avg ${avg.toFixed(2)}/6.00 — ${aboveAvg.length} of ${stats.length} dimensions are above average — spread between best & worst is ${spread} pts.`
                          },
                          {
                            icon: Zap,
                            color: "#f59e0b",
                            bg: "rgba(245,158,11,0.08)",
                            border: "rgba(245,158,11,0.2)",
                            title: "Strategic Recommendation",
                            body: spread > 1.5
                              ? `High variance of ${spread} pts detected — prioritize resource allocation to dimensions scoring below ${avg.toFixed(2)}.`
                              : `Scores are balanced (spread only ${spread} pts) — focus targeted efforts on "${worst.titleEn}" to lift the overall average.`
                          },
                        ];

                        return insights.map((ins, i) => (
                          <div key={i} className="flex gap-2.5 p-3 rounded-xl text-[11px]" style={{ background: ins.bg, border: `1px solid ${ins.border}` }}>
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: ins.border }}>
                              <ins.icon className="w-3 h-3" style={{ color: ins.color }} />
                            </div>
                            <div>
                              <div className="font-black mb-0.5" style={{ color: ins.color, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{ins.title}</div>
                              <div className="leading-relaxed text-slate-600 dark:text-slate-300" style={{ fontSize: "10px" }}>{ins.body}</div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Footer note */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-medium text-slate-400">
                        {lang === "th"
                          ? "✦ บทสรุปนี้สร้างโดยระบบวิเคราะห์อัตโนมัติจากข้อมูลจริงในฐานข้อมูล"
                          : "✦ Insights are auto-generated from live survey response data"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Heatmap Card ── */}
          {data.heatmapData.length > 0 && data.heatmapSections.length > 0 && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "แผนภูมิความร้อน (Fidelity Heatmap) รายฝ่าย × มิติ" : "Fidelity Heatmap: Department × Dimension"}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "คะแนนเฉลี่ยแยกตามแผนกในแต่ละมิติการประเมิน (ช่วงคะแนน 1 - 6)" : "Average scores per department across survey dimensions (Score range 1 - 6)"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 min-w-[150px]">
                          {lang === "th" ? "ฝ่าย / แผนก" : "Department"}
                        </th>
                        {data.heatmapSections.map(sec => (
                          <th key={sec.id} className="p-3 font-bold text-center text-slate-700 dark:text-slate-300">
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-slate-750 dark:text-slate-200 truncate max-w-[120px]" title={lang === "th" ? sec.titleTh : sec.titleEn}>
                                {lang === "th" ? sec.titleTh : sec.titleEn}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.heatmapData.map(row => (
                        <tr key={row.dept} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                          <td className="p-3 font-semibold text-slate-855 dark:text-slate-200">
                            {row.dept}
                          </td>
                          {data.heatmapSections.map(sec => {
                            const val = row[sec.id];
                            let cellBg = "bg-slate-50 dark:bg-slate-900/30 text-slate-400";
                            if (val !== null) {
                              if (val >= 5.0) cellBg = "bg-emerald-500/20 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold";
                              else if (val >= 4.0) cellBg = "bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold";
                              else if (val >= 3.0) cellBg = "bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-bold";
                              else cellBg = "bg-rose-500/10 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold";
                            }
                            return (
                              <td key={sec.id} className="p-1.5 text-center">
                                <div className={cn("inline-flex items-center justify-center w-12 h-8 rounded-lg text-xs", cellBg)}>
                                  {val !== null ? val.toFixed(1) : "—"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Heatmap Legend */}
                <div className="flex flex-wrap items-center justify-end gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500/20 dark:bg-emerald-950/40" />
                    {lang === "th" ? "สูงมาก (>= 5.0)" : "Very High (>= 5.0)"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500/10 dark:bg-indigo-950/30" />
                    {lang === "th" ? "ดี (4.0 - 4.9)" : "Good (4.0 - 4.9)"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500/10 dark:bg-amber-950/20" />
                    {lang === "th" ? "พอใช้ (3.0 - 3.9)" : "Fair (3.0 - 3.9)"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500/10 dark:bg-rose-950/30" />
                    {lang === "th" ? "ต้องปรับปรุง (< 3.0)" : "Needs Work (< 3.0)"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Row 4: Demographic Donut Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* 1) Engagement by Business Unit (หน่วยงานสังกัด) */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === "th" ? "คะแนน Engagement ตามหน่วยงานสังกัด" : "Engagement Score by Business Unit"}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === "th" ? "เปรียบเทียบคะแนนระหว่างหน่วยงาน" : "Cross-business-unit sentiment comparison"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 h-[280px] flex flex-col items-center justify-center">
                {data.deptStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === "th" ? "ไม่มีข้อมูลหน่วยงาน" : "No business unit data"}
                  </div>
                ) : (
                  <>
                    <div className="relative w-[160px] h-[160px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.deptStats.map(d => ({ name: d.label, score: d.score, count: d.count }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="score"
                          >
                            {data.deptStats.map((_entry, i) => (
                              <Cell key={i} fill={CORPORATE_COLORS[i % CORPORATE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#f1f5f9" }}
                            itemStyle={{ color: "#e2e8f0", fontWeight: 700, fontSize: 11 }}
                            formatter={(value: number, _name: string, props: any) => {
                              const d = props.payload;
                              return [`${d.score.toFixed(2)} / 6.00  ·  ${d.count} ${lang === "th" ? "คน" : "resp"}`, d.name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-slate-800 dark:text-white">
                          {(data.deptStats.reduce((s, d) => s + d.score, 0) / data.deptStats.length).toFixed(2)}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          {lang === "th" ? "คะแนนเฉลี่ย" : "AVG SCORE"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full mt-3 space-y-1 overflow-y-auto max-h-[90px]">
                      {data.deptStats.map((d, i) => {
                        const totalScore = data.deptStats.reduce((s, x) => s + x.score, 0);
                        const pct = totalScore > 0 ? Math.round((d.score / totalScore) * 100) : 0;
                        return (
                          <div key={d.label} className="flex items-center text-[11px] font-bold text-slate-600 dark:text-slate-300 gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CORPORATE_COLORS[i % CORPORATE_COLORS.length] }} />
                            <span className="truncate flex-1 min-w-0">{d.label}</span>
                            <span className="shrink-0 tabular-nums" style={{ color: CORPORATE_COLORS[i % CORPORATE_COLORS.length] }}>{d.score.toFixed(2)}</span>
                            <span className="text-slate-400 shrink-0 tabular-nums w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 2) Engagement by Age / Generation */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-violet-500" />
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
              <CardContent className="p-4 h-[280px] flex flex-col items-center justify-center">
                {data.ageStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === "th" ? "ไม่มีข้อมูลกลุ่มอายุ" : "No age range data"}
                  </div>
                ) : (
                  <>
                    <div className="relative w-[160px] h-[160px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.ageStats.map(d => ({ name: d.label, score: d.score, count: d.count }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="score"
                          >
                            {data.ageStats.map((_entry, i) => (
                              <Cell key={i} fill={CORPORATE_COLORS[i % CORPORATE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#f1f5f9" }}
                            itemStyle={{ color: "#e2e8f0", fontWeight: 700, fontSize: 11 }}
                            formatter={(value: number, _name: string, props: any) => {
                              const d = props.payload;
                              return [`${d.score.toFixed(2)} / 6.00  ·  ${d.count} ${lang === "th" ? "คน" : "resp"}`, d.name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-slate-800 dark:text-white">
                          {(data.ageStats.reduce((s, d) => s + d.score, 0) / data.ageStats.length).toFixed(2)}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          {lang === "th" ? "คะแนนเฉลี่ย" : "AVG SCORE"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full mt-3 space-y-1 overflow-y-auto max-h-[90px]">
                      {data.ageStats.map((d, i) => {
                        const totalScore = data.ageStats.reduce((s, x) => s + x.score, 0);
                        const pct = totalScore > 0 ? Math.round((d.score / totalScore) * 100) : 0;
                        return (
                          <div key={d.label} className="flex items-center text-[11px] font-bold text-slate-600 dark:text-slate-300 gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CORPORATE_COLORS[i % CORPORATE_COLORS.length] }} />
                            <span className="truncate flex-1 min-w-0">{d.label}</span>
                            <span className="shrink-0 tabular-nums" style={{ color: CORPORATE_COLORS[i % CORPORATE_COLORS.length] }}>{d.score.toFixed(2)}</span>
                            <span className="text-slate-400 shrink-0 tabular-nums w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 3) Engagement by Job Level */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
              <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-emerald-500" />
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
              <CardContent className="p-4 h-[280px] flex flex-col items-center justify-center">
                {data.levelStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === "th" ? "ไม่มีข้อมูลระดับตำแหน่ง" : "No job level data"}
                  </div>
                ) : (
                  <>
                    <div className="relative w-[160px] h-[160px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.levelStats.map(d => ({ name: d.label, score: d.score, count: d.count }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={46}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="score"
                          >
                            {data.levelStats.map((_entry, i) => (
                              <Cell key={i} fill={CORPORATE_COLORS[i % CORPORATE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#f1f5f9" }}
                            itemStyle={{ color: "#e2e8f0", fontWeight: 700, fontSize: 11 }}
                            formatter={(value: number, _name: string, props: any) => {
                              const d = props.payload;
                              return [`${d.score.toFixed(2)} / 6.00  ·  ${d.count} ${lang === "th" ? "คน" : "resp"}`, d.name];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-slate-800 dark:text-white">
                          {(data.levelStats.reduce((s, d) => s + d.score, 0) / data.levelStats.length).toFixed(2)}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          {lang === "th" ? "คะแนนเฉลี่ย" : "AVG SCORE"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full mt-3 space-y-1 overflow-y-auto max-h-[90px]">
                      {data.levelStats.map((d, i) => {
                        const totalScore = data.levelStats.reduce((s, x) => s + x.score, 0);
                        const pct = totalScore > 0 ? Math.round((d.score / totalScore) * 100) : 0;
                        return (
                          <div key={d.label} className="flex items-center text-[11px] font-bold text-slate-600 dark:text-slate-300 gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CORPORATE_COLORS[i % CORPORATE_COLORS.length] }} />
                            <span className="truncate flex-1 min-w-0">{d.label}</span>
                            <span className="shrink-0 tabular-nums" style={{ color: CORPORATE_COLORS[i % CORPORATE_COLORS.length] }}>{d.score.toFixed(2)}</span>
                            <span className="text-slate-400 shrink-0 tabular-nums w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 5: Satisfaction by Dimension (vertical grouped bars) ── */}
          {(data.buSectionRadar.length > 0 || data.ageSectionRadar.length > 0 || data.levelSectionRadar.length > 0) && (
            <div className="space-y-5">

              {/* 1) Dimension × Business Unit */}
              {data.buSectionRadar.length > 0 && data.buSectionGroups.length > 0 && (
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
                  <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-blue-600" />
                      <div>
                        <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                          {lang === "th" ? "มิติความพึงพอใจ แยกตามหน่วยงานสังกัด" : "Satisfaction by Dimension — per Business Unit"}
                        </CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {lang === "th" ? "คะแนนรายมิติเปรียบเทียบระหว่างหน่วยงาน" : "Dimension-level scores across business units"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.buSectionRadar}
                        margin={{ top: 8, right: 16, left: -8, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingBottom: 8 }} verticalAlign="top" align="right" />
                        <XAxis
                          dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                          stroke="#94a3b8" tickLine={false} axisLine={false}
                          tick={<WrapTick />}
                          interval={0}
                        />
                        <YAxis domain={[0, 6]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5,6]} />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#f1f5f9" }}
                          itemStyle={{ color: "#e2e8f0", fontWeight: 700, fontSize: 11 }}
                          formatter={(value: number, name: string) => [value.toFixed(2) + " / 6", name]}
                        />
                        {data.buSectionGroups.map((grp, i) => (
                          <Bar key={grp} dataKey={grp} name={grp} fill={CORPORATE_COLORS[i % CORPORATE_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 2) Dimension × Age Group */}
              {data.ageSectionRadar.length > 0 && data.ageSectionGroups.length > 0 && (
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
                  <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-violet-600" />
                      <div>
                        <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                          {lang === "th" ? "มิติความพึงพอใจ แยกตามกลุ่มอายุ" : "Satisfaction by Dimension — per Age Group"}
                        </CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {lang === "th" ? "คะแนนรายมิติเปรียบเทียบระหว่าง Generation" : "Dimension-level scores across generations"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.ageSectionRadar}
                        margin={{ top: 8, right: 16, left: -8, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingBottom: 8 }} verticalAlign="top" align="right" />
                        <XAxis
                          dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                          stroke="#94a3b8" tickLine={false} axisLine={false}
                          tick={<WrapTick />}
                          interval={0}
                        />
                        <YAxis domain={[0, 6]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5,6]} />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#f1f5f9" }}
                          itemStyle={{ color: "#e2e8f0", fontWeight: 700, fontSize: 11 }}
                          formatter={(value: number, name: string) => [value.toFixed(2) + " / 6", name]}
                        />
                        {data.ageSectionGroups.map((grp, i) => (
                          <Bar key={grp} dataKey={grp} name={grp} fill={CORPORATE_COLORS[i % CORPORATE_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 3) Dimension × Job Level */}
              {data.levelSectionRadar.length > 0 && data.levelSectionGroups.length > 0 && (
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
                  <CardHeader className="px-6 py-4 border-b dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-4 h-4 text-emerald-600" />
                      <div>
                        <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                          {lang === "th" ? "มิติความพึงพอใจ แยกตามระดับตำแหน่ง" : "Satisfaction by Dimension — per Job Level"}
                        </CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {lang === "th" ? "คะแนนรายมิติเปรียบเทียบระหว่างระดับตำแหน่ง" : "Dimension-level scores across job levels"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.levelSectionRadar}
                        margin={{ top: 8, right: 16, left: -8, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingBottom: 8 }} verticalAlign="top" align="right" />
                        <XAxis
                          dataKey={lang === "th" ? "dimensionTh" : "dimension"}
                          stroke="#94a3b8" tickLine={false} axisLine={false}
                          tick={<WrapTick />}
                          interval={0}
                        />
                        <YAxis domain={[0, 6]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} ticks={[1,2,3,4,5,6]} />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 11, color: "#f1f5f9" }}
                          itemStyle={{ color: "#e2e8f0", fontWeight: 700, fontSize: 11 }}
                          formatter={(value: number, name: string) => [value.toFixed(2) + " / 6", name]}
                        />
                        {data.levelSectionGroups.map((grp, i) => (
                          <Bar key={grp} dataKey={grp} name={grp} fill={CORPORATE_COLORS[i % CORPORATE_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
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
