import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, FileBarChart, Download, Search, 
  Filter, Calendar, Clock, Lock, 
  ArrowRight, Sparkles, Database, ShieldCheck,
  ChevronRight, Share2, Printer, Layers,
  Binary, Terminal, Info, Zap
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Intel Dossiers</h1>
          <p className="text-sm text-muted-foreground">Strategic archive and executive-grade reports.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200">
              <Printer className="w-4 h-4 text-slate-400" /> Print Registry
           </Button>
           <Button size="sm" className="h-9 px-4 rounded-lg bg-slate-900 text-white font-bold text-xs uppercase tracking-wider gap-2">
              <Sparkles className="w-4 h-4" /> Generate New Intel
           </Button>
        </div>
      </div>

      {/* ── Operational Status Strip ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Archived Dossiers", value: "128", icon: Database, color: "text-primary", bg: "bg-primary/5" },
          { label: "Data Integrity", value: "S-RANK", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Extraction Load", value: "Normal", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
           <div key={stat.label} className="flex items-center gap-4 p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm", stat.bg, stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
                 <p className="text-xl font-bold text-slate-900 leading-tight">{stat.value}</p>
              </div>
           </div>
        ))}
      </div>

      {/* ── Console Bar (Search & Filter) ── */}
      <div className="flex flex-col lg:flex-row gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder={lang === "th" ? "ค้นหารายงาน..." : "Search strategic dossiers..."} 
            className="h-10 pl-9 pr-4 rounded-lg border-slate-200 bg-white text-sm font-medium focus-visible:ring-offset-0 focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
          <TabsList className="bg-white/50 h-10 p-1 rounded-lg border border-slate-200 gap-1 w-full">
            {["all", "executive", "operational", "engagement"].map((tab) => (
              <TabsTrigger 
                key={tab} 
                value={tab} 
                className="h-8 px-4 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 font-bold uppercase tracking-wider text-[10px] transition-all"
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
            <Card key={r.id} className="group relative shadow-sm border-slate-100 rounded-xl bg-white overflow-hidden hover:border-primary/20 hover:shadow-md transition-all">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center border shadow-sm shrink-0",
                    r.type === "PDF" ? "bg-rose-50 text-rose-600 border-rose-100" : 
                    r.type === "XLSX" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border-slate-200">
                      {r.type}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                       <Lock className="w-3 h-3" /> {r.security}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">{r.category}</p>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight min-h-[2.5rem] line-clamp-2">
                    {lang === "th" ? r.titleTh : r.titleEn}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Archived</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Calendar className="w-3 h-3" />
                      {r.date}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Payload</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Layers className="w-3 h-3" />
                      {r.size}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button className="flex-1 h-9 rounded-lg bg-slate-900 text-white font-bold uppercase tracking-widest text-[9px] shadow-sm hover:bg-primary transition-all">
                    <Download className="w-3.5 h-3.5 mr-2" /> Extract
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all">
                    <Share2 className="w-4 h-4" />
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
    </div>
  );
}

export default ReportsPage;
