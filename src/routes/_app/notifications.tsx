import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, CheckCircle2, AlertCircle, Info, 
  Search, Filter, Trash2, Clock, 
  ChevronRight, Sparkles, MessageSquare, 
  BellRing, Zap, ShieldAlert,
  Terminal, Database, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "alert";
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  time: string;
  unread: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "alert",
    titleEn: "Urgent: Participation Threshold Detected",
    titleTh: "ด่วน: ตรวจพบเกณฑ์การมีส่วนร่วมต่ำกว่ากำหนด",
    descEn: "Department 'Operations-B' is currently at 42% participation. Strategic intervention recommended.",
    descTh: "แผนก Operations-B มีส่วนร่วมเพียง 42% แนะนำให้เข้าตรวจสอบเชิงกลยุทธ์",
    time: "2 mins ago",
    unread: true,
  },
  {
    id: "2",
    type: "success",
    titleEn: "Pulse Campaign Finalized",
    titleTh: "แคมเปญ Pulse Survey เสร็จสมบูรณ์",
    descEn: "Q2 Engagement Survey data has been fully processed and crystallized in the intelligence hub.",
    descTh: "ประมวลผลข้อมูลการสำรวจ Q2 เสร็จสมบูรณ์แล้ว ข้อมูลพร้อมใช้งานที่ศูนย์วิเคราะห์",
    time: "4 hours ago",
    unread: true,
  },
  {
    id: "3",
    type: "info",
    titleEn: "System Synchronization Complete",
    titleTh: "ซิงโครไนซ์ระบบเสร็จสมบูรณ์",
    descEn: "HRMS data mapping has been updated with the latest organizational structural nodes.",
    descTh: "อัปเดตข้อมูลโครงสร้างองค์กรจากระบบ HRMS เรียบร้อยแล้ว",
    time: "1 day ago",
    unread: false,
  },
  {
    id: "4",
    type: "warning",
    titleEn: "Anomalous Sentiment Detected",
    titleTh: "ตรวจพบความรู้สึกที่ผิดปกติ",
    descEn: "Unusual keyword frequency spikes detected in 'Workplace Culture' open-text nodes.",
    descTh: "ตรวจพบความถี่คำสำคัญที่ผิดปกติในส่วนความคิดเห็นด้านวัฒนธรรมองค์กร",
    time: "2 days ago",
    unread: false,
  },
];

function NotificationsPage() {
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter = 
        filter === "all" || 
        (filter === "unread" && n.unread) ||
        (filter === "important" && (n.type === "alert" || n.type === "warning"));
      
      const searchStr = (lang === "th" ? n.titleTh + n.descTh : n.titleEn + n.descEn).toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, searchQuery, lang]);

  const toggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, unread: false } : n
    ));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "alert": return <AlertCircle className="w-4 h-4" />;
      case "warning": return <BellRing className="w-4 h-4" />;
      case "success": return <CheckCircle2 className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "alert": return "text-rose-500 bg-rose-50 border-rose-100";
      case "warning": return "text-amber-600 bg-amber-50 border-amber-100";
      case "success": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      default: return "text-primary bg-primary/5 border-primary/10";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Signal Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitoring critical organizational pulse signals.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200" onClick={markAllRead}>
              <CheckCircle2 className="w-4 h-4 text-slate-400" /> Acknowledge All
           </Button>
           <Button size="sm" className="h-9 px-4 rounded-lg bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
              Stream Settings
           </Button>
        </div>
      </div>

      {/* ── Tactical Search & Filters ── */}
      <div className="flex flex-col lg:flex-row gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search signals..." 
            className="h-10 pl-9 pr-4 rounded-lg border-slate-200 bg-white text-sm font-medium focus-visible:ring-offset-0 focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full lg:w-auto">
          <TabsList className="bg-white/50 h-10 p-1 rounded-lg border border-slate-200 gap-1 w-full">
            <TabsTrigger value="all" className="h-8 px-4 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 font-bold uppercase tracking-wider text-[10px] transition-all">Global Feed</TabsTrigger>
            <TabsTrigger value="unread" className="h-8 px-4 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 font-bold uppercase tracking-wider text-[10px] transition-all">Active Nodes</TabsTrigger>
            <TabsTrigger value="important" className="h-8 px-4 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 font-bold uppercase tracking-wider text-[10px] transition-all">Priority Signals</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Intelligence Feed ── */}
      <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 mx-auto animate-pulse">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Intelligence Synchronized</h3>
                <p className="text-sm text-slate-400 font-medium italic">New dispatch nodes will materialize here.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => toggleRead(n.id)}
                  className={cn(
                    "group relative flex items-start gap-4 p-5 transition-all cursor-pointer",
                    n.unread ? "bg-white" : "bg-slate-50/30 opacity-70 hover:opacity-100 hover:bg-white"
                  )}
                >
                  {/* Unread Indicator Bar */}
                  {n.unread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}

                  {/* Icon Node */}
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                    getTypeColor(n.type)
                  )}>
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Intelligence Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                       <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-3">
                             <h4 className={cn(
                               "text-sm tracking-tight truncate",
                               n.unread ? "font-bold text-slate-900" : "font-semibold text-slate-500"
                             )}>
                               {lang === "th" ? n.titleTh : n.titleEn}
                             </h4>
                             {n.unread && (
                                <Badge className="h-5 px-2 rounded-md border-none text-[8px] font-bold uppercase tracking-wider bg-primary text-white shadow-sm">NEW</Badge>
                             )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-1 font-medium italic">
                             {lang === "th" ? n.descTh : n.descEn}
                          </p>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                            <Clock className="w-3 h-3" />
                            {n.time.toUpperCase()}
                          </span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-2 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                      <Button variant="link" className="p-0 h-auto text-[9px] font-bold uppercase tracking-widest text-primary gap-1.5 hover:no-underline">
                        Access Intel <ChevronRight className="w-3 h-3" />
                      </Button>
                      <button className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1.5">
                        <Trash2 className="w-3 h-3" /> Decommission
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Compact Information Strip ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-xl bg-slate-900 text-white relative overflow-hidden shadow-md">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Persistence Protocol</div>
            <div className="text-sm font-bold tracking-tight">Nodes older than 90D are auto-decommissioned.</div>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10">
           <Button variant="ghost" className="h-9 px-4 rounded-lg font-bold text-[9px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">
             Retention Policy
           </Button>
           <Button className="h-9 px-6 rounded-lg font-bold text-[9px] uppercase tracking-widest bg-white text-slate-900 hover:bg-primary hover:text-white transition-all shadow-xl">
             Configure Feed
           </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8 opacity-30 pt-4">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3.5 h-3.5" /> v2.4.0-STABLE
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Database className="w-3.5 h-3.5" /> APAC-PRIORITY
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Lock className="w-3.5 h-3.5" /> ENCRYPTED FEED
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
