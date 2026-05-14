import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, BarChart3, TrendingUp, Calendar, 
  ArrowRight, Sparkles, MessageSquare, 
  Activity, Target, Zap, Brain, Shield,
  Globe, Compass, Database, Terminal, Clock,
  ChevronRight, Building2, Layers, History, Star, Filter,
  Heart, UserCheck, Fingerprint, ZapOff
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { getCategoryScores, getEngagementTrend, getEngagementByDept, getHeatmapData, getRecentSubmissions } from "@/services/api/analytics";
import { getSections, type SurveySection } from "@/services/api/surveys";
import { 
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Employee Hero ── */}
      <div className="relative group overflow-hidden rounded-3xl bg-slate-900 text-white p-10 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 transition-transform duration-1000 group-hover:scale-110">
          <Star className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shrink-0">
             <Zap className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2 flex-1 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-2 text-primary">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-[13px] font-bold uppercase tracking-[0.2em]">Status: Mission Active</span>
             </div>
             <h1 className="text-3xl font-bold tracking-tight">
               {lang === "th" ? `ยินดีต้อนรับ, ${user?.nameTh}` : `Welcome back, ${user?.nameEn}`}
             </h1>
             <p className="text-[15px] text-slate-400 font-medium max-w-xl">
               {lang === "th" ? "ร่วมสร้างวัฒนธรรมองค์กรที่ดีผ่านเสียงของคุณ" : "Your insights drive our collective evolution."}
             </p>
          </div>
          <Button size="lg" className="h-12 px-10 rounded-2xl bg-white text-slate-900 hover:bg-primary hover:text-white font-bold text-[13px] uppercase tracking-wider transition-all group/btn shrink-0 shadow-lg">
             Start Survey
             <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Surveys Completed", value: "12", sub: "100% Fidelity", icon: Target, color: "text-primary dark:text-primary", bg: "bg-primary/5 dark:bg-primary/10" },
          { label: "Engagement Streak", value: "4 Cycles", sub: "Top 5% Contributor", icon: Activity, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Voice Impact", value: "High", sub: "3 Suggestions Implemented", icon: MessageSquare, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
        ].map((kpi) => (
          <div key={kpi.label} className="flex items-center gap-5 p-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm group hover:shadow-md transition-all">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", kpi.bg, kpi.color)}>
              <kpi.icon className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{kpi.label}</div>
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
  const [trendData, setTrendData] = useState<any[]>([]);
  const [realCats, setRealCats] = useState<any[]>([]);
  const [engagementByDept, setEngagementByDept] = useState<any[]>([]);
  const [allSections, setAllSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [trend, cats, depts, heatmap, sectionsRes, recent] = await Promise.all([
          getEngagementTrend(),
          getCategoryScores(),
          getEngagementByDept(),
          getHeatmapData(),
          getSections(),
          getRecentSubmissions(8)
        ]);
        setTrendData(trend);
        setRealCats(cats);
        setEngagementByDept(depts);
        setHeatmapData(heatmap);
        setAllSections(sectionsRes);
        setRecentSubmissions(recent);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }
    load();
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synthesizing Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Admin Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Mission Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-400">Operational Dashboard</h1>
          <p className="text-[15px] font-medium text-slate-400">
            {lang === "th" ? "ภาพรวมสถานะความผูกพันของบุคลากร" : "Real-time organizational health monitoring."}
          </p>
        </div>
        <div className="flex items-center gap-6 p-4 px-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
           <div className="text-right">
              <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400">Pulse Index</span>
              <div className="text-2xl font-bold text-primary dark:text-white tabular-nums tracking-tight">{pulseIndex}</div>
           </div>
           <Separator orientation="vertical" className="h-10 mx-1" />
           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <TrendingUp className="w-6 h-6" />
           </div>
        </div>
      </div>

      {/* ── Dynamic Layout Grid ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-6 p-4 px-6 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Filter className="w-4 h-4" />
             </div>
             <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Time Horizon</span>
          </div>
          <div className="flex gap-2">
            {["7D", "30D", "90D", "1Y"].map((d) => (
              <Button key={d} variant="ghost" size="sm" className={cn("h-8 px-4 rounded-xl text-[11px] font-bold transition-all", d === "30D" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>{d}</Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Grid: Trend & Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                  <BarChart3 className="w-4.5 h-4.5" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight dark:text-white">Engagement Momentum</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time-series Trend Analysis</CardDescription>
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
                          <p className="text-lg font-bold text-white">{payload[0].value} <span className="text-[10px] text-slate-400 font-normal">Avg Score</span></p>
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

        <Card className="lg:col-span-4 border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-slate-900 text-white">
          <CardHeader className="px-6 py-4 pb-0">
             <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                  <Layers className="w-4.5 h-4.5" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight text-white">Distribution</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Response Volume</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 h-[280px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={engagementByDept}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="responses"
                   nameKey="dept"
                   stroke="none"
                   cornerRadius={6}
                 >
                   {engagementByDept.map((entry, index) => (
                     <Cell 
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[index % PIE_COLORS.length]} 
                        className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                      />
                   ))}
                 </Pie>
                  <Tooltip 
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                    wrapperStyle={{ zIndex: 100 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-sm min-w-[140px] animate-in fade-in zoom-in duration-150">
                            <div className="flex items-center gap-2 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: payload[0].payload.fill || payload[0].color }}></div>
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                {payload[0].name}
                              </p>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                {payload[0].value}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Responses</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    iconSize={8}
                    formatter={(value: string) => <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">{value}</span>}
                  />
               </PieChart>
             </ResponsiveContainer>
             {/* Center Label */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                <span className="text-xl font-bold text-white">{engagementByDept.reduce((acc, d) => acc + d.responses, 0)}</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mid Grid: Heatmap & Live Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Compass className="w-4.5 h-4.5" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Fidelity Heatmap</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sectional Performance Density</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div 
                className="grid gap-2 px-2"
                style={{ gridTemplateColumns: `120px repeat(${sectionCodes.length}, minmax(0, 1fr))` }}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node</div>
                <TooltipProvider>
                  {sectionCodes.map(code => {
                    const section = allSections.find(s => s.id === code || s.code === code);
                    return (
                      <UITooltip key={code}>
                        <TooltipTrigger asChild>
                          <div className="text-center text-[10px] font-bold uppercase tracking-widest text-primary cursor-help hover:text-primary/70 transition-colors bg-primary/5 dark:bg-primary/10 rounded py-0.5 border border-primary/10">
                            {code}
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
                      style={{ gridTemplateColumns: `120px repeat(${sectionCodes.length}, minmax(0, 1fr))` }}
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
                            className={cn(
                              "h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shadow-sm transition-all hover:scale-105 border",
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

        <Card className="lg:col-span-4 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                  <Heart className="w-4.5 h-4.5 animate-pulse" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Live Pulse Feed</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incoming Voice Intelligence</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Live</span>
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
                         <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Waiting for Input...</p>
                      </div>
                   )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Brain className="w-4.5 h-4.5" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Stability Radar</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Multidimensional Metrics</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
               <RadarChart data={realCats} cx="50%" cy="50%" outerRadius="80%">
                <PolarGrid stroke="#cbd5e1" strokeWidth={1} className="dark:opacity-10" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fontWeight: 700, fill: "#64748b" }} />
                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                <Radar 
                  name="Score" 
                  dataKey="score" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fill="#6366f1" 
                  fillOpacity={0.25} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 14, 
                    border: "1px solid #e2e8f0", 
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", 
                    fontWeight: "700", 
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontSize: "11px"
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                  <Users className="w-4.5 h-4.5" />
               </div>
               <div>
                  <CardTitle className="text-sm font-bold tracking-tight dark:text-white">Participation Registry</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operational Compliance</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Avg Compliance</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">78.4%</div>
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
                      <th className="px-6 py-3.5">Node</th>
                      <th className="px-6 py-3.5">Fidelity</th>
                      <th className="px-6 py-3.5 text-right">Metric</th>
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
      <div className="flex flex-wrap items-center justify-center gap-6 opacity-30 pt-4">
        {[
          { icon: Terminal, text: "Protocol 2.4-STABLE" },
          { icon: Database, text: "APAC-PRIMARY" },
          { icon: Shield, text: "SOC3 COMPLIANT" },
        ].map(item => (
          <div key={item.text} className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-slate-500">
            <item.icon className="w-3 h-3" />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "employee") return <EmployeeDashboard />;
  return <AdminDashboard />;
}

export default DashboardPage;
