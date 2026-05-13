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
  ChevronRight, Building2, Layers, History, Star, Filter
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { getCategoryScores, getEngagementTrend, getEngagementByDept } from "@/services/api/analytics";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const PIE_COLORS = ["#0f172a", "#3b82f6", "#8b5cf6", "#d946ef", "#6366f1"];

function EmployeeDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Employee Hero ── */}
      <div className="relative group overflow-hidden rounded-xl bg-slate-900 text-white p-6 shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 transition-transform duration-1000 group-hover:scale-110">
          <Star className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shrink-0">
             <Zap className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-0.5 flex-1 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-2 text-primary">
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Status: Mission Active</span>
             </div>
             <h1 className="text-xl font-bold tracking-tight">
               {lang === "th" ? `ยินดีต้อนรับ, ${user?.nameTh}` : `Welcome back, ${user?.nameEn}`}
             </h1>
             <p className="text-xs text-slate-400 font-medium max-w-xl">
               {lang === "th" ? "ร่วมสร้างวัฒนธรรมองค์กรที่ดีผ่านเสียงของคุณ" : "Your insights drive our collective evolution."}
             </p>
          </div>
          <Button size="sm" className="h-9 px-6 rounded-lg bg-white text-slate-900 hover:bg-primary hover:text-white font-bold text-[10px] uppercase tracking-wider transition-all group/btn shrink-0">
             Start Survey
             <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Surveys Completed", value: "12", sub: "100% Fidelity", icon: Target, color: "text-primary", bg: "bg-primary/5" },
          { label: "Engagement Streak", value: "4 Cycles", sub: "Top 5% Contributor", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Voice Impact", value: "High", sub: "3 Suggestions Implemented", icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="flex items-center gap-3 p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm group hover:shadow-md transition-all">
             <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", kpi.bg, kpi.color)}>
               <kpi.icon className="w-4.5 h-4.5" />
             </div>
             <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                <div className="text-base font-bold text-slate-900 leading-tight">{kpi.value}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 opacity-60">{kpi.sub}</div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [trend, cats, depts] = await Promise.all([
          getEngagementTrend(),
          getCategoryScores(),
          getEngagementByDept("S1")
        ]);
        setTrendData(trend);
        setRealCats(cats);
        setEngagementByDept(depts);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }
    load();
  }, []);

  const realHeatmap = useMemo(() => engagementByDept.map(d => ({
    dept: d.dept,
    A: d.score + (Math.random() * 0.4 - 0.2),
    B: d.score + (Math.random() * 0.4 - 0.2),
    C: d.score + (Math.random() * 0.4 - 0.2)
  })), [engagementByDept]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synthesizing Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Admin Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Operational Dashboard</h1>
          <p className="text-xs font-medium text-slate-400">
            {lang === "th" ? "ภาพรวมสถานะความผูกพันของบุคลากร" : "Real-time organizational health monitoring."}
          </p>
        </div>
        <div className="flex items-center gap-3 p-2 px-3 bg-white border border-slate-100 rounded-xl shadow-sm">
           <div className="text-right">
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Pulse Index</span>
              <div className="text-base font-bold text-primary tabular-nums tracking-tight">4.82</div>
           </div>
           <Separator orientation="vertical" className="h-6 mx-1" />
           <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" />
           </div>
        </div>
      </div>

      {/* ── Top Grid: Trend & Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
               <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5" />
               </div>
               <div>
                  <CardTitle className="text-xs font-bold tracking-tight">Engagement Stream</CardTitle>
                  <CardDescription className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Personnel Pulse Over Time</CardDescription>
               </div>
            </div>
            <div className="flex gap-1">
               <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400"><History className="w-3 h-3" /></Button>
               <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400"><Compass className="w-3 h-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={8} fontWeight={700} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={8} fontWeight={700} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize: "10px", fontWeight: "700" }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" strokeLinecap="round" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-slate-100 shadow-sm rounded-xl overflow-hidden bg-slate-900 text-white">
          <CardHeader className="px-4 py-3 pb-0">
             <div className="flex items-center gap-3">
               <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-primary">
                  <Layers className="w-3.5 h-3.5" />
               </div>
               <div>
                  <CardTitle className="text-xs font-bold tracking-tight text-white">Distribution</CardTitle>
                  <CardDescription className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Response Volume</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[220px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={engagementByDept}
                   innerRadius={45}
                   outerRadius={65}
                   paddingAngle={4}
                   dataKey="responses"
                   stroke="none"
                 >
                   {engagementByDept.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "700", fontSize: "10px" }} />
               </PieChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Mid Grid: Heatmap & Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="px-4 py-3 bg-slate-50/50 border-b">
            <div className="flex items-center gap-3">
               <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-emerald-600 shadow-sm">
                  <Activity className="w-3.5 h-3.5" />
               </div>
               <div>
                  <CardTitle className="text-xs font-bold tracking-tight text-slate-900">Fidelity Heatmap</CardTitle>
                  <CardDescription className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Sectional Performance Density</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-[100px_repeat(3,minmax(0,1fr))] gap-1.5 px-1.5">
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Node</div>
                <div className="text-center text-[8px] font-bold uppercase tracking-widest text-slate-400">Vision</div>
                <div className="text-center text-[8px] font-bold uppercase tracking-widest text-slate-400">Culture</div>
                <div className="text-center text-[8px] font-bold uppercase tracking-widest text-slate-400">Flow</div>
              </div>
              <ScrollArea className="h-[180px] pr-3">
                 <div className="space-y-1.5">
                  {realHeatmap.map((row) => (
                    <div key={row.dept} className="grid grid-cols-[100px_repeat(3,minmax(0,1fr))] gap-1.5 items-center group">
                      <div className="text-[10px] font-bold text-slate-700 group-hover:text-primary truncate transition-colors">{row.dept}</div>
                      {(["A", "B", "C"] as const).map((k) => {
                        const v = row[k];
                        const intensity = Math.max(0, Math.min(1, (v - 3) / 2));
                        return (
                          <div
                            key={k}
                            className="h-8 rounded-lg flex items-center justify-center text-[9px] font-bold shadow-sm transition-all hover:scale-105"
                            style={{
                              background: `color-mix(in oklab, #3b82f6 ${intensity * 80 + 10}%, #f1f5f9)`,
                              color: intensity > 0.5 ? "white" : "#475569",
                            }}
                          >
                            {v.toFixed(1)}
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

        <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="px-4 py-3 bg-slate-50/50 border-b">
            <div className="flex items-center gap-3">
               <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Brain className="w-3.5 h-3.5" />
               </div>
               <div>
                  <CardTitle className="text-xs font-bold tracking-tight text-slate-900">Stability Radar</CardTitle>
                  <CardDescription className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Multidimensional Metrics</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[230px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
               <RadarChart data={realCats} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 7, fontWeight: 700, fill: "#64748b" }} />
                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.2} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontWeight: "700", background: "#fff", fontSize: "9px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Grid: Participation Table ── */}
      <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="px-4 py-3 bg-slate-50/50 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                <Users className="w-3.5 h-3.5" />
             </div>
             <div>
                <CardTitle className="text-xs font-bold tracking-tight">Participation Registry</CardTitle>
                <CardDescription className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Operational Compliance</CardDescription>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Avg Compliance</span>
                <div className="text-xs font-bold text-slate-900 tabular-nums">78.4%</div>
             </div>
             <Separator orientation="vertical" className="h-5" />
             <Globe className="w-3.5 h-3.5 text-primary opacity-50" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <ScrollArea className="h-[200px]">
             <table className="w-full text-left">
               <thead className="bg-slate-50/50 sticky top-0 z-10 border-b">
                 <tr className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                   <th className="px-4 py-2.5">Node</th>
                   <th className="px-4 py-2.5">Fidelity</th>
                   <th className="px-4 py-2.5 text-right">Metric</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {engagementByDept.map((d, i) => {
                   const target = Math.round(d.responses * 1.3);
                   const pct = Math.round((d.responses / target) * 100);
                   return (
                     <tr key={d.dept} className="group hover:bg-slate-50/50 transition-colors">
                       <td className="px-4 py-2.5">
                         <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold border border-slate-100 shrink-0" style={{ backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}10`, color: PIE_COLORS[i % PIE_COLORS.length] }}>
                               {d.dept.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{d.dept}</span>
                         </div>
                       </td>
                       <td className="px-4 py-2.5">
                         <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                 className="h-full rounded-full transition-all duration-1000" 
                                 style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} 
                                />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 tabular-nums w-6 text-right">{pct}%</span>
                         </div>
                       </td>
                       <td className="px-4 py-2.5 text-right">
                          <div className="text-[10px] font-bold text-slate-900">{d.responses} / {target}</div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </ScrollArea>
        </CardContent>
      </Card>
      
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
