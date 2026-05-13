import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const DEMO = [
  { role: "Super Admin", email: "admin@company.co.th", password: "admin123" },
  { role: "HR Admin", email: "hr@company.co.th", password: "hr123" },
  { role: "Manager", email: "manager@company.co.th", password: "manager123" },
  { role: "Employee", email: "employee@company.co.th", password: "employee123" },
];

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (isAuthenticated) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!hydrated || isAuthenticated) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(lang === "th" ? `ยินดีต้อนรับ ${u.nameTh}` : `Welcome, ${u.nameEn}`);
      navigate({ to: "/dashboard" });
    } catch {
      setError(t("auth.invalid"));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground relative overflow-hidden"
           style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-lg">{t("app.name")}</div>
            <div className="text-xs text-white/60">Enterprise HR Suite</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            {lang === "th"
              ? "ยกระดับความผูกพันของพนักงาน ด้วยข้อมูลเชิงลึก"
              : "Elevate employee engagement with measurable insight."}
          </h1>
          <p className="mt-4 text-white/70">
            {lang === "th"
              ? "แพลตฟอร์มสำรวจระดับองค์กรสำหรับ HR ที่ต้องการตัวชี้วัด ความปลอดภัยของข้อมูล และการรายงานในระดับผู้บริหาร"
              : "An enterprise-grade survey platform for HR teams who need rigorous metrics, data security, and executive-ready reporting."}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { v: "98%", l: lang === "th" ? "ความถูกต้องของข้อมูล" : "Data accuracy" },
              { v: "ISO", l: lang === "th" ? "มาตรฐานความปลอดภัย" : "Security standard" },
              { v: "24/7", l: lang === "th" ? "การรายงาน" : "Reporting" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-semibold">{s.v}</div>
                <div className="text-xs text-white/60 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} HR Pulse. All rights reserved.
        </div>

        {/* Decorative blobs */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <Link to="/login" className="flex items-center gap-2 lg:hidden">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-semibold">{t("app.name")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setLang(lang === "th" ? "en" : "th")}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1"
            >
              {lang === "th" ? "EN" : "ภาษาไทย"}
            </button>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">{t("auth.welcome")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.co.th"
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-11"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("auth.signInBtn")}
            </Button>
          </form>

          <Card className="mt-6 p-4 bg-muted/40 border-dashed">
            <div className="text-xs font-medium text-muted-foreground mb-2">{t("auth.demoTitle")}</div>
            <div className="space-y-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fillDemo(d.email, d.password)}
                  className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded hover:bg-background transition-colors"
                >
                  <span className="font-medium">{d.role}</span>
                  <span className="text-muted-foreground font-mono">{d.email}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="mt-4 p-5 border-primary/20 bg-primary-soft/20 hover:bg-primary-soft/30 transition-colors cursor-pointer group" onClick={() => navigate({ to: "/survey/public/$id", params: { id: "s4" } })}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {lang === "th" ? "ไม่ต้องล็อกอิน! ทดลองทำแบบสำรวจ" : "No login needed! Try the survey"}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {lang === "th"
                    ? "คลิกเพื่อทดลองทำแบบสำรวจ Pulse Survey แบบไม่ระบุตัวตน พร้อมเอฟเฟกต์และภาพเคลื่อนไหว"
                    : "Click to try the anonymous Pulse Survey with gamification and animations."}
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary mt-2 group-hover:gap-2 transition-all">
                  {lang === "th" ? "เริ่มทดลอง" : "Start demo"}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
