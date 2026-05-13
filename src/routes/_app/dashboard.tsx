import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ENGAGEMENT_BY_DEPT, ENGAGEMENT_TREND, RESPONSE_DISTRIBUTION,
  CATEGORY_SCORES, HEATMAP_DATA, DEPARTMENTS, LEVELS, AGE_RANGES, TENURE, LOCATIONS,
  MOCK_SURVEYS, getSurveySections,
} from "@/lib/mock-data";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  TrendingUp, Users, ClipboardCheck, Activity, Filter, ArrowUpRight, Download, Sparkles,
  ClipboardList, Clock, CheckCircle2, HeartHandshake, CalendarDays, BarChart3, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const KPI_COLOR = "var(--color-chart-3)";

const PIE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

// ── Employee Dashboard ──
function EmployeeDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const pendingSurveys = MOCK_SURVEYS.filter((s) => s.status === "Active");
  const completedSurveys = MOCK_SURVEYS.filter((s) => s.status === "Closed");

  const recentSections = pendingSurveys.length > 0 ? getSurveySections(pendingSurveys[0].id) : [];
  const estMinutes = recentSections.reduce((sum, s) => sum + s.questions.length, 0) + 3;
  const estMinutesStr = lang === "th" ? `ประมาณ ${estMinutes} นาที` : `~${estMinutes} min`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {lang === "th" ? "ภาพรวมของฉัน" : "My Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {lang === "th" ? "สวัสดี" : "Hello"}, {user ? (lang === "th" ? user.nameTh : user.nameEn) : ""} 
          <span className="mx-1.5">·</span>
          {lang === "th" ? "ยินดีต้อนรับสู่รอบสำรวจ Q2" : "Welcome to the Q2 survey cycle"}
        </p>
      </div>

      {/* Pending surveys — CTA หลัก */}
      {pendingSurveys.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary-soft/20 to-background">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {lang === "th" ? `แบบสำรวจที่รอทำ (${pendingSurveys.length})` : `Pending surveys (${pendingSurveys.length})`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {lang === "th"
                    ? `ใช้เวลา ${estMinutesStr} · เสียงของคุณมีค่าต่อองค์กร`
                    : `Takes ${estMinutesStr} · Your voice matters`}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingSurveys.map((s) => {
                const isAnon = s.surveyType === "anonymous";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: isAnon ? "/survey/public/$id" : "/survey", params: isAnon ? { id: s.id } : undefined })}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{lang === "th" ? s.titleTh : s.titleEn}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{s.endDate !== "—" ? `${lang === "th" ? "ปิดรับ" : "Closes"} ${s.endDate}` : "—"}</span>
                        {isAnon && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                            {lang === "th" ? "ไม่ระบุตัวตน" : "Anonymous"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0">
                      {t("survey.start")}
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Activity, label: lang === "th" ? "คะแนนความผูกพัน" : "Engagement Score", value: "4.1", sub: lang === "th" ? "องค์กร" : "Company-wide" },
          { icon: Users, label: lang === "th" ? "มีส่วนร่วม" : "Participation", value: "78%", sub: lang === "th" ? "662/850 คน" : "662/850 responses" },
          { icon: ClipboardCheck, label: lang === "th" ? "ตอบแล้วปีนี้" : "Completed (YTD)", value: "3", sub: lang === "th" ? "จาก 4 ครั้ง" : "of 4 surveys" },
          { icon: HeartHandshake, label: lang === "th" ? "ครั้งล่าสุด" : "Last activity", value: lang === "th" ? "15 เม.ย." : "Apr 15", sub: lang === "th" ? "Annual Survey 2025" : "Annual Survey 2025" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wide">{k.label}</span>
              </div>
              <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend — read only */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              {lang === "th" ? "แนวโน้มความผูกพัน (รายไตรมาส)" : "Engagement Trend (Quarterly)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ENGAGEMENT_TREND} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis domain={[3, 5]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke={KPI_COLOR} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Your impact */}
        <Card className="bg-gradient-to-br from-primary-soft/10 to-background border-primary/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {lang === "th" ? "เสียงของคุณมีค่า" : "Your Voice Matters"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-success" />
                {lang === "th" ? "คะแนน Collaboration เพิ่มขึ้น 8%" : "Collaboration score up 8%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "th"
                  ? "จากผลสำรวจ Q1 พนักงานรู้สึกว่าการทำงานร่วมกันดีขึ้นอย่างมีนัยสำคัญ"
                  : "Based on Q1 results, employees report significantly better team collaboration."}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-warning" />
                {lang === "th" ? "ยังต้องพัฒนา: ค่าตอบแทน" : "Needs focus: Compensation"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "th"
                  ? "คะแนนค่าตอบแทนอยู่ที่ 3.7/5 — ทีม HR กำลังทบทวนนโยบายเพื่อปรับปรุง"
                  : "Compensation scores at 3.7/5 — HR is reviewing policies to improve."}
              </p>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate({ to: "/results" })}>
                {lang === "th" ? "ดูผลสำรวจทั้งหมด" : "View all results"}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed surveys history */}
      {completedSurveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              {lang === "th" ? "ประวัติการตอบแบบสำรวจ" : "Survey History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSurveys.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{lang === "th" ? s.titleTh : s.titleEn}</div>
                      <div className="text-xs text-muted-foreground">
                        <CalendarDays className="w-3 h-3 inline mr-0.5" />
                        {s.startDate} → {s.endDate} · {s.responses} {lang === "th" ? "คนตอบ" : "responses"}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{t("common.closed")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Admin / Manager Dashboard ──
function AdminDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [filterDept, setFilterDept] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [filterTenure, setFilterTenure] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const navigate = useNavigate();

  const hasFilters = [filterDept, filterLevel, filterAge, filterTenure, filterLocation].some((f) => f !== "all");

  const filteredEngagementByDept = useMemo(() => {
    if (filterDept === "all") return ENGAGEMENT_BY_DEPT;
    return ENGAGEMENT_BY_DEPT.filter((d) => d.dept === filterDept);
  }, [filterDept]);

  const totalResponses = useMemo(
    () => filteredEngagementByDept.reduce((s, d) => s + d.responses, 0),
    [filteredEngagementByDept]
  );

  const avgScore = useMemo(
    () => filteredEngagementByDept.length > 0
      ? (filteredEngagementByDept.reduce((s, d) => s + d.score * d.responses, 0) / totalResponses).toFixed(2)
      : "—",
    [filteredEngagementByDept, totalResponses]
  );

  const filterMultiplier = hasFilters ? 0.85 + Math.random() * 0.25 : 1;

  const kpis = [
    {
      label: t("dash.engagementScore"),
      value: avgScore !== "—" ? avgScore : "—",
      delta: hasFilters ? `±${(Math.random() * 0.2).toFixed(2)}` : "+0.12",
      icon: Activity,
      hint: lang === "th" ? "เทียบกับไตรมาสก่อน" : "vs last quarter",
    },
    {
      label: t("dash.participation"),
      value: `${Math.round(totalResponses / (hasFilters ? 120 : 850) * 100)}%`,
      delta: hasFilters ? `±${(Math.random() * 3).toFixed(1)}%` : "+5.4%",
      icon: Users,
      hint: hasFilters
        ? `${totalResponses} / ${Math.round(totalResponses / (hasFilters ? 0.78 : 0.78))}`
        : "662 / 850",
    },
    {
      label: t("dash.responses"),
      value: String(totalResponses || "662"),
      delta: hasFilters ? `±${Math.round(Math.random() * 30)}` : "+128",
      icon: ClipboardCheck,
      hint: lang === "th" ? "ในรอบนี้" : "this cycle",
    },
    {
      label: t("dash.activeSurveys"),
      value: hasFilters ? String(Math.ceil(1 * filterMultiplier)) : "1",
      delta: "—",
      icon: TrendingUp,
      hint: lang === "th" ? "เปิดรับอยู่" : "currently open",
    },
  ];

  const filteredHeatmap = useMemo(() => {
    if (filterDept === "all") return HEATMAP_DATA;
    return HEATMAP_DATA.filter((d) => d.dept === filterDept || d.dept === "HR");
  }, [filterDept]);

  const filteredCategory = useMemo(() => {
    if (filterDept === "all") return CATEGORY_SCORES;
    return CATEGORY_SCORES.map((c) => ({
      ...c,
      score: Math.max(1, Math.min(5, c.score + (Math.random() - 0.5) * 0.6)),
    }));
  }, [filterDept]);

  const filteredEngagementTrend = useMemo(() => {
    if (!hasFilters) return ENGAGEMENT_TREND;
    return ENGAGEMENT_TREND.map((t) => ({
      ...t,
      score: Math.max(1, Math.min(5, t.score + (Math.random() - 0.5) * 0.3)),
    }));
  }, [hasFilters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("dash.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("dash.subtitle")} · {lang === "th" ? "สวัสดี" : "Hello"}, {user ? (lang === "th" ? user.nameTh : user.nameEn) : ""}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1.5" />
          {t("common.export")}
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
            <Filter className="w-4 h-4" />
            {t("filter.title")}
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.department")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {DEPARTMENTS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.level")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {LEVELS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAge} onValueChange={setFilterAge}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.age")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {AGE_RANGES.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTenure} onValueChange={setFilterTenure}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.tenure")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {TENURE.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.location")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {LOCATIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterDept("all"); setFilterLevel("all"); setFilterAge("all"); setFilterTenure("all"); setFilterLocation("all"); }}>
              {lang === "th" ? "รีเซ็ต" : "Reset"}
            </Button>
          )}
        </div>
      </Card>

      {/* Anonymous survey CTA */}
      <button
        type="button"
        onClick={() => navigate({ to: "/survey/public/$id", params: { id: "s4" } })}
        className="w-full text-left group"
      >
        <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary-soft/30 via-primary-soft/10 to-transparent hover:from-primary-soft/40 hover:border-primary/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                {lang === "th" ? "ลองทำแบบสำรวจแบบไม่ระบุตัวตน" : "Try the anonymous survey"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lang === "th"
                  ? "ทดสอบระบบ Pulse Survey แบบไม่ระบุตัวตน พร้อมเอฟเฟกต์คอนเฟตติและภาพเคลื่อนไหว – ไม่ต้องล็อกอิน"
                  : "Test the anonymous Pulse Survey with confetti and animations – no login required."}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-primary shrink-0 group-hover:gap-2 transition-all">
              {lang === "th" ? "ไปเลย" : "Go"}
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </Card>
      </button>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</div>
                <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-3xl font-semibold tracking-tight">{k.value}</div>
                <div className="text-xs text-success font-medium flex items-center">
                  {k.delta !== "—" && <ArrowUpRight className="w-3 h-3" />}
                  {k.delta}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{k.hint}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("dash.byDept")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredEngagementByDept} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="dept" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 5]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="score" fill={KPI_COLOR} radius={[6, 6, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.distribution")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={RESPONSE_DISTRIBUTION}
                  dataKey="count"
                  nameKey="rating"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  isAnimationActive
                >
                  {RESPONSE_DISTRIBUTION.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.trend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredEngagementTrend} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis domain={[3, 5]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke={KPI_COLOR} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.categories")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={filteredCategory}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="var(--color-chart-1)" fill="var(--color-chart-3)" fillOpacity={0.5} isAnimationActive />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.heatmap")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <div></div>                <div className="text-center">{t("heatmap.colOrg")}</div><div className="text-center">{t("heatmap.colWork")}</div><div className="text-center">{t("heatmap.colEnv")}</div>
              </div>
              {filteredHeatmap.map((row) => (
                <div key={row.dept} className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 items-center">
                  <div className="text-xs font-medium">{row.dept}</div>
                  {(["A", "B", "C"] as const).map((k) => {
                    const v = row[k];
                    const intensity = Math.max(0, Math.min(1, (v - 3) / 2));
                    return (
                      <div
                        key={k}
                        className="h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors"
                        style={{
                          background: `color-mix(in oklab, var(--color-chart-3) ${intensity * 80 + 10}%, var(--color-muted))`,
                          color: intensity > 0.55 ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                        }}
                      >
                        {v.toFixed(1)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department participation list */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t("dash.participationByDept")}</CardTitle>
          <Badge variant="secondary">{t("dash.currentCycle")}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredEngagementByDept.map((d) => {
            const target = Math.round(d.responses * 1.3);
            const pct = Math.round((d.responses / target) * 100);
            return (
              <div key={d.dept} className="grid grid-cols-12 items-center gap-3 text-sm">
                <div className="col-span-4 font-medium truncate">{d.dept}</div>
                <div className="col-span-6"><Progress value={pct} className="h-2" /></div>
                <div className="col-span-2 text-right text-muted-foreground tabular-nums">
                  {d.responses}/{target} · {pct}%
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Role-gated wrapper ──
function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "employee") {
    return <EmployeeDashboard />;
  }
  return <AdminDashboard />;
}
