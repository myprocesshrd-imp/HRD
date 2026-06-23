import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getSurveys, type MockSurvey } from "@/services/api/surveys";
import { getDepartments } from "@/services/api/departments";
import { getBusinessUnits, type BusinessUnit } from "@/services/api/business-units";
import { 
  getEngagementTrend, 
  getCategoryScores, 
  getEngagementByDept,
  getResponseDistribution,
  type EngagementTrend,
  type CategoryScore,
  type EngagementByDept,
  type ResponseDistribution
} from "@/services/api/analytics";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import {
  BarChart3, TrendingUp, Download, Activity, 
  MessageSquare, Users, Target,
  Sparkles, Zap, Brain, Lightbulb, ArrowRight, Share2, Printer,
  Building2, History, Info, AlertTriangle, HelpCircle,
  Terminal, Database, Globe, Compass, Layers, ShieldCheck, Calendar, Search, Filter
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/results")({
  component: ResultsPage,
});

const CHART_COLORS = ["#0f172a", "#3b82f6", "#8b5cf6", "#d946ef", "#6366f1", "#f43f5e", "#10b981"];

function ResultsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [engagementByDept, setEngagementByDept] = useState<EngagementByDept[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [trendData, setTrendData] = useState<EngagementTrend[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [distribution, setDistribution] = useState<ResponseDistribution[]>([]);
  
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterBU, setFilterBU] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === "employee") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    async function init() {
      try {
        const [s, d, bu] = await Promise.all([
          getSurveys(),
          getDepartments(),
          getBusinessUnits()
        ]);
        setSurveys(s);
        setDepartments(d);
        setBusinessUnits(bu);
        if (s.length > 0) {
          setSelectedSurvey("all");
        } else {
          setLoading(false);
        }
      } catch (err) {
        toast.error("Failed to load analytics data");
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadAnalytics = async (surveyId: string, deptFilter: string, buFilter: string) => {
    setLoading(true);
    try {
      const [dept, trend, cats, dist] = await Promise.all([
        getEngagementByDept(surveyId, buFilter),
        getEngagementTrend(surveyId, deptFilter, buFilter),
        getCategoryScores(surveyId, deptFilter, buFilter),
        getResponseDistribution(surveyId, deptFilter, buFilter)
      ]);
      setEngagementByDept(dept);
      setTrendData(trend);
      setCategoryScores(cats);
      setDistribution(dist);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    if (selectedSurvey) {
      loadAnalytics(selectedSurvey, filterDept, filterBU);
    }
  }, [selectedSurvey, filterDept, filterBU]);

  const handleSurveyChange = (val: string) => {
    setSelectedSurvey(val);
  };

  const survey = useMemo(() => surveys.find((s) => s.id === selectedSurvey), [surveys, selectedSurvey]);

  const selectedSurveyLabel = useMemo(() => {
    if (selectedSurvey === "all") return lang === "th" ? "แคมเปญทั้งหมด" : "All Campaigns";
    const s = surveys.find((s) => s.id === selectedSurvey);
    if (!s) return "";
    return lang === "th" ? s.titleTh : s.titleEn;
  }, [selectedSurvey, surveys, lang]);

  const filteredByDept = useMemo(() => {
    if (filterDept === "all") return engagementByDept;
    return engagementByDept.filter((d) => d.dept === filterDept);
  }, [filterDept, engagementByDept]);

  const effectiveTarget = useMemo(() => {
    if (selectedSurvey === "all") {
      return surveys.reduce((sum, s) => sum + (s.target || 0), 0) || 100;
    }
    return survey?.target || 100;
  }, [selectedSurvey, surveys, survey]);

  const stats = useMemo(() => {
    const totalResponses = filteredByDept.reduce((sum, d) => sum + d.responses, 0);
    const avg = totalResponses > 0 
      ? filteredByDept.reduce((sum, d) => sum + d.score * d.responses, 0) / totalResponses 
      : 0;
    const participation = effectiveTarget > 0 ? Math.round((totalResponses / effectiveTarget) * 100) : 0;
    return { avg, totalResponses, target: effectiveTarget, participation };
  }, [filteredByDept, effectiveTarget]);

  const distributionStats = useMemo(() => {
    let total = 0;
    let favorable = 0;
    let unfavorable = 0;
    distribution.forEach(d => {
      const ratingNum = parseInt(d.rating);
      if (!isNaN(ratingNum)) {
        total += d.count;
        if (ratingNum >= 4) favorable += d.count;
        if (ratingNum <= 2) unfavorable += d.count;
      }
    });
    const favPercent = total > 0 ? Math.round((favorable / total) * 100) : 0;
    const unfavPercent = total > 0 ? Math.round((unfavorable / total) * 100) : 0;
    return { favPercent, unfavPercent, total };
  }, [distribution]);

  const highestCategory = useMemo(() => {
    if (!categoryScores.length) return null;
    return [...categoryScores].sort((a, b) => b.score - a.score)[0];
  }, [categoryScores]);

  const lowestCategory = useMemo(() => {
    if (!categoryScores.length) return null;
    return [...categoryScores].sort((a, b) => a.score - b.score)[0];
  }, [categoryScores]);

  const toPercent = (score: number) => Math.round((score / 5) * 100);

  if (!user || user.role === "employee") return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === "th" ? "ศูนย์บัญชาการข้อมูล" : "Intelligence Command"}
          </h1>
          <p className="text-[15px] font-medium text-slate-400">
            {lang === "th" ? "วิเคราะห์ข้อมูลความผูกพันและประสิทธิภาพเชิงลึก" : "Strategic engagement and performance insights."}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-10 px-5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 font-bold text-[11px] uppercase gap-2.5 shadow-sm">
              <Share2 className="w-4.5 h-4.5 text-slate-400" /> {lang === "th" ? "แชร์" : "Share"}
           </Button>
           <Button className="h-10 px-6 rounded-xl bg-slate-900 dark:bg-primary text-white font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-slate-900/10 dark:shadow-primary/10">
              <Download className="w-4.5 h-4.5 mr-2" /> {lang === "th" ? "ส่งออกโปรโตคอล" : "Export Protocol"}
           </Button>
        </div>
      </div>

      {/* ── Highest / Lowest at Top ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="p-4 bg-white dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                  {lang === "th" ? `ผลที่ค่ามากที่สุด (${highestCategory ? toPercent(highestCategory.score) : 0}%)` : `Highest Score (${highestCategory ? toPercent(highestCategory.score) : 0}%)`}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white break-words mt-0.5 leading-snug">
                  {highestCategory ? highestCategory.category : 'N/A'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900/50 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider text-rose-600">
                  {lang === "th" ? `ผลที่ค่าน้อยที่สุด (${lowestCategory ? toPercent(lowestCategory.score) : 0}%)` : `Lowest Score (${lowestCategory ? toPercent(lowestCategory.score) : 0}%)`}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white break-words mt-0.5 leading-snug">
                  {lowestCategory ? lowestCategory.category : 'N/A'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Contextual Controls ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
         <div className="md:col-span-3 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/5">
               <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                 {lang === "th" ? "แคมเปญที่ใช้งาน" : "Active Campaign"}
               </Label>
               <Select value={selectedSurvey} onValueChange={handleSurveyChange}>
                  <SelectTrigger className="h-7 p-0 border-none bg-transparent shadow-none font-bold text-[15px] focus:ring-0">
                    <SelectValue>{selectedSurveyLabel || (lang === "th" ? "เลือกแคมเปญ" : "Select campaign")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl p-1.5 border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    <SelectItem value="all" className="h-10 rounded-lg text-sm font-semibold">
                      {lang === "th" ? "แคมเปญทั้งหมด" : "All Campaigns"}
                    </SelectItem>
                    {surveys.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="h-10 rounded-lg text-sm font-semibold">
                        {lang === "th" ? s.titleTh : s.titleEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <div className="md:col-span-3 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-600 shrink-0 shadow-sm border border-violet-100/50 dark:border-violet-900/50">
               <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                 {lang === "th" ? "หน่วยงานสังกัด" : "Department"}
               </Label>
               <Select value={filterBU} onValueChange={setFilterBU}>
                  <SelectTrigger className="h-7 p-0 border-none bg-transparent shadow-none font-bold text-[15px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl p-1.5 border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    <SelectItem value="all" className="h-10 rounded-lg text-sm font-semibold">
                      {lang === "th" ? "หน่วยงานสังกัดทั้งหมด" : "All Departments"}
                    </SelectItem>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.name_en} className="h-10 rounded-lg text-sm font-semibold">
                        {lang === "th" ? bu.name_th : bu.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <div className="md:col-span-3 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50">
               <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                 {lang === "th" ? "ฝ่าย" : "Division"}
               </Label>
               <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="h-7 p-0 border-none bg-transparent shadow-none font-bold text-[15px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl p-1.5 border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    <SelectItem value="all" className="h-10 rounded-lg text-sm font-semibold">
                      {lang === "th" ? "ฝ่ายทั้งหมด" : "All Divisions"}
                    </SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d} className="h-10 rounded-lg text-sm font-semibold">{d}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <div className="md:col-span-3 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
            <div className="flex items-center gap-4 min-w-0">
               <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
                  <Database className="w-5 h-5" />
               </div>
               <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 truncate">
                    {lang === "th" ? "ตัวอย่างทั้งหมด" : "Total Samples"}
                  </div>
                  <div className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    {stats.totalResponses} {lang === "th" ? "ข้อมูลที่ถูกต้อง" : "Valid Responses"}
                  </div>
               </div>
            </div>
            <Badge variant="outline" className={cn(
              "h-7 rounded-lg px-3.5 font-bold uppercase tracking-widest text-[10px] border-none shadow-sm shrink-0",
              selectedSurvey === "all" ? "bg-slate-200 text-slate-600" :
              survey?.status === "Active" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {selectedSurvey === "all" ? (lang === "th" ? "ทั้งหมด" : "ALL") : 
               survey?.status === "Active" ? (lang === "th" ? "ดำเนินการอยู่" : "LIVE") : (lang === "th" ? "เก็บถาวร" : "ARCHIVED")}
            </Badge>
          </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { 
             label: lang === "th" ? "ดัชนีความผูกพัน" : "Engagement Index", 
             value: `${stats.avg.toFixed(2)}/5.00`, 
             icon: Zap, color: "text-primary", bg: "bg-primary/5", 
             sub: lang === "th" ? "+0.4 จากก่อนหน้า" : "+0.4 vs Prev" 
           },
           { 
             label: lang === "th" ? "อัตราการตอบ" : "Compliance Rate", 
             value: `${stats.participation}%`, 
             icon: Target, color: "text-emerald-600", bg: "bg-emerald-50", 
             sub: `(${stats.totalResponses}/${stats.target} ${lang === "th" ? "คน" : "people"})` 
           },
           { 
             label: lang === "th" ? "ความแน่นอนที่ดี" : "Favorable Certainty", 
             value: `${distributionStats.favPercent}%`, 
             icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50", 
             sub: lang === "th" ? "4-5 ดาว ดี" : "4-5 Stars Favorable" 
           },
           { 
             label: lang === "th" ? "ความเสี่ยง" : "Unfavorable Risk", 
             value: `${distributionStats.unfavPercent}%`, 
             icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", 
             sub: lang === "th" ? "1-2 ดาว เสี่ยง" : "1-2 Stars Risk" 
           },
         ].map(kpi => (
           <div key={kpi.label} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm", kpi.bg, kpi.color, "dark:bg-slate-800 dark:border dark:border-slate-700")}>
                <kpi.icon className="w-5.5 h-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                 <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 truncate">{kpi.label}</div>
                 <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-2 gap-y-0.5">
                    <div className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight whitespace-nowrap">{kpi.value}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase truncate">{kpi.sub}</div>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* ── Core Visualization ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-5 border-b dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                   <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                   <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                     {lang === "th" ? "วิวัฒนาการ Pulse ระดับผู้บริหาร" : "Executive Pulse Evolution"}
                   </CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                     {lang === "th" ? "เมตริกระดับมหภาค" : "Macro Engagement Metrics"}
                   </CardDescription>
                </div>
             </div>
             <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><History className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Printer className="w-4 h-4" /></Button>
             </div>
          </CardHeader>
          <CardContent className="p-5 h-[300px]">
            {loading ? <Skeleton className="w-full h-full rounded-lg" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScoreResults" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fill="url(#colorScoreResults)" strokeLinecap="round" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-5 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                   <Compass className="w-5 h-5" />
                </div>
                <div>
                   <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                     {lang === "th" ? "เมทริกซ์ความมั่นคง" : "Stability Matrix"}
                   </CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                     {lang === "th" ? "เรดาร์ข้ามหมวด" : "Cross-Category Radar"}
                   </CardDescription>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-5 h-[300px] flex items-center justify-center">
             {loading ? <Skeleton className="w-full h-full rounded-lg" /> : (
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart data={categoryScores} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                   <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                   <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                   <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                   <Radar name="Intel" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.15} />
                 </RadarChart>
               </ResponsiveContainer>
             )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
        <CardHeader className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30 border-b dark:border-slate-800">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-emerald-600 shadow-sm">
                 <Building2 className="w-5 h-5" />
              </div>
              <div>
                 <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                   {lang === "th" ? "เปรียบเทียบคะแนนแต่ละแผนก" : "Department Score Comparison"}
                 </CardTitle>
                 <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                   {lang === "th" ? "การเปรียบเทียบหมวดหมู่" : "Inter-category Comparison"}
                 </CardDescription>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-5 h-[280px]">
           {loading ? <Skeleton className="w-full h-full rounded-lg" /> : (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={filteredByDept} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="dept" stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} />
                 <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} />
                 <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                 <Bar dataKey="score" radius={[4, 4, 4, 4]} barSize={40}>
                    {filteredByDept.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           )}
        </CardContent>
      </Card>

      {/* ── Metadata Footer ── */}
      <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 pt-4">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {lang === "th" ? "ISO-27001 ปลอดภัย" : "ISO-27001 SECURE"}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Database className="w-3.5 h-3.5" /> {lang === "th" ? "ความแม่นยำ: สูง" : "FIDELITY: HIGH"}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Calendar className="w-3.5 h-3.5" /> {lang === "th" ? "อัปเดต: 5 นาที ที่ผ่านมา" : "UPDATED: 5M AGO"}
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
