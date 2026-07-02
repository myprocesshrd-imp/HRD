import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  Users, BarChart3, TrendingUp, Calendar, 
  ArrowRight, MessageSquare, 
  Activity, Target, Zap, Brain, Shield,
  Globe, Compass, Database, Terminal, Clock,
  ChevronRight, Building2, Layers, History, Star, Filter,
  Heart, UserCheck, Fingerprint, ZapOff, AlertTriangle, CheckCircle2
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  BarChart, Bar
} from "recharts";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { 
  getCategoryScores, 
  getEngagementTrend, 
  getEngagementByDept, 
  getHeatmapData, 
  getRecentSubmissions
} from "@/services/api/analytics";
import { getSections, getSurveys, type SurveySection, type MockSurvey } from "@/services/api/surveys";
import { 
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const PIE_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#ec4899"  // Pink
];

function EmployeeDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Employee Hero ── */}
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
          <p className="text-[15px] font-medium text-slate-400 ml-13">
            {t("dash.employee.heroSubtitle")}
          </p>
        </div>
        <div className="flex items-center">
          <Button
            size="lg"
            onClick={() => navigate({ to: "/survey" })}
            className="rounded-xl font-bold text-[13px] uppercase tracking-wider transition-all group/btn shadow-md"
          >
             {t("dash.employee.startSurvey")}
             <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { labelKey: "dash.employee.kpi1Label" as const, value: "12", icon: Target, color: "text-primary dark:text-primary", bg: "bg-primary/5 dark:bg-primary/10" },
          { labelKey: "dash.employee.kpi2Label" as const, value: lang === "th" ? "4 รอบ" : "4 Cycles", icon: Activity, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { labelKey: "dash.employee.kpi3Label" as const, value: lang === "th" ? "สูง" : "High", icon: MessageSquare, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
        ].map((kpi) => (
          <div key={kpi.labelKey} className="flex items-center gap-5 p-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm group hover:shadow-md transition-all">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", kpi.bg, kpi.color)}>
              <kpi.icon className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t(kpi.labelKey)}</div>
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{kpi.value}</div>
                <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { t, lang } = useI18n();
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState("all");
  const [selectedYear, setSelectedYear] = useState("2026");

  const [trendData, setTrendData] = useState<any[]>([]);
  const [realCats, setRealCats] = useState<any[]>([]);
  const [engagementByDept, setEngagementByDept] = useState<any[]>([]);
  const [allSections, setAllSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  // Cell click dialog state
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{
    dept: string;
    sectionCode: string;
    value: number;
    sectionTitle: string;
    questions: any[];
  } | null>(null);

  const loadData = async (surveyId: string, year: string) => {
    setLoading(true);
    try {
      const [trend, cats, depts, heatmap, sectionsRes, recent] = await Promise.all([
        getEngagementTrend(surveyId),
        getCategoryScores(surveyId),
        getEngagementByDept(surveyId),
        getHeatmapData(surveyId),
        getSections(),
        getRecentSubmissions(8, surveyId),
      ]);

      let filteredTrend = trend;
      if (year === "2025") {
        filteredTrend = [
          { period: "2025-05-01", score: 3.5 },
          { period: "2025-06-01", score: 3.8 },
          { period: "2025-07-01", score: 3.6 },
          { period: "2025-08-01", score: 3.9 },
          { period: "2025-09-01", score: 4.1 },
          { period: "2025-10-01", score: 4.0 },
          { period: "2025-11-01", score: 4.2 },
          { period: "2025-12-01", score: 4.0 }
        ];
      } else if (year === "2026") {
        filteredTrend = trend.filter(t => t.period.startsWith("2026"));
      }

      setTrendData(filteredTrend);
      setRealCats(cats);
      setEngagementByDept(depts);
      setHeatmapData(heatmap);
      setAllSections(sectionsRes);
      setRecentSubmissions(recent);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    async function loadInitial() {
      try {
        const s = await getSurveys();
        setSurveys(s);
        await loadData("all", "2026");
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();
  }, []);

  const sectionCodes = useMemo(() => {
    if (heatmapData.length === 0) return [];
    const codes = new Set<string>();
    heatmapData.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== 'dept') codes.add(k);
      });
    });
    return Array.from(codes).sort();
  }, [heatmapData]);

  const pulseIndex = useMemo(() => {
    if (realCats.length === 0) return 0;
    return (realCats.reduce((acc, c) => acc + c.score, 0) / realCats.length).toFixed(2);
  }, [realCats]);

  const riskCats = useMemo(() => realCats.filter((c: any) => c.score < 3.0), [realCats]);

  // Overall Engagement Score + Response Rate (for selected survey or all)
  const overallStats = useMemo(() => {
    if (!surveys || surveys.length === 0) {
      const score = typeof pulseIndex === "string" ? parseFloat(pulseIndex) : (pulseIndex || 0);
      return { engagementScore: score, responseRate: 0, totalResponses: 0, totalTarget: 0 };
    }
    const filtered = selectedSurvey === "all"
      ? surveys
      : surveys.filter((s) => s.id === selectedSurvey);
    const totalResponses = filtered.reduce((sum, s) => sum + (s.responses || 0), 0);
    const totalTarget = filtered.reduce((sum, s) => sum + (s.target || 0), 0);
    const rate = totalTarget > 0 ? Math.round((totalResponses / totalTarget) * 100) : 0;
    const score = typeof pulseIndex === "string" ? parseFloat(pulseIndex) : (pulseIndex || 0);
    return {
      engagementScore: Number(score.toFixed(2)),
      responseRate: rate,
      totalResponses,
      totalTarget: totalTarget || 0,
    };
  }, [surveys, selectedSurvey, pulseIndex]);

  const handleHeatmapCellClick = async (dept: string, sectionCode: string, value: number) => {
    const section = allSections.find(s => s.code === sectionCode || s.id === sectionCode);
    const sectionTitle = lang === "th" ? section?.titleTh || sectionCode : section?.titleEn || sectionCode;
    
    const { QUESTION_BANK } = await import("@/lib/mock-data");
    const masterSec = QUESTION_BANK.find(s => s.id === sectionCode);
    const questions = masterSec ? masterSec.questions : [];

    setSelectedHeatmapCell({
      dept,
      sectionCode,
      value,
      sectionTitle,
      questions: questions.map((q, idx) => ({
        id: q.id,
        textEn: q.textEn,
        textTh: q.textTh,
        score: Math.min(5, Math.max(1, value + (Math.sin(idx + 1) * 0.4)))
      }))
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("dash.synthesizing")}</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Admin Header ── */}
      <div className="flex items-start justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t("dash.adminTitle")}</h1>
          </div>
          <p className="text-[15px] font-medium text-slate-400 ml-13">
            {t("dash.adminSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4 p-4 px-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
           {/* Engagement Score */}
           <div className="flex-1 text-right">
              <div className="inline-block min-w-[140px] text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block whitespace-nowrap">
                  {t("dash.engagementScore")}
                </span>
                <div className="text-2xl font-bold text-primary dark:text-white tabular-nums tracking-tight whitespace-nowrap">
                  {overallStats.engagementScore}<span className="text-[11px] font-normal text-slate-400 ml-0.5">/5</span>
                </div>
              </div>
           </div>
           <Separator orientation="vertical" className="h-9" />

           {/* Response Rate */}
           <div className="flex-1 text-right">
              <div className="inline-block min-w-[140px] text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block whitespace-nowrap">
                  {t("dash.responseRate")}
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight whitespace-nowrap">
                  {overallStats.responseRate}%
                </div>
                <div className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
                  {overallStats.totalResponses} / {overallStats.totalTarget}
                </div>
              </div>
           </div>
           <Separator orientation="vertical" className="h-9" />
           <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
              <TrendingUp className="w-5 h-5" />
           </div>
        </div>
      </div>

      {/* ── Dynamic Layout Grid ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 px-6 bg-slate-50/40 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 w-full">
            {/* Campaign Selection */}
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Layers className="w-4 h-4" />
               </div>
               <div className="min-w-[200px]">
                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">{t("dash.filterCampaign")}</Label>
                  <Select value={selectedSurvey} onValueChange={(val) => { setSelectedSurvey(val); loadData(val, selectedYear); }}>
                      <SelectTrigger className="h-7 p-0 border-none bg-transparent shadow-none font-bold text-sm focus:ring-0 w-full text-left dark:text-white">
                        <SelectValue placeholder={t("dash.allCampaigns")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl p-1.5 border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                        <SelectItem value="all" className="h-9 rounded-lg text-xs font-semibold">{t("dash.allCampaigns")}</SelectItem>
                       {surveys.map((s) => (
                         <SelectItem key={s.id} value={s.id} className="h-9 rounded-lg text-xs font-semibold">
                           {lang === "th" ? s.titleTh : s.titleEn}
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
               </div>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8 dark:bg-slate-800" />
            {/* Year Selection (formerly Time Horizon) */}
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Filter className="w-4 h-4" />
               </div>
               <div>
                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">{t("dash.filterYear")}</Label>
                  <div className="flex gap-1.5">
                    {["2025", "2026", "all"].map((y) => (
                      <Button 
                        key={y} 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSelectedYear(y); loadData(selectedSurvey, y); }}
                        className={cn(
                          "h-6 px-3 rounded-lg text-[10px] font-bold transition-all uppercase", 
                          y === selectedYear ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {y === "all" ? t("dash.allYears") : y}
                      </Button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Grid: Trend & Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-8 py-6 bg-slate-50/40 dark:bg-slate-800/20 border-b dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                  <BarChart3 className="w-4.5 h-4.5" />
               </div>
               <div>
                   <CardTitle className="text-sm font-bold tracking-tight dark:text-white">{t("dash.momentum")}</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("dash.momentumDesc")}</CardDescription>
               </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.period}</p>
                           <p className="text-lg font-bold text-white">{payload[0].value} <span className="text-[10px] text-slate-400 font-normal">{t("dash.avgScore")}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" strokeLinecap="round" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

          <Card className="lg:col-span-4 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/40 dark:bg-slate-800/20 border-b dark:border-slate-800">
             <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                  <Building2 className="w-4.5 h-4.5" />
               </div>
               <div>
                   <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("dash.responsesByDept")}</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("dash.responsesByDeptDesc")}</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {engagementByDept.length > 0 ? (
              <div className="flex flex-col">
                <div className="relative h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={engagementByDept.map(d => ({ name: d.dept, value: d.responses }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {(() => {
                          const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
                          return engagementByDept.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ));
                        })()}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            const total = engagementByDept.reduce((a: number, b: any) => a + b.responses, 0);
                            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                            return (
                              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[140px]">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{d.name}</p>
                                 <p className="text-lg font-black text-white">{d.value} <span className="text-[10px] text-slate-400 font-normal">{t("dash.respondents")}</span></p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                    <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[11px] font-bold text-white">{pct}%</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{engagementByDept.reduce((a: number, b: any) => a + b.responses, 0)}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t("dash.total")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {(() => {
                    const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
                    return engagementByDept.map((d: any, i: number) => (
                      <div key={d.dept} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{d.dept}</span>
                        <span className="text-[10px] font-bold text-slate-400">{d.responses}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[210px] gap-2">
                <Building2 className="w-8 h-8 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("common.noResults")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Mid Grid: Heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/40 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-row items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Compass className="w-4.5 h-4.5" />
               </div>
               <div>
                   <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("dash.heatmapTitle")}</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("dash.heatmapDesc")}</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div 
                className="grid gap-2 px-2"
                style={{ gridTemplateColumns: `150px repeat(${sectionCodes.length}, minmax(0, 1fr))` }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("dash.heatmapNode")}</div>
                <TooltipProvider>
                  {sectionCodes.map(code => {
                    const section = allSections.find(s => s.id === code || s.code === code);
                    const shortName = section
                      ? (lang === 'th' ? section.titleTh : section.titleEn).length > 20
                        ? (lang === 'th' ? section.titleTh : section.titleEn).slice(0, 18) + '…'
                        : (lang === 'th' ? section.titleTh : section.titleEn)
                      : code;
                    return (
                      <UITooltip key={code}>
                        <TooltipTrigger asChild>
                          <div className="text-center text-[10px] font-bold tracking-tight text-primary cursor-help hover:text-primary/70 transition-colors bg-primary/5 dark:bg-primary/10 rounded py-1 px-1 border border-primary/10 truncate" title={section ? (lang === 'th' ? section.titleTh : section.titleEn) : code}>
                            {shortName}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 p-3 rounded-xl shadow-2xl max-w-[200px] animate-in fade-in zoom-in duration-200">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-primary uppercase tracking-tighter">Section {code}</div>
                            <div className="text-sm font-bold leading-snug">{lang === 'th' ? section?.titleTh : section?.titleEn}</div>
                            {(section?.descTh || section?.descEn) && (
                              <div className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-white/10 mt-1">
                                {lang === 'th' ? section?.descTh : section?.descEn}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
              <ScrollArea className="h-[220px] pr-4">
                 <div className="space-y-2">
                  {heatmapData.map((row) => (
                    <div 
                      key={row.dept} 
                      className="grid gap-2 items-center group"
                      style={{ gridTemplateColumns: `150px repeat(${sectionCodes.length}, minmax(0, 1fr))` }}
                    >
                      <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary truncate transition-colors">{row.dept}</div>
                      {sectionCodes.map((k) => {
                        const v = row[k] || 0;
                        // Best Practice: RAG Scoring (Red < 2.5, Amber < 3.5, Green >= 3.5)
                        let bgColor = "bg-emerald-50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
                        if (v < 2.5) {
                          bgColor = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
                        } else if (v < 3.5) {
                          bgColor = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
                        }
                        
                        return (
                          <div
                            key={k}
                            onClick={() => v > 0 && handleHeatmapCellClick(row.dept, k, v)}
                            className={cn(
                              "h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shadow-sm transition-all hover:scale-105 border",
                              v > 0 && "cursor-pointer hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 dark:hover:ring-offset-slate-900",
                              bgColor
                            )}
                          >
                            {v > 0 ? v.toFixed(1) : "-"}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                 </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Live Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/40 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                  <Heart className="w-4.5 h-4.5 animate-pulse" />
               </div>
               <div>
                   <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("dash.liveFeed")}</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("dash.liveFeedDesc")}</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{t("dash.live")}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[310px]">
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                   {recentSubmissions.length > 0 ? recentSubmissions.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                         <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                               {item.type === 'anonymous' ? (
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400" title="Anonymous">
                                     <UserCheck className="w-3.5 h-3.5" />
                                  </div>
                               ) : (
                                  <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary" title="Identified">
                                     <Fingerprint className="w-3.5 h-3.5" />
                                  </div>
                               )}
                               <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors uppercase tracking-tight">
                                  {item.department}
                               </div>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                               {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                         </div>
                         <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium line-clamp-1 ml-9">
                            {item.surveyTitle}
                         </div>
                      </div>
                   )) : (
                      <div className="p-10 text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600">
                            <ZapOff className="w-5 h-5" />
                         </div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t("dash.waitingInput")}</p>
                      </div>
                   )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/40 dark:bg-slate-800/20 border-b dark:border-slate-800">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Brain className="w-4.5 h-4.5" />
               </div>
               <div>
                   <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t("dash.radarTitle")}</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("dash.radarDesc")}</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-4 h-[300px] flex items-center justify-center">
            {/* Risk Legend */}
            {riskCats.length > 0 && (
              <div className="absolute top-3 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-full z-10">
                <AlertTriangle className="w-3 h-3 text-rose-500" />
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">{t("dash.riskDetected")}</span>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
               {riskCats.length > 0 ? (
               <RadarChart data={riskCats} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#cbd5e1" strokeWidth={1} className="dark:opacity-10" />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={({ x, y, payload, cx, cy }: any) => {
                    const cat = riskCats.find((c: any) => c.category === payload.value);
                    const isRisk = cat && cat.score < 3.0;

                    const dx = x - cx;
                    const dy = y - cy;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    // Push labels outwards by 14px
                    const pushX = x + (dx / distance) * 14;
                    const pushY = y + (dy / distance) * 10;

                    // Determine text anchor dynamically based on angle/horizontal side
                    let textAnchor: "start" | "end" | "middle" = "middle";
                    if (dx > 10) {
                      textAnchor = "start";
                    } else if (dx < -10) {
                      textAnchor = "end";
                    }

                    return (
                      <text 
                        x={pushX} 
                        y={pushY} 
                        textAnchor={textAnchor} 
                        fontSize={9} 
                        fontWeight={700} 
                        fill={isRisk ? '#ef4444' : '#64748b'}
                        dy={4}
                      >
                        {payload.value}{isRisk ? ' ⚠' : ''}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                <Radar 
                  name="Score" 
                  dataKey="score" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fill="#6366f1" 
                  fillOpacity={0.25} 
                />
                {/* Risk threshold reference */}
                <Radar
                  name="Risk Threshold"
                  dataKey={() => 3.0}
                  stroke="#f43f5e"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                  legendType="none"
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isRisk = d.score < 3.0;
                      return (
                        <div className={cn(
                          "p-3 rounded-xl shadow-2xl backdrop-blur-sm min-w-[140px] border",
                          isRisk 
                            ? "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            {isRisk && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{d.category}</p>
                          </div>
                          <p className={cn("text-lg font-black", isRisk ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
                            {d.score.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/ 5.00</span>
                          </p>
                          {isRisk && <p className="text-[10px] font-bold text-rose-500 mt-0.5">{t("dash.belowThreshold")}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
               ) : <div className="flex items-center justify-center h-full text-xs text-slate-400">{t("dash.noRisks")}</div> }
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/40 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                  <Users className="w-4.5 h-4.5" />
               </div>
               <div>
                   <CardTitle className="text-sm font-bold tracking-tight dark:text-white">{t("dash.registryTitle")}</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("dash.registryDesc")}</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                   <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                     {t("dash.overallResponseRate")}
                   </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{overallStats.responseRate}%</div>
               </div>
               <Separator orientation="vertical" className="h-6 dark:bg-slate-800" />
               <Globe className="w-4 h-4 text-primary opacity-50" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/40 sticky top-0 z-10 border-b dark:border-slate-800">
                    <tr className="text-[10px] font-bold uppercase text-slate-400 dark:text-white/60 tracking-wider">
                      <th className="px-6 py-3.5">{t("dash.tableDept")}</th>
                      <th className="px-6 py-3.5">{t("dash.tableFidelity")}</th>
                      <th className="px-6 py-3.5 text-right">{t("dash.tableMetric")}</th>
                    </tr>
                  </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                   {engagementByDept.map((d, i) => {
                     const target = Math.round(d.responses * 1.3);
                     const pct = Math.round((d.responses / target) * 100);
                     return (
                        <tr key={d.dept} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold border border-slate-100 dark:border-slate-700 shrink-0" style={{ backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}10`, color: PIE_COLORS[i % PIE_COLORS.length] }}>
                                  {d.dept.slice(0, 2).toUpperCase()}
                               </div>
                               <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors truncate max-w-[150px]">{d.dept}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                               <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} 
                                   />
                               </div>
                               <span className="text-[11px] font-bold text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                             <div className="text-[12px] font-bold text-slate-900 dark:text-white">{d.responses} / {target}</div>
                          </td>
                        </tr>
                     );
                   })}
                 </tbody>
               </table>
             </ScrollArea>
          </CardContent>
        </Card>
      </div>
      


      {/* ── System Footer ── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-slate-800 opacity-40">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          {t("dash.protocol")}
        </div>
        <div className="flex items-center gap-4">
          {[
            { icon: Database, text: t("dash.badgePrimary") },
            { icon: Shield, text: t("dash.badgeSOC3") },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <item.icon className="w-3 h-3" />
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Heatmap Cell Detail Dialog ── */}
      <Dialog open={!!selectedHeatmapCell} onOpenChange={(open) => !open && setSelectedHeatmapCell(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border",
                selectedHeatmapCell && selectedHeatmapCell.value >= 3.5 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  : selectedHeatmapCell && selectedHeatmapCell.value >= 2.5
                    ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                    : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
              )}>
                {selectedHeatmapCell?.value.toFixed(1)}
              </div>
              <div>
                <DialogTitle className="text-base font-bold dark:text-white">
                  {selectedHeatmapCell?.dept} — {selectedHeatmapCell?.sectionTitle}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {t("dash.sectionBreakdown")} {selectedHeatmapCell?.sectionCode}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {selectedHeatmapCell?.questions.map((q: any, idx: number) => {
              const score = Number(q.score.toFixed(2));
              const pct = (score / 5) * 100;
              let barColor = 'bg-emerald-500';
              if (score < 2.5) barColor = 'bg-rose-500';
              else if (score < 3.5) barColor = 'bg-amber-500';
              return (
                <div key={q.id || idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 leading-snug flex-1">
                      {lang === 'th' ? q.textTh : q.textEn}
                    </p>
                    <span className={cn(
                      "text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-lg shrink-0",
                      score >= 3.5 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      score >= 2.5 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                      "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                    )}>{score}/5</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Employees should not see the analytics dashboard — redirect to Home
  useEffect(() => {
    if (user?.role === "employee") {
      navigate({ to: "/home", replace: true });
    }
  }, [user, navigate]);

  if (user?.role === "employee") return null;
  return <AdminDashboard />;
}

export default DashboardPage;
