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
  Languages, Terminal, Info, Heart, ChevronRight, Clock 
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

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (isAuthenticated) {
      navigate({ to: "/dashboard", replace: true });
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
      navigate({ to: "/dashboard" });
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 selection:bg-primary/10">
      {/* ── Left Panel: Immersive Branding ── */}
      <div className="hidden lg:flex flex-col justify-between p-16 text-white relative overflow-hidden bg-slate-950">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/Users/delta/.gemini/antigravity/brain/f1ec155d-5d6c-4e44-a014-1d5d560da494/hr_login_hero_1778663093167.png" 
            alt="HR Tech Hero"
            className="w-full h-full object-cover opacity-40 scale-105 animate-pulse-slow"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-primary/20" />
        </div>

        <div className="relative z-10 flex items-center gap-4 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-black text-2xl tracking-tighter">{t("app.name")}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/80">Professional HR Pulse Suite</div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000 delay-200">
          <h1 className="text-6xl font-black leading-[1.1] tracking-tighter">
            {lang === "th"
              ? "เปลี่ยนเสียงของพนักงาน ให้เป็นพลังขององค์กร"
              : "Transform Employee Voice into Growth Potential."}
          </h1>
          <p className="text-xl text-white/80 font-medium leading-relaxed max-w-xl italic">
            {lang === "th"
              ? "แพลตฟอร์มสำรวจระดับองค์กรที่มอบข้อมูลเชิงลึก ความปลอดภัยระดับสูง และการรายงานที่แม่นยำเพื่อการตัดสินใจที่ดีกว่า"
              : "Enterprise-grade sentiment analysis with rigorous data protection, high-fidelity metrics, and executive-ready reporting."}
          </p>
          
          <div className="grid grid-cols-3 gap-8 pt-8">
            {[
              { v: "99.9%", l: lang === "th" ? "ความปลอดภัย" : "Data Security", sub: "AES-256" },
              { v: "ISO", l: lang === "th" ? "มาตรฐานสากล" : "Certified", sub: "27001" },
              { v: "Real-time", l: lang === "th" ? "การวิเคราะห์" : "Analytics", sub: "AI Engine" },
            ].map((s) => (
              <div key={s.l} className="space-y-1 group">
                <div className="text-3xl font-black text-white group-hover:text-primary transition-colors">{s.v}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">{s.l}</div>
                <div className="text-[11px] font-bold text-white/50">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/50 animate-in fade-in duration-1000 delay-500">
          <span>© {new Date().getFullYear()} HR Pulse Platform</span>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
            <span className="hover:text-white cursor-pointer transition-colors">System Status</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Modern Login Form ── */}
      <div className="flex items-center justify-center p-8 md:p-16 bg-white lg:bg-transparent overflow-y-auto">
        <div className="w-full max-w-md space-y-10 p-8 animate-in fade-in slide-in-from-right-8 duration-700">
          
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden">
             <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-black tracking-tight text-xl">{t("app.name")}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-5xl font-black tracking-tighter leading-[0.9]">
                {t("auth.welcome")}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLang(lang === "th" ? "en" : "th")}
                className="h-8 rounded-full border border-slate-200 text-[11px] font-bold uppercase tracking-widest gap-2 hover:bg-slate-50"
              >
                <Languages className="w-3.5 h-3.5" />
                {lang === "th" ? "EN" : "ไทย"}
              </Button>
            </div>
            <p className="text-lg font-medium text-slate-600 leading-relaxed">{t("auth.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-2xl bg-rose-50 border-rose-200 text-rose-700 animate-in shake duration-500">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="font-bold">{error}</AlertDescription>
              </Alert>
            )}

            {showDebug && debugLogs.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-xs font-mono space-y-3 shadow-2xl animate-in zoom-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px]">
                    <Terminal className="w-3.5 h-3.5" />
                    System Exceptions
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebug(false)}
                    className="h-6 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                  >
                    Dismiss
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                  {debugLogs.map((l, i) => (
                    <div key={i} className={cn(
                      "flex gap-3",
                      l.level === "error" ? "text-rose-400" : "text-slate-400"
                    )}>
                      <span className="opacity-30 shrink-0">[{l.time}]</span> 
                      <span className="break-all">{l.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeCode" className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">HRMS Username</Label>
                <div className="relative group">
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="employeeCode"
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Somsri_ka"
                    className="pl-12 h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-primary/20 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[11px] font-black uppercase tracking-widest text-slate-600">HRMS Password</Label>
                  <button type="button" className="text-[11px] font-bold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors">Forgot?</button>
                </div>
                <div className="relative group">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-12 h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-primary/20 transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-sm bg-gradient-to-r from-indigo-600 to-primary hover:scale-[1.02] active:scale-95 transition-all group" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <div className="flex items-center gap-2">
                  {t("auth.signInBtn")}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Quick Demo Access */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t("auth.demoTitle")}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DEMO.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => fillDemo(d.code, d.password)}
                  className="flex flex-col items-start p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all text-left group"
                >
                  <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2", d.color)}>
                    {d.role}
                  </span>
                  <span className="text-xs font-bold text-slate-900 flex items-center justify-between w-full">
                    {d.code}
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous surveys */}
          {!surveysLoading && anonSurveys.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary px-1">
                <Sparkles className="w-4 h-4" />
                {lang === "th" ? "แบบสำรวจสาธารณะ" : "Public Campaigns"}
              </div>
              {anonSurveys.map((s) => (
                <Card
                  key={s.id}
                  className="group p-5 border-none bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer rounded-2xl relative overflow-hidden"
                  onClick={() => navigate({ to: "/survey/public/$id", params: { id: s.id } })}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate group-hover:text-primary transition-colors">
                        {lang === "th" ? s.titleTh : s.titleEn}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.endDate}</span>
                        <span className="flex items-center gap-1 text-emerald-700"><Info className="w-3.5 h-3.5" /> Public</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-8 pt-6 opacity-60">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-600">
              <ShieldCheck className="w-4 h-4 text-primary" />
              AES-256 SECURED
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-600">
              <Heart className="w-4 h-4 text-rose-500" />
              GDPR COMPLIANT
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
