import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, ClipboardList, ListChecks, Users, Building2, BarChart3,
  UserCircle2, LogOut, ShieldCheck, Globe, Moon, Sun, FileEdit, BarChart2,
  Bell, Menu, ChevronRight, ChevronLeft, Activity, Signal,
  Clock, FileText, Layers, Database, Compass, Home, Target,
} from "lucide-react";
import { useEffect, useState, useMemo, memo, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// ── Isolated clock – avoids re-rendering the whole shell every second ──
const LiveClock = memo(() => {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3 group cursor-default">
      <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
        <Clock className="w-5 h-5" />
      </div>
      <div className="space-y-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">System Time</div>
        <div className="text-[15px] font-bold tracking-tight text-foreground tabular-nums leading-none">
          {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>
    </div>
  );
});

interface NavItem {
  to: string;
  labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  icon: typeof LayoutDashboard;
  roles?: Array<"super_admin" | "hr_admin" | "manager" | "employee">;
}

const NAV: NavItem[] = [
  { to: "/home",             labelKey: "nav.home",          icon: Home },
  { to: "/dashboard",        labelKey: "nav.dashboard",     icon: LayoutDashboard, roles: ["super_admin","hr_admin","manager"] },
  { to: "/results",          labelKey: "nav.results",       icon: BarChart3,    roles: ["super_admin","hr_admin","manager"] },
  { to: "/admin/surveys",    labelKey: "nav.surveys",       icon: ClipboardList,roles: ["super_admin","hr_admin"] },
  { to: "/admin/home",       labelKey: "nav.adminHome",     icon: Home,          roles: ["super_admin","hr_admin"] },
  { to: "/admin/questions",  labelKey: "nav.questions",     icon: ListChecks,   roles: ["super_admin","hr_admin"] },
  { to: "/admin/users",      labelKey: "nav.users",         icon: Users,        roles: ["super_admin","hr_admin"] },
  { to: "/admin/personnel-mapping",labelKey: "nav.personnelMapping",icon: Compass, roles: ["super_admin","hr_admin"] },
  { to: "/admin/raw-data",      labelKey: "nav.rawData",      icon: Database,      roles: ["super_admin","hr_admin"] },
  { to: "/admin/sss-config",    labelKey: "nav.sssConfig",    icon: Target,        roles: ["super_admin","hr_admin"] },
  { to: "/reports",          labelKey: "nav.reports",       icon: BarChart2,    roles: ["super_admin","hr_admin","manager"] },
  { to: "/profile",          labelKey: "nav.profile",       icon: UserCircle2 },
];



// ── NavLink extracted at module level – never recreated on parent re-render ──
interface NavLinkProps {
  item: NavItem;
  pathname: string;
  sidebarOpen: boolean;
  t: ReturnType<typeof useI18n>["t"];
  onClick?: () => void;
}

const NavLink = memo(({ item, pathname, sidebarOpen, t, onClick }: NavLinkProps) => {
  const Icon = item.icon;
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center transition-colors duration-200",
        sidebarOpen ? "px-3 py-2.5 mx-2 rounded-xl gap-3" : "px-0 py-3 justify-center",
        active
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      <div className={cn("flex items-center justify-center shrink-0", sidebarOpen ? "w-6 h-6" : "w-7 h-7")}>
        <Icon className={cn(active ? "w-5 h-5" : "w-5 h-5")} />
      </div>

      {sidebarOpen && (
        <span className="font-semibold text-[15px] tracking-tight whitespace-nowrap truncate">
          {t(item.labelKey)}
        </span>
      )}

      {active && sidebarOpen && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
      )}
    </Link>
  );
});

// ── NavLinks block extracted to module level ──
interface NavLinksProps {
  mainItems: NavItem[];
  adminItems: NavItem[];
  pathname: string;
  sidebarOpen: boolean;
  t: ReturnType<typeof useI18n>["t"];
  onClick?: () => void;
}

const NavLinks = memo(({ mainItems, adminItems, pathname, sidebarOpen, t, onClick }: NavLinksProps) => (
  <div className="space-y-0">
    {mainItems.map((item) => (
      <NavLink key={item.to} item={item} pathname={pathname} sidebarOpen={sidebarOpen} t={t} onClick={onClick} />
    ))}

    {adminItems.length > 0 && (
      <>
        <div className={cn("pt-5 pb-2 px-6", !sidebarOpen && "flex justify-center px-0 pt-5")}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 select-none">Admin Control</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
          ) : (
            <div className="w-4 h-px bg-border/40" />
          )}
        </div>
        {adminItems.map((item) => (
          <NavLink key={item.to} item={item} pathname={pathname} sidebarOpen={sidebarOpen} t={t} onClick={onClick} />
        ))}
      </>
    )}
  </div>
));

// ── Main Shell ──
export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const [dark, setDark] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("hrpulse.sidebar.open") !== "false";
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      const next = !v;
      localStorage.setItem("hrpulse.sidebar.open", String(next));
      return next;
    });
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };

  const items      = useMemo(() => NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role))), [user]);
  const mainItems  = useMemo(() => items.filter((n) => !n.to.startsWith("/admin")), [items]);
  const adminItems = useMemo(() => items.filter((n) => n.to.startsWith("/admin")), [items]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">

      {/* ── Desktop Sidebar ── */}
      <aside className={cn(
        "hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-300 ease-in-out relative z-50 shrink-0 sticky top-0 h-screen",
        sidebarOpen ? "w-[280px]" : "w-[80px]"
      )}>

        {/* Branding */}
        <div className={cn("flex items-center h-[72px] border-b border-slate-100 dark:border-slate-800 shrink-0", sidebarOpen ? "px-6 gap-3" : "justify-center")}>
          <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5.5 h-5.5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-[15px] font-black tracking-tight text-foreground truncate uppercase">{t("app.name")}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Operational</span>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          <NavLinks
            mainItems={mainItems}
            adminItems={adminItems}
            pathname={pathname}
            sidebarOpen={sidebarOpen}
            t={t}
          />
        </nav>

        {/* User Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-2.5 space-y-1">
          {user && (
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                !sidebarOpen && "justify-center"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600">
                {user.avatarUrl && !avatarFailed ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setAvatarFailed(true)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[12px] font-bold text-foreground bg-muted">
                    {user.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-foreground truncate">{lang === "th" ? user.nameTh : user.nameEn}</div>
                  <div className="text-[12px] font-medium text-muted-foreground truncate capitalize">{user.role.replace("_", " ")}</div>
                </div>
              )}
            </Link>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-16 w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-[60]"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-[72px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-6">

            {/* Mobile hamburger */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-lg">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 border-none bg-white dark:bg-slate-900">
                <div className="h-full flex flex-col">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{t("app.name")}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mobile</div>
                    </div>
                  </div>
                  <nav className="flex-1 py-4">
                    <NavLinks mainItems={mainItems} adminItems={adminItems} pathname={pathname} sidebarOpen t={t} onClick={() => setMobileNavOpen(false)} />
                  </nav>
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleLogout} className="w-full h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-semibold text-sm flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Clock – isolated component, won't re-render parent */}
            <div className="hidden xl:block">
              <LiveClock />
            </div>

            {/* Sync indicator */}
            <div className="hidden lg:flex items-center gap-2">
              <Signal className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Synced</span>
            </div>

            {/* Mobile brand */}
            <div className="md:hidden flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">{t("app.name")}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "th" ? "ไทย" : "EN"}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {dark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Sign out button */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              title={lang === "th" ? "ออกจากระบบ" : "Sign Out"}
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>

            <Separator orientation="vertical" className="h-6 mx-1 dark:bg-slate-700" />

            {/* Notification bell */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <button className="relative w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold border-2 border-white dark:border-slate-900 shadow-sm px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900 mt-2" align="end">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        Read all
                      </button>
                    )}
                    {unreadCount > 0 && (
                      <Badge className="bg-rose-500 text-white border-none text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                </div>
                <ScrollArea className="max-h-[400px]">
                  <div>
                    {notifications.map((n) => (
                      <button key={n.id} type="button" className={cn(
                        "w-full text-left px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative",
                        !n.isRead && "bg-indigo-50/40 dark:bg-indigo-950/30"
                      )}>
                        {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 rounded-r" />}
                        <div className="flex items-start gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            n.type === "survey" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" :
                            n.type === "reminder" ? "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400" :
                            n.type === "milestone" ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400" :
                            "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                          )}>
                            {n.type === "survey" ? <FileEdit className="w-4 h-4" /> :
                             n.type === "reminder" ? <Clock className="w-4 h-4" /> :
                             n.type === "milestone" ? <Target className="w-4 h-4" /> :
                             <Activity className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{lang === "th" ? n.titleTh : n.titleEn}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{lang === "th" ? n.descTh : n.descEn}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    className="w-full h-9 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors flex items-center justify-center gap-2"
                    onClick={() => { setNotifOpen(false); navigate({ to: "/notifications" }); }}
                  >
                    View all notifications <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Main workspace */}
        <main className="flex-1 p-6 md:p-8 lg:px-10 lg:py-8 max-w-[1800px] w-full mx-auto animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
