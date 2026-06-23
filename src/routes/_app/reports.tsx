import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, FileBarChart, Download, Search, 
  Filter, Calendar, Clock, Lock, 
  ArrowRight, Sparkles, Database, ShieldCheck,
  ChevronRight, Share2, Printer, Layers,
  Binary, Terminal, Info, Zap, BarChart3,
  TrendingUp, Users, Target, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

interface StrategicReport {
  id: string;
  titleEn: string;
  titleTh: string;
  category: "Executive" | "Engagement" | "Operational";
  date: string;
  size: string;
  type: "PDF" | "XLSX" | "JSON";
  security: "High" | "Standard";
  icon: any;
}

const MOCK_REPORTS: StrategicReport[] = [
  {
    id: "R1",
    titleEn: "Q2 Engagement Strategic Dossier",
    titleTh: "สรุปยุทธศาสตร์ความผูกพันพนักงาน Q2",
    category: "Executive",
    date: "2024-05-10",
    size: "4.2 MB",
    type: "PDF",
    security: "High",
    icon: FileBarChart,
  },
  {
    id: "R2",
    titleEn: "Operational Sentiment Raw Stream",
    titleTh: "ข้อมูลดิบความรู้สึกเชิงปฏิบัติการ",
    category: "Operational",
    date: "2024-05-09",
    size: "12.8 MB",
    type: "XLSX",
    security: "Standard",
    icon: Database,
  },
  {
    id: "R3",
    titleEn: "Leadership Alignment Analytics",
    titleTh: "บทวิเคราะห์ความสอดคล้องของผู้นำ",
    category: "Executive",
    date: "2024-05-01",
    size: "2.1 MB",
    type: "PDF",
    security: "High",
    icon: ShieldCheck,
  },
  {
    id: "R4",
    titleEn: "Cultural Node Connectivity Map",
    titleTh: "แผนผังการเชื่อมโยงวัฒนธรรมองค์กร",
    category: "Engagement",
    date: "2024-04-25",
    size: "1.5 MB",
    type: "JSON",
    security: "Standard",
    icon: Layers,
  },
];

function ReportsPage() {
  const { t, lang } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<StrategicReport | null>(null);

  const handlePreview = (report: StrategicReport) => {
    setSelectedReport(report);
    setIsPreviewing(true);
  };

  const filteredReports = useMemo(() => {
    return MOCK_REPORTS.filter(r => {
      const matchesTab = activeTab === "all" || r.category.toLowerCase() === activeTab.toLowerCase();
      const searchStr = (lang === "th" ? r.titleTh : r.titleEn).toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [searchQuery, activeTab, lang]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Intel Dossiers</h1>
          <p className="text-sm text-slate-400 font-medium">Strategic archive and executive-grade reports.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
              <Printer className="w-4 h-4 text-slate-400" /> Print Registry
           </Button>
           <Button size="sm" className="h-9 px-4 rounded-lg bg-slate-900 dark:bg-primary text-white font-bold text-xs uppercase tracking-wider gap-2 shadow-lg shadow-slate-900/10">
              <Sparkles className="w-4 h-4" /> Generate New Intel
           </Button>
        </div>
      </div>

      {isPreviewing && selectedReport ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-3 mb-2 no-print">
             <Button variant="ghost" size="sm" onClick={() => setIsPreviewing(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
               <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Back to Library
             </Button>
             <Separator orientation="vertical" className="h-4" />
             <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Previewing: {lang === 'th' ? selectedReport.titleTh : selectedReport.titleEn}</span>
           </div>

           {/* Print Friendly Summary Preview */}
           <Card className="print-container border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-950 max-w-5xl mx-auto transition-all">
              <div className="p-8 sm:p-12 space-y-10">
                 {/* Document Header */}
                 <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8">
                    <div className="space-y-3">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg no-print">
                             <BarChart3 className="w-7 h-7" />
                          </div>
                          <div>
                             <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">EXECUTIVE SUMMARY</h2>
                             <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Confidential Protocol</p>
                          </div>
                       </div>
                       <div className="pt-4">
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                             {lang === 'th' ? selectedReport.titleTh : selectedReport.titleEn}
                          </h1>
                       </div>
                    </div>
                    <div className="text-right space-y-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Identifier</p>
                       <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-300">#{selectedReport.id}-2024-X</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">Generated On</p>
                       <p className="text-sm font-bold text-slate-900 dark:text-slate-300">{selectedReport.date}</p>
                    </div>
                 </div>

                 {/* Key Metrics Grid */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 print-break-inside-avoid">
                    {[
                       { label: "Participation", value: "84.2%", icon: Users, color: "text-blue-600" },
                       { label: "Engagement Score", value: "4.12/5", icon: TrendingUp, color: "text-emerald-600" },
                       { label: "NPS Signal", value: "+42", icon: Target, color: "text-indigo-600" },
                       { label: "Stability", value: "Optimal", icon: Activity, color: "text-amber-600" },
                    ].map((m) => (
                       <div key={m.label} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2 shadow-sm">
                          <m.icon className={cn("w-5 h-5", m.color)} />
                          <div>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
                             <p className="text-xl font-black text-slate-900 dark:text-white">{m.value}</p>
                          </div>
                       </div>
                    ))}
                 </div>

                 {/* Word Cloud & Sentiment Analysis */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print-break-inside-avoid">
                    <div className="md:col-span-2 space-y-4">
                       <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" /> Key Voice Indicators
                       </h3>
                       <div className="flex flex-wrap gap-2 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
                          {[
                            { text: "Leadership", size: "text-xl", weight: "font-black" },
                            { text: "Communication", size: "text-lg", weight: "font-bold" },
                            { text: "Work-Life Balance", size: "text-base", weight: "font-semibold" },
                            { text: "Career Path", size: "text-base", weight: "font-semibold" },
                            { text: "Collaboration", size: "text-lg", weight: "font-bold" },
                            { text: "Tools", size: "text-sm", weight: "font-medium" },
                            { text: "Transparency", size: "text-base", weight: "font-semibold" },
                            { text: "Innovation", size: "text-sm", weight: "font-medium" },
                            { text: "Culture", size: "text-lg", weight: "font-bold" },
                          ].map((word) => (
                            <Badge key={word.text} variant="secondary" className={cn(word.size, word.weight, "px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-105")}>
                              {word.text}
                            </Badge>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-500" /> Sentiment Pulse
                       </h3>
                       <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 flex flex-col items-center justify-center gap-4 h-full min-h-[160px]">
                          <div className="text-4xl font-black text-emerald-500">78%</div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Positive Sentiment</p>
                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1 italic">Extracted from 428 raw comments.</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Body Content */}
                 <div className="space-y-8 print-break-inside-avoid">
                    <div className="space-y-3">
                       <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" /> Strategic Observations
                       </h3>
                       <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic">
                          Sentiment analysis indicates a strong correlation between management transparency and employee retention intent. 
                          The operational division demonstrates high resilience, though cross-functional friction remains a notable factor 
                          in long-term project delivery nodes.
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                       <div className="space-y-4">
                          <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Core Strengths</h4>
                          <div className="space-y-3">
                             {[
                               "Strong alignment with organizational mission (4.6/5)",
                               "Team-level psychological safety remains optimal",
                               "Workplace environmental standards exceeded targets"
                             ].map((text, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                   {text}
                                </div>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-widest border-l-4 border-rose-500 pl-4">Critical risk sectors</h4>
                          <div className="space-y-3">
                             {[
                               "Communication silos identified in Project Alpha",
                               "Work-load distribution parity requires investigation",
                               "Remote-access latency impacting digital wellbeing"
                             ].map((text, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                   {text}
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Document Footer */}
                 <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    <span>HR Pulse Intelligence System v4.12</span>
                    <div className="flex items-center gap-2">
                       <Lock className="w-3 h-3" /> Encrypted Protocol 
                    </div>
                    <span>CONFIDENTIAL DATA STREAM</span>
                 </div>
              </div>

              {/* Preview Actions */}
              <div className="bg-slate-900 p-6 flex justify-center gap-4 no-print border-t border-white/5">
                 <Button variant="outline" onClick={() => window.print()} className="bg-white/5 border-white/10 text-white hover:bg-white hover:text-slate-900 font-bold uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl transition-all">
                   <Printer className="w-4 h-4 mr-2" /> Commit to Paper (Print)
                 </Button>
                 <Button className="bg-primary text-white hover:bg-primary/90 font-bold uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl transition-all shadow-xl shadow-primary/20">
                   <Download className="w-4 h-4 mr-2" /> Export Strategic PDF
                 </Button>
              </div>
           </Card>
        </div>
      ) : (
        <>
      {/* ── Operational Status Strip ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Archived Dossiers", value: "128", icon: Database, color: "text-primary", bg: "bg-primary/5 dark:bg-primary/10" },
          { label: "Data Integrity", value: "S-RANK", icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Extraction Load", value: "Normal", icon: Zap, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map((stat) => (
           <div key={stat.label} className="flex items-center gap-4 p-3.5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
                 <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stat.value}</p>
              </div>
           </div>
        ))}
      </div>

      {/* ── Console Bar (Search & Filter) ── */}
      <div className="flex flex-col lg:flex-row gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder={lang === "th" ? "ค้นหารายงาน..." : "Search strategic dossiers..."} 
            className="h-10 pl-9 pr-4 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium dark:text-white focus-visible:ring-offset-0 focus-visible:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
          <TabsList className="bg-white/50 dark:bg-slate-800/50 h-10 p-1 rounded-lg border border-slate-200 dark:border-slate-700 gap-1 w-full">
            {["all", "executive", "operational", "engagement"].map((tab) => (
              <TabsTrigger 
                key={tab} 
                value={tab} 
                className="h-8 px-4 rounded-md data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-primary data-[state=active]:text-white bg-transparent text-slate-500 font-bold uppercase tracking-wider text-[10px] transition-all"
              >
                {tab === "all" ? "Global" : tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Reports Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredReports.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="group relative shadow-sm border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden hover:border-primary/20 dark:hover:border-primary/40 hover:shadow-md transition-all">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center border shadow-sm shrink-0",
                    r.type === "PDF" ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50" : 
                    r.type === "XLSX" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50" :
                    "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border-slate-200 dark:border-slate-800 dark:text-slate-400">
                      {r.type}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                       <Lock className="w-3 h-3" /> {r.security}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{r.category}</p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight min-h-[2.5rem] line-clamp-2 group-hover:text-primary transition-colors">
                    {lang === "th" ? r.titleTh : r.titleEn}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Archived</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {r.date}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Payload</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <Layers className="w-3 h-3" />
                      {r.size}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                   onClick={() => handlePreview(r)}
                   className="flex-1 h-9 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold uppercase tracking-widest text-[9px] shadow-sm hover:bg-primary transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2" /> Preview Intel
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Compact Distribution Module ── */}
      <div className="bg-slate-900 rounded-xl overflow-hidden relative group p-6 sm:p-8">
        <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 group-hover:scale-110 transition-transform duration-700">
          <Binary className="w-40 h-40 text-white" />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-primary shadow-inner shrink-0 border border-white/10">
            <Clock className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold text-white tracking-tight">Automated Distribution Protocol</h3>
            <p className="text-sm text-slate-400 font-medium max-w-2xl mt-1 italic">
              Configure recurring extraction nodes to ensure leadership is synchronized with sentiment streams.
            </p>
          </div>
          <Button size="sm" className="h-10 px-6 rounded-lg bg-white text-slate-900 hover:bg-primary hover:text-white font-bold uppercase tracking-wider text-xs transition-all shadow-xl shrink-0 group/pulse">
            Initiate Protocol
            <ArrowRight className="w-4 h-4 ml-2 group-hover/pulse:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* ── Professional Footer ── */}
      <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 pt-6">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3.5 h-3.5" /> v4.12.0
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Database className="w-3.5 h-3.5" /> GLOBAL-ALPHA
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" /> SOC3 COMPLIANT
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default ReportsPage;
