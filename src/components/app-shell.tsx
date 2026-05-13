import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, ClipboardList, ListChecks, Users, Building2, BarChart3,
  UserCircle2, LogOut, ShieldCheck, Globe, Moon, Sun, FileEdit,
  Bell, Menu, X, ChevronRight, ChevronLeft,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  labelKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  icon: typeof LayoutDashboard;
  roles?: Array<"super_admin" | "hr_admin" | "manager" | "employee">;
}

const NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/survey", labelKey: "nav.takeSurvey", icon: FileEdit },
  { to: "/results", labelKey: "nav.results", icon: BarChart3, roles: ["super_admin", "hr_admin", "manager"] },
  { to: "/notifications", labelKey: "nav.notifications", icon: Bell, roles: ["super_admin", "hr_admin", "manager", "employee"] },
  { to: "/admin/surveys", labelKey: "nav.surveys", icon: ClipboardList, roles: ["super_admin", "hr_admin"] },
  { to: "/admin/questions", labelKey: "nav.questions", icon: ListChecks, roles: ["super_admin", "hr_admin"] },
  { to: "/admin/users", labelKey: "nav.users", icon: Users, roles: ["super_admin", "hr_admin"] },
  { to: "/admin/departments", labelKey: "nav.departments", icon: Building2, roles: ["super_admin", "hr_admin"] },
  { to: "/reports", labelKey: "nav.reports", icon: FileEdit, roles: ["super_admin", "hr_admin", "manager"] },
  { to: "/profile", labelKey: "nav.profile", icon: UserCircle2 },
];

interface Notification {
  id: string;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  time: string;
  unread: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", titleTh: "แบบสำรวจใหม่", titleEn: "New survey available", descTh: "แบบสำรวจ Pulse Survey Q2 2025 เปิดให้ตอบแล้ว", descEn: "Pulse Survey Q2 2025 is now open", time: "2 นาที", unread: true },
  { id: "n2", titleTh: "ใกล้ปิดรับคำตอบ", titleEn: "Survey closing soon", descTh: "Annual Engagement Survey จะปิดใน 3 วัน", descEn: "Annual Engagement Survey closes in 3 days", time: "1 ชม.", unread: true },
  { id: "n3", titleTh: "รายงานพร้อมแล้ว", titleEn: "Report ready", descTh: "Executive Summary Q2 2025 พร้อมดาวน์โหลด", descEn: "Executive Summary Q2 2025 is ready to download", time: "1 วัน", unread: false },
  { id: "n4", titleTh: "ตอบกลับครบเป้า", titleEn: "Target reached", descTh: "แผนก IT ตอบกลับครบ 80% แล้ว", descEn: "IT department reached 80% response rate", time: "2 วัน", unread: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [notifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("hrpulse.sidebar.open") !== "false";
  });

  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      const next = !v;
      localStorage.setItem("hrpulse.sidebar.open", String(next));
      return next;
    });
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const items = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));
  const mainItems = items.filter((n) => !n.to.startsWith("/admin"));
  const adminItems = items.filter((n) => n.to.startsWith("/admin"));

  const NavLink = ({ item, onClick, active: forceActive }: { item: NavItem; onClick?: () => void; active?: boolean }) => {
    const Icon = item.icon;
    const active = forceActive ?? (pathname === item.to || pathname.startsWith(item.to + "/"));
    return (
      <Link
        to={item.to}
        onClick={onClick}
        className={cn(
          "flex items-center rounded-md text-sm transition-colors",
          sidebarOpen
            ? "gap-3 px-3 py-2.5"
            : "gap-0 px-0 py-2.5 justify-center",
          active
            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", sidebarOpen ? "" : "mx-auto")} />
        <span className={cn("overflow-hidden transition-all duration-200", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
          {t(item.labelKey)}
        </span>
      </Link>
    );
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {mainItems.map((item) => (
        <NavLink key={item.to} item={item} onClick={onClick} />
      ))}
      {adminItems.map((item) => (
        <NavLink key={item.to} item={item} onClick={onClick} />
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className={cn(
          "flex items-center border-b border-sidebar-border transition-all duration-200",
          sidebarOpen ? "px-6 py-6" : "pl-2 pr-0 py-4",
          "justify-between"
        )}>
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className={cn("rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0", sidebarOpen ? "w-9 h-9" : "w-8 h-8")}>
              <ShieldCheck className={cn("text-sidebar-primary-foreground", sidebarOpen ? "w-5 h-5" : "w-4 h-4")} />
            </div>
            <div className={cn("overflow-hidden transition-all duration-200", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
              <div className="font-semibold tracking-tight whitespace-nowrap">{t("app.name")}</div>
              <div className="text-[11px] text-sidebar-foreground/60 whitespace-nowrap">
                {t("app.taglineShort")}
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden transition-all duration-200",
          sidebarOpen ? "px-3 py-4 space-y-0.5" : "px-1.5 py-4 space-y-0.5"
        )}>
          <NavLinks />
        </nav>
        <div className={cn(
          "border-t border-sidebar-border transition-all duration-200",
          sidebarOpen ? "px-4 py-4" : "px-2 py-3"
        )}>
          {user && (
            <div className={cn(
              "flex items-center gap-3 mb-3",
              sidebarOpen ? "" : "justify-center"
            )}>
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium shrink-0">
                {user.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className={cn("overflow-hidden transition-all duration-200", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
                <div className="text-sm font-medium truncate whitespace-nowrap">
                  {lang === "th" ? user.nameTh : user.nameEn}
                </div>
                <div className="text-[11px] text-sidebar-foreground/60 truncate whitespace-nowrap capitalize">
                  {user.role.replace("_", " ")}
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size={sidebarOpen ? "sm" : "icon"}
            onClick={handleLogout}
            className={cn(
              "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              sidebarOpen ? "w-full justify-start" : "w-full justify-center"
            )}
          >
            <LogOut className={cn("shrink-0", sidebarOpen ? "w-4 h-4 mr-2" : "w-4 h-4")} />
            <span className={cn("overflow-hidden transition-all duration-200", sidebarOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
              {t("nav.logout")}
            </span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <div className="px-6 py-6 border-b border-sidebar-border flex items-center justify-between">
                  <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileNavOpen(false)}>
                    <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-sidebar-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold tracking-tight">{t("app.name")}</div>
                      <div className="text-[11px] text-sidebar-foreground/60">
                        {t("app.taglineShort")}
                      </div>
                    </div>
                  </Link>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                      <X className="w-4 h-4" />
                    </Button>
                  </SheetClose>
                </div>
                <nav className="px-3 py-4 space-y-0.5 overflow-y-auto">
                  <NavLinks onClick={() => setMobileNavOpen(false)} />
                </nav>
                <div className="px-4 py-4 border-t border-sidebar-border mt-auto">
                  {user && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium">
                        {user.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{lang === "th" ? user.nameTh : user.nameEn}</div>
                        <div className="text-[11px] text-sidebar-foreground/60 truncate capitalize">{user.role.replace("_", " ")}</div>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { handleLogout(); setMobileNavOpen(false); }}
                    className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.logout")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="md:hidden flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-semibold">{t("app.name")}</span>
            </div>
          </div>
          <div className="hidden md:block text-sm text-muted-foreground">
            {t("app.taglineLong")}
          </div>
          <div className="flex items-center gap-1">
            {/* Notification bell */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium">
                    {lang === "th" ? "การแจ้งเตือน" : "Notifications"}
                  </span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{unreadCount} {lang === "th" ? "ใหม่" : "new"}</Badge>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {lang === "th" ? "ไม่มีการแจ้งเตือน" : "No notifications"}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                          n.unread ? "bg-primary-soft/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium">{lang === "th" ? n.titleTh : n.titleEn}</div>
                          {n.unread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{lang === "th" ? n.descTh : n.descEn}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{n.time}{lang === "th" ? "ที่แล้ว" : " ago"}</div>
                      </button>
                    ))
                  )}
                </ScrollArea>
                <div className="px-4 py-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setNotifOpen(false); navigate({ to: "/notifications" }); }}>
                    {lang === "th" ? "ดูทั้งหมด" : "View all"}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "th" ? "en" : "th")}>
              <Globe className="w-4 h-4 mr-1.5" />
              {lang === "th" ? "TH" : "EN"}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle theme">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
