import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getSurveys } from "@/services/api";
import type { MockSurvey } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, User, Lock, AlertCircle, Loader2, ArrowRight, Sparkles, 
  Languages, Terminal, Info, Heart, ChevronRight, Clock, ChevronDown 
} from "lucide-react";
import { toast } from "sonner";
import { getLogs, clearLogs } from "@/services/debug";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const DEMO = [
  { role: "Super Admin", code: "admin", password: "admin123", color: "bg-rose-500/10 text-rose-600" },
  { role: "HR Admin", code: "hr", password: "hr123", color: "bg-indigo-500/10 text-indigo-600" },
  { role: "Manager", code: "manager", password: "manager123", color: "bg-emerald-500/10 text-emerald-600" },
  { role: "Employee", code: "employee", password: "employee123", color: "bg-amber-500/10 text-amber-600" },
];

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<{ level: string; msg: string; time: string }[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [anonSurveys, setAnonSurveys] = useState<MockSurvey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (isAuthenticated) {
      navigate({ to: "/home", replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    getSurveys()
      .then((data) => {
        setAnonSurveys(data.filter((s) => s.status === "Active" && s.surveyType === "anonymous"));
      })
      .finally(() => setSurveysLoading(false));
  }, []);

  if (!hydrated || isAuthenticated) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    clearLogs();
    setDebugLogs([]);
    setShowDebug(false);
    setLoading(true);
    try {
      const u = await login(employeeCode, password);
      toast.success(lang === "th" ? `ยินดีต้อนรับกลับมา, ${u.nameTh}` : `Welcome back, ${u.nameEn}`);
      navigate({ to: "/home" });
    } catch {
      setError(t("auth.invalid"));
      const logs = getLogs();
      setDebugLogs(logs);
      if (logs.length > 0) setShowDebug(true);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (code: string, p: string) => {
    setEmployeeCode(code);
    setPassword(p);
    toast.info("Demo credentials applied");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 selection:bg-primary/10">
      {/* ── Left Panel: Immersive Branding ── */}
      <div className="hidden lg:flex flex-col justify-between p-16 text-white relative overflow-hidden bg-slate-950">
        {/* Background Gradient & Animated Shapes */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow delay-700" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>

        <div className="relative z-10 flex items-center gap-4 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-black text-2xl tracking-tighter">{t("app.name")}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/60">Enterprise HR Suite</div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000 delay-200">
          <h1 className="text-4xl font-black leading-[1.1] tracking-tighter">
            {lang === "th"
              ? "เปลี่ยนเสียงของพนักงาน ให้เป็นพลังขององค์กร"
              : "Transform Employee Voice into Growth."}
          </h1>
          <p className="text-xl text-white/70 font-medium leading-relaxed max-w-xl">
            {lang === "th"
              ? "แพลตฟอร์มสำรวจระดับองค์กรที่มอบข้อมูลเชิงลึก ความปลอดภัยระดับสูง และการรายงานที่แม่นยำ"
              : "Enterprise-grade sentiment analysis with rigorous data protection and executive-ready reporting."}
          </p>
          
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
            {[
              { v: "99.9%", l: lang === "th" ? "ความปลอดภัย" : "Security", sub: "AES-256" },
              { v: "Real-time", l: lang === "th" ? "วิเคราะห์" : "Analytics", sub: "AI Powered" },
              { v: "ISO", l: lang === "th" ? "มาตรฐาน" : "Certified", sub: "27001" },
            ].map((s) => (
              <div key={s.l} className="space-y-1">
                <div className="text-2xl font-black text-white">{s.v}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">{s.l}</div>
                <div className="text-[10px] font-medium text-white/30">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/30 animate-in fade-in duration-1000 delay-500">
          <span>© {new Date().getFullYear()} HR Pulse Platform</span>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Modern Login Form ── */}
      <div className="flex items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 lg:hidden">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLang(lang === "th" ? "en" : "th")}
                className="h-8 rounded-full border border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-widest gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 ml-auto dark:text-slate-400"
              >
                <Languages className="w-3.5 h-3.5" />
                {lang === "th" ? "EN" : "ไทย"}
              </Button>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tighter leading-tight text-slate-900 dark:text-white">
                {t("auth.welcome")}
              </h1>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400">{t("auth.subtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-2xl bg-rose-50 border-rose-100 text-rose-600 animate-in shake duration-500">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="font-bold">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="employeeCode" className="text-[13px] font-black uppercase tracking-widest text-slate-500 ml-1">HRMS Username</Label>
                <div className="relative group">
                  <User className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="employeeCode"
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Somsri_ka"
                    className="pl-12 h-16 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:ring-primary/20 transition-all text-lg font-semibold dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-black uppercase tracking-widest text-slate-500 ml-1">HRMS Password</Label>
                <div className="relative group">
                  <Lock className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-12 h-16 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-950 focus:ring-primary/20 transition-all text-lg font-semibold dark:text-white"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-sm bg-slate-900 dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all group dark:text-white" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <div className="flex items-center gap-2">
                  {t("auth.signInBtn")}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Quick Demo Access */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              className="w-full flex items-center gap-3 px-1 group"
            >
              <div className="h-px flex-1 bg-slate-100" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors whitespace-nowrap">
                {t("auth.demoTitle")}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showDemo && "rotate-180")} />
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </button>

            {showDemo && (
              <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {DEMO.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => fillDemo(d.code, d.password)}
                    className="flex flex-col items-start p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary/20 dark:hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
                  >
                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2", d.color)}>
                      {d.role}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between w-full">
                      {d.code}
                      <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous surveys */}
          {!surveysLoading && anonSurveys.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-slate-100">
               <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary px-1">
                <Sparkles className="w-4 h-4" />
                {lang === "th" ? "แบบสำรวจที่เปิดอยู่" : "Public Campaigns"}
              </div>
              {anonSurveys.map((s) => (
                <Card
                  key={s.id}
                  className="group p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-primary/20 dark:hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer rounded-2xl relative overflow-hidden"
                  onClick={() => navigate({ to: "/survey/public/$id", params: { id: s.id } })}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {lang === "th" ? s.titleTh : s.titleEn}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" /> {s.endDate}</span>
                        <span className="flex items-center gap-1 text-emerald-600/70"><Info className="w-3.5 h-3.5" /> {lang === "th" ? "แบบสำรวจไม่ระบุตัวตน" : "Anonymous"}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-8 pt-4 opacity-40">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              SECURED
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              HR TRUSTED
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
