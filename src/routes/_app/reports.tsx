import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, FileBarChart, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const REPORTS = [
  { id: "r1", titleEn: "Executive Summary — Q2 2025", titleTh: "สรุปสำหรับผู้บริหาร — ไตรมาส 2/2568", type: "PDF", icon: FileText, date: "2025-05-01" },
  { id: "r2", titleEn: "Department Engagement Breakdown", titleTh: "รายละเอียดความผูกพันรายหน่วยงาน", type: "Excel", icon: FileSpreadsheet, date: "2025-04-28" },
  { id: "r3", titleEn: "Trend Analysis — 12 months", titleTh: "การวิเคราะห์แนวโน้ม 12 เดือน", type: "PDF", icon: FileBarChart, date: "2025-04-20" },
  { id: "r4", titleEn: "Open Feedback — Themes", titleTh: "ข้อเสนอแนะเชิงเปิด — แยกตามหัวข้อ", type: "PDF", icon: FileText, date: "2025-04-15" },
];

function ReportsPage() {
  const { t, lang } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("nav.reports")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "th" ? "ดาวน์โหลดรายงานสำหรับผู้บริหาร และส่งออกข้อมูล" : "Download executive reports and export data"}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-lg bg-primary-soft flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                </div>
                <CardTitle className="text-base mt-3 leading-snug">
                  {lang === "th" ? r.titleTh : r.titleEn}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {r.date}
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1.5" />
                    {lang === "th" ? "ดาวน์โหลด" : "Download"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
