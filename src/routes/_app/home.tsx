import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getBulletinPostsFromDB } from "@/services/api/bulletin";
import type { BulletinPost, BulletinCategory } from "@/lib/mock-data";
import { getSurveys } from "@/services/api";
import type { MockSurvey } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home, Pin, Calendar, Tag, User, ChevronRight, ClipboardList,
  Megaphone, Shield, Cpu, Sparkles, BookOpen, AlertTriangle,
  Clock, ArrowRight, FileEdit, Search, ExternalLink, Link as LinkIcon,
  CheckCircle2, BarChart3, ListTodo, CalendarDays, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

// ── Category Config ──
const CATEGORY_CONFIG: Record<BulletinCategory, { labelTh: string; labelEn: string; color: string; bg: string; border: string; icon: typeof Megaphone }> = {
  general:  { labelTh: "ทั่วไป",          labelEn: "General",  color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200",   icon: Megaphone },
  hr:       { labelTh: "ทรัพยากรบุคคล",  labelEn: "HR",       color: "text-indigo-600",  bg: "bg-indigo-50",   border: "border-indigo-200",  icon: User },
  it:       { labelTh: "IT",              labelEn: "IT",       color: "text-cyan-600",    bg: "bg-cyan-50",     border: "border-cyan-200",    icon: Cpu },
  event:    { labelTh: "กิจกรรม",         labelEn: "Event",    color: "text-violet-600",  bg: "bg-violet-50",   border: "border-violet-200",  icon: Sparkles },
  policy:   { labelTh: "นโยบาย",          labelEn: "Policy",   color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200",   icon: BookOpen },
  safety:   { labelTh: "ความปลอดภัย",    labelEn: "Safety",   color: "text-rose-600",    bg: "bg-rose-50",     border: "border-rose-200",    icon: Shield },
};

const ALL_CATEGORIES: Array<BulletinCategory | "all"> = ["all", "general", "hr", "it", "event", "policy", "safety"];

function formatDate(iso: string, lang: "th" | "en"): string {
  try {
    const d = new Date(iso);
    if (lang === "th") return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

// ── Post Card ──
function PostCard({ post, lang }: { post: BulletinPost; lang: "th" | "en" }) {
  const [isOpen, setIsOpen] = useState(false);
  const cfg = CATEGORY_CONFIG[post.category];
  const CatIcon = cfg.icon;
  const title = lang === "th" ? post.titleTh : post.titleEn;
  const content = lang === "th" ? post.contentTh : post.contentEn;

  return (
    <>
      <Card 
        onClick={() => setIsOpen(true)}
        className={cn(
          "group relative overflow-hidden transition-all duration-500 rounded-2xl border bg-white dark:bg-slate-900/80 backdrop-blur-sm h-[320px] flex flex-col cursor-pointer",
          post.isPinned
            ? "border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-100/50 dark:shadow-indigo-900/20"
            : "border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:-translate-y-1"
        )}
      >
        {/* Pinned stripe */}
        {post.isPinned && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        )}

        {/* Cover image */}
        {post.imageUrl && (
          <div className="relative h-32 shrink-0 overflow-hidden">
            <img
              src={post.imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
            {post.isPinned && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-md text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                <Pin className="w-3 h-3" />
                <span>{lang === "th" ? "ปักหมุด" : "Pinned"}</span>
              </div>
            )}
          </div>
        )}

        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Pinned badge (no image) */}
                {post.isPinned && !post.imageUrl && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                    <Pin className="w-2.5 h-2.5" />
                    <span>{lang === "th" ? "ปักหมุด" : "Pinned"}</span>
                  </div>
                )}
                {/* Category badge */}
                <div className={cn("flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors", cfg.color, cfg.bg, cfg.border)}>
                  <CatIcon className="w-3 h-3" />
                  <span>{lang === "th" ? cfg.labelTh : cfg.labelEn}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3" />
                {formatDate(post.postedAt, lang)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {title}
            </h3>

            {/* Content */}
            <p className={cn(
              "text-xs text-slate-500 dark:text-slate-400 leading-relaxed",
              post.imageUrl ? "line-clamp-2" : "line-clamp-5"
            )}>
              {content}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-full">
              <User className="w-3 h-3 text-slate-400" />
              <span>{post.postedBy}</span>
            </div>
            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-all group/btn bg-indigo-50/50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full">
              {lang === "th" ? "อ่านเพิ่มเติม" : "Read more"}
              <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-0 gap-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {post.imageUrl && (
            <div className="relative h-64 w-full overflow-hidden">
              <img
                src={post.imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/10 to-transparent" />
            </div>
          )}
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {post.isPinned && (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
                    <Pin className="w-3 h-3" />
                    <span>{lang === "th" ? "ปักหมุด" : "Pinned"}</span>
                  </div>
                )}
                <div className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
                  <CatIcon className="w-3.5 h-3.5" />
                  <span>{lang === "th" ? cfg.labelTh : cfg.labelEn}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(post.postedAt, lang)}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {title}
              </h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{lang === "th" ? "โดย" : "By"}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {post.postedBy}
                </span>
              </div>
            </div>

            <div className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
              {content}
            </div>

            {/* Attached links */}
            {(post.links ?? []).filter((l) => l.url).length > 0 && (
              <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <LinkIcon className="w-3.5 h-3.5" />
                  {lang === "th" ? "เอกสาร/ลิงก์ที่แนบ" : "Attached Links"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(post.links ?? []).filter((l) => l.url).map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold border border-indigo-100 dark:border-indigo-800/50 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group/link"
                    >
                      <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center group-hover/link:bg-indigo-600 group-hover/link:text-white transition-colors">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </div>
                      {lang === "th"
                        ? (link.labelTh || link.labelEn || link.url)
                        : (link.labelEn || link.labelTh || link.url)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Survey Mini Card (matches CampaignInventory design) ──
function SurveyCard({ survey, lang, onStart }: { survey: MockSurvey; lang: "th" | "en"; onStart: () => void }) {
  return (
    <Card
      onClick={onStart}
      className="group relative overflow-hidden bg-white dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer rounded-2xl"
    >
      {/* Decorative watermark */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
        <ClipboardList className="w-16 h-16" />
      </div>

      <CardContent className="p-5 space-y-4 relative">
        {/* Icon + Status Badge */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-105 transition-all shadow-sm border border-slate-100 dark:border-slate-700">
            <ClipboardList className="w-5 h-5" />
          </div>
          <Badge variant={survey.status === "Active" ? "default" : "secondary"} className="h-5 text-[9px] font-bold uppercase tracking-wider px-2.5 rounded-full">
            {survey.status}
          </Badge>
        </div>

        {/* Title + Meta */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {lang === "th" ? survey.titleTh : survey.titleEn}
          </h3>
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              <ListChecks className="w-3.5 h-3.5 text-primary" />
              {survey.sectionIds.length} {lang === "th" ? "หมวดหมู่" : "Categories"}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              {lang === "th" ? "สิ้นสุด" : "Ends"} {survey.endDate}
            </div>
            <Badge variant="outline" className={cn(
              "h-5 text-[8px] font-bold uppercase tracking-widest rounded-lg border",
              survey.surveyType === "anonymous" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-primary/20 bg-primary/5 text-primary"
            )}>
              {survey.surveyType === "anonymous"
                ? (lang === "th" ? "ไม่ระบุตัวตน" : "Anonymous")
                : (lang === "th" ? "ระบุตัวตน" : "Identified")}
            </Badge>
          </div>
        </div>

        {/* Avatar stack + CTA */}
        <div className="pt-1 flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${survey.id}${i}`} alt="user" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shadow-sm">
              +{survey.responses}
            </div>
          </div>
          <Button size="sm" className="h-8 px-5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-md group-hover:bg-primary group-hover:shadow-primary/20 transition-all">
            {lang === "th" ? "เริ่มทำแบบสำรวจ" : "Start Survey"}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
function HomePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BulletinCategory | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setPostsLoading(true);
    getBulletinPostsFromDB().then((data) => {
      setPosts(data);
      setPostsLoading(false);
    });
    getSurveys().then((data) => setSurveys(data.filter((s) => s.status === "Active")));
  }, []);

  const pinnedPosts = useMemo(() => posts.filter((p) => p.isPinned), [posts]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    const isFiltering = activeCategory !== "all" || search.trim() !== "";
    
    if (!isFiltering) {
      list = list.filter((p) => !p.isPinned); // non-pinned only in main list when not filtering
    }

    if (activeCategory !== "all") list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.titleTh.toLowerCase().includes(q) ||
        p.titleEn.toLowerCase().includes(q) ||
        p.contentTh.toLowerCase().includes(q) ||
        p.contentEn.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [posts, activeCategory, search]);

  const greetingName = user ? (lang === "th" ? user.nameTh : user.nameEn) : "";

  // Quick stats for hero
  const activeSurveyCount = surveys.length;
  const totalPosts = posts.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Hero Banner ── */}
      <div className="relative py-2">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono uppercase tracking-[2.5px] text-slate-500 dark:text-slate-400">HR Pulse · Employee Portal</span>
        </div>

        {/* Greeting & Stats Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2.5 text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            <span className="animate-bounce inline-block">👋</span>
            <span>
              สวัสดี, <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">{greetingName || (lang === "th" ? "เพื่อนร่วมงาน" : "Colleague")}</span> Welcome to Real&Lo
            </span>
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse shrink-0" />
          </div>

          {/* Stats Chips (Formal & High Visibility) */}
          <div className="flex items-center gap-3 self-start lg:self-auto">
            {[
              {
                icon: ClipboardList,
                value: activeSurveyCount,
                labelTh: "แบบสำรวจเปิดอยู่",
                labelEn: "Active Surveys",
                color: "text-slate-950 dark:text-white border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900",
                badgeBg: "bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-200 dark:shadow-none",
              },
              {
                icon: Megaphone,
                value: totalPosts,
                labelTh: "ประกาศทั้งหมด",
                labelEn: "Announcements",
                color: "text-slate-950 dark:text-white border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900",
                badgeBg: "bg-violet-600 text-white font-extrabold shadow-sm shadow-violet-200 dark:shadow-none",
              },
            ].map((stat) => (
              <div
                key={stat.labelEn}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm transition-all hover:scale-[1.02]",
                  stat.color
                )}
              >
                <stat.icon className="w-3.5 h-3.5 opacity-85 shrink-0 text-slate-500 dark:text-slate-400" />
                <span>{lang === "th" ? stat.labelTh : stat.labelEn}</span>
                <span className={cn("px-2 py-0.5 rounded-lg text-xs font-black min-w-[22px] text-center", stat.badgeBg)}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── Main: Announcements ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Section header - Corporate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white/10 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-white dark:text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-[-0.3px] text-slate-900 dark:text-white">
                  {t("home.announcements")}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">Latest updates from leadership &amp; teams</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={lang === "th" ? "ค้นหาประกาศ..." : "Search announcements..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          {/* Category filter - Corporate Pills */}
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const isAll = cat === "all";
              const cfg = isAll ? null : CATEGORY_CONFIG[cat as BulletinCategory];
              const label = isAll
                ? (lang === "th" ? "ทั้งหมด" : "All")
                : (lang === "th" ? cfg!.labelTh : cfg!.labelEn);
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as BulletinCategory | "all")}
                  className={cn(
                    "px-5 py-2 rounded-2xl text-[10px] font-semibold uppercase tracking-[1.5px] transition-all duration-200 border",
                    active
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white shadow"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Pinned posts */}
          {pinnedPosts.length > 0 && activeCategory === "all" && !search && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Pin className="w-3.5 h-3.5" />
                <span>{t("home.pinned")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pinnedPosts.map((post) => (
                  <PostCard key={post.id} post={post} lang={lang} />
                ))}
              </div>
              {filteredPosts.length > 0 && (
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span>{lang === "th" ? "ประกาศล่าสุด" : "Latest Posts"}</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
              )}
            </div>
          )}

          {/* Regular posts */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mr-2.5" />
              <span className="text-xs font-medium">{lang === "th" ? "กำลังโหลดประกาศ..." : "Loading announcements..."}</span>
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} lang={lang} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 opacity-60">
              <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto border border-dashed border-slate-300 dark:border-slate-700">
                <Megaphone className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">{t("home.noAnnouncements")}</p>
            </div>
          )}
        </div>

        {/* ── Right Sidebar (sticky) ── */}
        <div className="space-y-6 sticky top-6 self-start">

          {/* My Surveys - Styled as a Bulletin Board (บอร์ดประชาสัมพันธ์) */}
          <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden shadow-xl shadow-slate-200/30 dark:shadow-black/20 flex flex-col">
            {/* Top decorative clip hanger rail */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500" />
            
            {/* Board Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight uppercase">
                    {t("home.surveys")}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                    {lang === "th" ? "บอร์ดแบบสำรวจสำหรับพนักงาน" : "Employee Survey Board"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Board Content (Displaying Document Memos) */}
            <div className="p-5 bg-slate-50/30 dark:bg-slate-950/20 space-y-6">
              {surveys.length > 0 ? (
                surveys.map((s) => (
                  <SurveyCard
                    key={s.id}
                    survey={s}
                    lang={lang}
                    onStart={() => navigate({ to: "/survey", search: { id: s.id } })}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t("home.noSurveys")}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default HomePage;
