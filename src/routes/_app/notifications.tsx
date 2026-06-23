import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, CheckCircle2, AlertCircle, Info, 
  Search, Trash2, Clock, 
  ChevronRight, Zap, 
  Terminal, Database, Lock, FileEdit, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification } from "@/lib/notifications";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t, lang } = useI18n();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter = 
        filter === "all" || 
        (filter === "unread" && !n.isRead) ||
        (filter === "important" && (n.type === "reminder" || n.type === "milestone"));
      
      const searchStr = (lang === "th" ? n.titleTh + n.descTh : n.titleEn + n.descEn).toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, searchQuery, lang]);

  const getTypeIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "survey": return <FileEdit className="w-4 h-4" />;
      case "reminder": return <Clock className="w-4 h-4" />;
      case "milestone": return <Target className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: AppNotification["type"]) => {
    switch (type) {
      case "survey": return "text-indigo-500 bg-indigo-50 border-indigo-100";
      case "reminder": return "text-amber-600 bg-amber-50 border-amber-100";
      case "milestone": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      default: return "text-slate-500 bg-slate-50 border-slate-100";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t("notifications.title")}</h1>
          <p className="text-[15px] font-medium text-slate-400">{t("notifications.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
           {unreadCount > 0 && (
             <Button variant="outline" className="h-10 px-5 rounded-xl font-bold text-[11px] uppercase gap-2.5 border-slate-200 shadow-sm" onClick={markAllAsRead}>
               <CheckCircle2 className="w-4.5 h-4.5 text-slate-400" /> {t("notifications.markAllRead")}
             </Button>
           )}
        </div>
      </div>

      {/* ── Tactical Search & Filters ── */}
      <div className="flex flex-col lg:flex-row gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <Input 
            placeholder={lang === "th" ? "ค้นหาการแจ้งเตือน..." : "Search notifications..."}
            className="h-11 pl-11 pr-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] font-medium focus-visible:ring-offset-0 focus-visible:ring-primary/20 shadow-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full lg:w-auto">
          <TabsList className="bg-white/50 dark:bg-slate-800/50 h-11 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1 w-full">
            <TabsTrigger value="all" className="h-9 px-6 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] transition-all">{t("notifications.all")}</TabsTrigger>
            <TabsTrigger value="unread" className="h-9 px-6 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] transition-all">{t("notifications.unread")}</TabsTrigger>
            <TabsTrigger value="important" className="h-9 px-6 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white bg-transparent text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] transition-all">{lang === "th" ? "สำคัญ" : "Important"}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Intelligence Feed ── */}
      <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 dark:text-slate-600 mx-auto animate-pulse">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{lang === "th" ? "ไม่มีการแจ้งเตือน" : "All clear"}</h3>
                <p className="text-sm text-slate-400 font-medium italic">{lang === "th" ? "ไม่มีการแจ้งเตือนใหม่" : "No new notifications at this time."}</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "group relative flex items-start gap-4 p-5 transition-all cursor-pointer",
                    !n.isRead ? "bg-white dark:bg-slate-900/50" : "bg-slate-50/30 dark:bg-slate-800/10 opacity-70 hover:opacity-100 hover:bg-white dark:hover:bg-slate-900/50"
                  )}
                >
                  {/* Unread Indicator Bar */}
                  {!n.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}

                  {/* Icon Node */}
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                    getTypeColor(n.type)
                  )}>
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Intelligence Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                           <div className="flex items-center gap-4">
                              <h4 className={cn(
                                "text-[15px] tracking-tight truncate",
                                !n.isRead ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-500 dark:text-slate-400"
                              )}>
                                {lang === "th" ? n.titleTh : n.titleEn}
                              </h4>
                              {!n.isRead && (
                                 <Badge className="h-6 px-2.5 rounded-lg border-none text-[9px] font-bold uppercase tracking-wider bg-primary text-white shadow-sm">NEW</Badge>
                              )}
                           </div>
                           <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-1 font-medium italic">
                              {lang === "th" ? n.descTh : n.descEn}
                           </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                           <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                             <Clock className="w-3.5 h-3.5" />
                             {n.time.toUpperCase()}
                           </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 pt-3 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                      <Button variant="link" className="p-0 h-auto text-[10px] font-bold uppercase tracking-widest text-primary gap-2 hover:no-underline">
                        {lang === "th" ? "ดูรายละเอียด" : "View Details"} <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Strip ── */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {lang === "th" 
            ? `แสดง ${filtered.length} จาก ${notifications.length} รายการ · ${unreadCount} รายการที่ยังไม่ได้อ่าน`
            : `${filtered.length} of ${notifications.length} notifications · ${unreadCount} unread`}
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
