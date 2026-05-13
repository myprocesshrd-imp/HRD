import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENGAGEMENT_BY_DEPT, ENGAGEMENT_TREND, CATEGORY_SCORES, MOCK_SURVEYS, DEPARTMENTS } from "@/lib/mock-data";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  BarChart3, TrendingUp, Download, Filter, ArrowUpRight, Activity,
} from "lucide-react";

export const Route = createFileRoute("/_app/results")({
  component: ResultsPage,
});

function ResultsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [selectedSurvey, setSelectedSurvey] = useState(MOCK_SURVEYS[0]?.id ?? "");
  const [filterDept, setFilterDept] = useState("all");

  const survey = MOCK_SURVEYS.find((s) => s.id === selectedSurvey);

  const filteredByDept = useMemo(() => {
    if (filterDept === "all") return ENGAGEMENT_BY_DEPT;
    return ENGAGEMENT_BY_DEPT.filter((d) => d.dept === filterDept);
  }, [filterDept]);

  const avgScore = useMemo(
    () => filteredByDept.reduce((s, d) => s + d.score * d.responses, 0) / filteredByDept.reduce((s, d) => s + d.responses, 0),
    [filteredByDept]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {lang === "th" ? "ผลสำรวจ" : "Survey Results"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "th" ? "วิเคราะห์ผลสำรวจและแนวโน้ม" : "Analyze survey results and trends"}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1.5" />
          {t("common.export")}
        </Button>
      </div>

      {/* Survey selector + filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
            <BarChart3 className="w-4 h-4" />
            {lang === "th" ? "แบบสำรวจ" : "Survey"}
          </div>
          <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
            <SelectTrigger className="h-9 w-[250px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_SURVEYS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {lang === "th" ? s.titleTh : s.titleEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-border mx-2" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>{t("common.department")}</span>
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <SelectValue placeholder={t("common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary card */}
      {survey && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{lang === "th" ? survey.titleTh : survey.titleEn}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={survey.status === "Active" ? "default" : "secondary"}>
                    {survey.status === "Active" ? t("common.active") : survey.status === "Closed" ? t("common.closed") : t("common.draft")}
                  </Badge>
                  <Badge variant={survey.surveyType === "anonymous" ? "outline" : "default"} className="text-[10px]">
                    {survey.surveyType === "anonymous" ? (lang === "th" ? "ไม่ระบุตัวตน" : "Anonymous") : (lang === "th" ? "ระบุตัวตน" : "Identified")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{survey.startDate} → {survey.endDate}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold tracking-tight">{avgScore.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{t("dash.engagementScore")}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-semibold">{survey.responses}</div>
                <div className="text-xs text-muted-foreground">{t("dash.responses")}</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{Math.round((survey.responses / survey.target) * 100)}%</div>
                <div className="text-xs text-muted-foreground">{t("dash.participation")}</div>
              </div>
              <div>
                <div className="text-2xl font-semibold flex items-center justify-center gap-1 text-success">
                  <ArrowUpRight className="w-4 h-4" />
                  +{((avgScore / 3.8 - 1) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {lang === "th" ? "เทียบไตรมาสก่อน" : "vs last quarter"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.byDept")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredByDept} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="dept" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 5]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="score" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.trend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ENGAGEMENT_TREND} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis domain={[3, 5]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="var(--color-chart-3)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.categories")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={CATEGORY_SCORES}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="var(--color-chart-1)" fill="var(--color-chart-3)" fillOpacity={0.5} isAnimationActive />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Survey info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              {lang === "th" ? "ข้อมูลเชิงลึก" : "Insights"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-md bg-primary-soft/50 border border-primary/20">
              <div className="text-sm font-medium">
                {lang === "th" ? "หมวดหมู่ที่ได้คะแนนสูงสุด" : "Highest scoring category"}
              </div>
              <div className="text-2xl font-semibold mt-1 text-primary">
                {CATEGORY_SCORES.reduce((a, b) => (a.score > b.score ? a : b)).category}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {CATEGORY_SCORES.reduce((a, b) => (a.score > b.score ? a : b)).score.toFixed(1)} / 5.0
              </div>
            </div>
            <div className="p-4 rounded-md bg-muted/30 border border-border">
              <div className="text-sm font-medium">
                {lang === "th" ? "หมวดหมู่ที่ควรปรับปรุง" : "Needs improvement"}
              </div>
              <div className="text-2xl font-semibold mt-1 text-destructive">
                {CATEGORY_SCORES.reduce((a, b) => (a.score < b.score ? a : b)).category}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {CATEGORY_SCORES.reduce((a, b) => (a.score < b.score ? a : b)).score.toFixed(1)} / 5.0
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
