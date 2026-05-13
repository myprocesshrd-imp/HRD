import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCircle2, Bell, Shield, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

interface NotificationSetting {
  id: string;
  icon: typeof Bell;
  labelTh: string;
  labelEn: string;
  enabled: boolean;
}

const DEFAULT_NOTIFS: NotificationSetting[] = [
  { id: "n1", icon: Mail, labelTh: "อีเมลแจ้งเตือนแบบสำรวจใหม่", labelEn: "Email me about new surveys", enabled: true },
  { id: "n2", icon: Bell, labelTh: "แจ้งเตือนเมื่อใกล้ปิดรับคำตอบ", labelEn: "Reminders before survey closes", enabled: true },
  { id: "n3", icon: Shield, labelTh: "การแจ้งเตือนด้านความปลอดภัย", labelEn: "Security alerts", enabled: true },
];

function ProfilePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [nameTh, setNameTh] = useState(user?.nameTh ?? "");
  const [nameEn, setNameEn] = useState(user?.nameEn ?? "");
  const [notifs, setNotifs] = useState<NotificationSetting[]>(DEFAULT_NOTIFS);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSave = () => {
    localStorage.setItem("hrpulse.profile", JSON.stringify({ nameTh, nameEn, notifs }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success(lang === "th" ? "บันทึกโปรไฟล์แล้ว" : "Profile saved");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("nav.profile")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "th" ? "จัดการข้อมูลบัญชีและการแจ้งเตือน" : "Manage your account and notifications"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle2 className="w-4 h-4 text-primary" />
            {lang === "th" ? "ข้อมูลส่วนตัว" : "Personal information"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
              {user.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="font-medium">{lang === "th" ? user.nameTh : user.nameEn}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <Badge variant="secondary" className="mt-1.5 capitalize">{user.role.replace("_", " ")}</Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{lang === "th" ? "ชื่อ (TH)" : "Name (TH)"}</Label>
              <Input value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "th" ? "ชื่อ (EN)" : "Name (EN)"}</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.department")}</Label>
              <Input defaultValue={user.department} disabled className="bg-muted/30" />
              <span className="text-[10px] text-muted-foreground">
                {lang === "th" ? "ข้อมูลจากระบบ HRMS" : "Synced from HRMS"}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.level")}</Label>
              <Input defaultValue={user.level} disabled className="bg-muted/30" />
              <span className="text-[10px] text-muted-foreground">
                {lang === "th" ? "ข้อมูลจากระบบ HRMS" : "Synced from HRMS"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {lang === "th" ? "บันทึกแล้ว" : "Saved"}
                </span>
              )}
              <Button onClick={handleSave}>{t("common.save")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            {lang === "th" ? "การแจ้งเตือน" : "Notifications"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifs.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{lang === "th" ? n.labelTh : n.labelEn}</span>
                </div>
                <Switch
                  checked={n.enabled}
                  onCheckedChange={(v) =>
                    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, enabled: v } : x)))
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
