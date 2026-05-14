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
import { 
  getEngagementTrend, 
  getCategoryScores, 
  getEngagementByDept,
  getWordFrequency,
  type EngagementTrend,
  type CategoryScore,
  type WordFreq,
  type EngagementByDept
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
  const [trendData, setTrendData] = useState<EngagementTrend[]>([]);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [wordFreq, setWordFreq] = useState<WordFreq[]>([]);
  
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === "employee") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    async function init() {
      try {
        const [s, d] = await Promise.all([getSurveys(), getDepartments()]);
        setSurveys(s);
        setDepartments(d);
        if (s.length > 0) {
          const firstId = s[0].id;
          setSelectedSurvey(firstId);
          loadAnalytics(firstId);
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

  const loadAnalytics = async (surveyId: string) => {
    setLoading(true);
    try {
      const [dept, trend, cats, words] = await Promise.all([
        getEngagementByDept(surveyId),
        getEngagementTrend(),
        getCategoryScores(),
        getWordFrequency(surveyId)
      ]);
      setEngagementByDept(dept);
      setTrendData(trend);
      setCategoryScores(cats);
      setWordFreq(words);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleSurveyChange = (val: string) => {
    setSelectedSurvey(val);
    loadAnalytics(val);
  };

  const survey = useMemo(() => surveys.find((s) => s.id === selectedSurvey), [surveys, selectedSurvey]);

  const filteredByDept = useMemo(() => {
    if (filterDept === "all") return engagementByDept;
    return engagementByDept.filter((d) => d.dept === filterDept);
  }, [filterDept, engagementByDept]);

  const stats = useMemo(() => {
    const totalResponses = filteredByDept.reduce((sum, d) => sum + d.responses, 0);
    const avg = totalResponses > 0 
      ? filteredByDept.reduce((sum, d) => sum + d.score * d.responses, 0) / totalResponses 
      : 0;
    const target = survey?.target || 100;
    const participation = Math.round((totalResponses / target) * 100);
    return { avg, totalResponses, target, participation };
  }, [filteredByDept, survey]);

  if (!user || user.role === "employee") return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Intelligence Command</h1>
          <p className="text-[15px] font-medium text-slate-400">
            {lang === "th" ? "วิเคราะห์ข้อมูลความผูกพันและประสิทธิภาพเชิงลึก" : "Strategic engagement and performance insights."}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-10 px-5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 font-bold text-[11px] uppercase gap-2.5 shadow-sm">
              <Share2 className="w-4.5 h-4.5 text-slate-400" /> Share
           </Button>
           <Button className="h-10 px-6 rounded-xl bg-slate-900 dark:bg-primary text-white font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-slate-900/10 dark:shadow-primary/10">
              <Download className="w-4.5 h-4.5 mr-2" /> Export Protocol
           </Button>
        </div>
      </div>

      {/* ── Contextual Controls ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
         <div className="md:col-span-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/5">
               <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Active Campaign</Label>
               <Select value={selectedSurvey} onValueChange={handleSurveyChange}>
                  <SelectTrigger className="h-7 p-0 border-none bg-transparent shadow-none font-bold text-[15px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl p-1.5 border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    {surveys.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="h-10 rounded-lg text-sm font-semibold">
                        {lang === "th" ? s.titleTh : s.titleEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <div className="md:col-span-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50">
               <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
               <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Topology Scope</Label>
               <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="h-7 p-0 border-none bg-transparent shadow-none font-bold text-[15px] focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl p-1.5 border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    <SelectItem value="all" className="h-10 rounded-lg text-sm font-semibold">Global Structure</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d} className="h-10 rounded-lg text-sm font-semibold">{d}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
          </div>
          <div className="md:col-span-4 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <Database className="w-5 h-5" />
               </div>
               <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Total Samples</div>
                  <div className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">{stats.totalResponses} Valid Packets</div>
               </div>
            </div>
            <Badge variant="outline" className={cn(
              "h-7 rounded-lg px-3.5 font-bold uppercase tracking-wider text-[10px] border-none shadow-sm",
              survey?.status === "Active" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {survey?.status === "Active" ? "LIVE" : "ARCHIVED"}
            </Badge>
          </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: "Engagement Index", value: stats.avg.toFixed(2), icon: Zap, color: "text-primary", bg: "bg-primary/5", sub: "+0.4 vs Prev" },
           { label: "Compliance Rate", value: `${stats.participation}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50", sub: "98% Fidelity" },
           { label: "Signal Density", value: "S-Rank", icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50", sub: "Integrity Verified" },
           { label: "Structural Risk", value: "Minimal", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", sub: "Safety Cleared" },
         ].map(kpi => (
           <div key={kpi.label} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm", kpi.bg, kpi.color, "dark:bg-slate-800 dark:border dark:border-slate-700")}>
                <kpi.icon className="w-5.5 h-5.5" />
              </div>
              <div>
                 <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{kpi.label}</div>
                 <div className="flex items-baseline gap-2">
                    <div className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{kpi.value}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{kpi.sub}</div>
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
                   <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Executive Pulse Evolution</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Macro Engagement Metrics</CardDescription>
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

        <Card className="lg:col-span-4 border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-slate-900 text-white">
          <CardHeader className="px-6 py-5 pb-0">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary shadow-sm">
                   <Compass className="w-5 h-5" />
                </div>
                <div>
                   <CardTitle className="text-base font-bold tracking-tight text-white">Stability Matrix</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Cross-Category Radar</CardDescription>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-5 h-[300px] flex items-center justify-center">
             {loading ? <Skeleton className="w-full h-full bg-white/5 rounded-lg" /> : (
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart data={categoryScores} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                   <PolarGrid stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                   <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                   <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                   <Radar name="Intel" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.4} />
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
                 <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Cross-Sectional Dynamics</CardTitle>
                 <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Inter-category Comparison</CardDescription>
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

      {/* ── Sentiment & Logic Nodes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
               </div>
               <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Strategic Asset</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{categoryScores[0]?.category}</div>
               </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
               Highest trust indices detected. This domain is your primary stability anchor.
            </p>
         </div>

         <div className="p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
               </div>
               <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Opportunity Window</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{categoryScores[categoryScores.length-1]?.category}</div>
               </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
               Variance detected in participation chain. Targeted intervention recommended.
            </p>
         </div>

         <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-lg bg-white/10 text-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
               </div>
               <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Personnel Voice Stream</div>
                  <div className="text-sm font-bold text-white">Sentiment Cloud</div>
               </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
               {wordFreq.slice(0, 6).map(w => (
                 <Badge key={w.text} className="bg-white/5 border-white/10 text-[8px] font-bold uppercase px-2 py-1 rounded-md text-slate-400">
                    {w.text}
                 </Badge>
               ))}
            </div>
         </div>
      </div>
      
      {/* ── Metadata Footer ── */}
      <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 pt-4">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> ISO-27001 SECURE
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Database className="w-3.5 h-3.5" /> FIDELITY: HIGH
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Calendar className="w-3.5 h-3.5" /> UPDATED: 5M AGO
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
