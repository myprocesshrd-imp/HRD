import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, Filter, ArrowLeft, ChevronRight } from "lucide-react";

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
  { id: "n1", titleTh: "แบบสำรวจใหม่", titleEn: "New survey available", descTh: "แบบสำรวจ Pulse Survey Q2 2025 เปิดให้ตอบแล้ว คลิกเพื่อเริ่มทำแบบสำรวจ", descEn: "Pulse Survey Q2 2025 is now open. Click to start.", time: "2 นาที", unread: true },
  { id: "n2", titleTh: "ใกล้ปิดรับคำตอบ", titleEn: "Survey closing soon", descTh: "Annual Engagement Survey จะปิดใน 3 วัน อย่าลืมตอบก่อนวันที่ 31 พ.ค.", descEn: "Annual Engagement Survey closes in 3 days. Respond before May 31.", time: "1 ชม.", unread: true },
  { id: "n3", titleTh: "รายงานพร้อมแล้ว", titleEn: "Report ready", descTh: "Executive Summary Q2 2025 พร้อมดาวน์โหลดแล้วที่หน้ารายงาน", descEn: "Executive Summary Q2 2025 is ready to download on the reports page.", time: "1 วัน", unread: false },
  { id: "n4", titleTh: "ตอบกลับครบเป้า", titleEn: "Target reached", descTh: "แผนก IT ตอบกลับครบ 80% แล้ว ยอดเยี่ยม!", descEn: "IT department reached 80% response rate. Great job!", time: "2 วัน", unread: false },
  { id: "n5", titleTh: "อัปเดตนโยบาย", titleEn: "Policy update", descTh: "นโยบายการทำงานทางไกล (Work from Home) มีการปรับปรุงล่าสุด โปรดอ่านรายละเอียด", descEn: "Work from Home policy has been updated. Please review the details.", time: "3 วัน", unread: true },
  { id: "n6", titleTh: "การประเมินประจำปี", titleEn: "Annual review", descTh: "รอบการประเมินประจำปี 2568 เริ่มเปิดให้ประเมินแล้ว ตั้งแต่วันที่ 1 มิ.ย.", descEn: "Annual performance review for 2025 opens June 1.", time: "5 วัน", unread: false },
  { id: "n7", titleTh: "แบบสำรวจใหม่", titleEn: "New survey", descTh: "แบบสำรวจความคิดเห็นพนักงานใหม่ (Onboarding Feedback) เปิดให้ตอบแล้ว", descEn: "Onboarding Feedback survey is now open for new employees.", time: "1 สัปดาห์", unread: true },
  { id: "n8", titleTh: "เตือน: เปลี่ยนรหัสผ่าน", titleEn: "Password reminder", descTh: "รหัสผ่านของคุณจะหมดอายุใน 7 วัน กรุณาเปลี่ยนรหัสผ่าน", descEn: "Your password will expire in 7 days. Please change it.", time: "1 สัปดาห์", unread: false },
];

type FilterMode = "all" | "unread" | "read";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<FilterMode>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return n.unread;
    if (filter === "read") return !n.unread;
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {lang === "th" ? "การแจ้งเตือน" : "Notifications"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "th" ? "ติดตามกิจกรรมและการแจ้งเตือนทั้งหมด" : "Track all activities and notifications"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1.5" />
            {lang === "th" ? "อ่านทั้งหมด" : "Mark all read"}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 text-sm">
        {(["all", "unread", "read"] as FilterMode[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md transition-colors font-medium text-xs ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {f === "all" && (lang === "th" ? "ทั้งหมด" : "All")}
            {f === "unread" && (lang === "th" ? "ยังไม่อ่าน" : "Unread")}
            {f === "read" && (lang === "th" ? "อ่านแล้ว" : "Read")}
          </button>
        ))}
      </div>

      {/* Summary card */}
      <Card className="p-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Bell className="w-4 h-4" />
            <span>{notifications.length} {lang === "th" ? "รายการ" : "total"}</span>
          </div>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-[10px]">
              {unreadCount} {lang === "th" ? "รายการที่ยังไม่อ่าน" : "unread"}
            </Badge>
          )}
        </div>
      </Card>

      {/* Notification list */}
      <Card className="overflow-hidden">
        <ScrollArea className="max-h-[70vh]">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              {lang === "th" ? "ไม่มีการแจ้งเตือน" : "No notifications"}
            </div>
          ) : (
            filtered.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => toggleRead(n.id)}
                className={`w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0 flex items-start gap-4 ${
                  n.unread ? "bg-primary-soft/20" : ""
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${n.unread ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-sm ${n.unread ? "font-semibold" : "font-medium"}`}>
                      {lang === "th" ? n.titleTh : n.titleEn}
                    </div>
                    {i < 2 && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {lang === "th" ? "ล่าสุด" : "Latest"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {lang === "th" ? n.descTh : n.descEn}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    {n.time}{lang === "th" ? "ที่แล้ว" : " ago"}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
              </button>
            ))
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
