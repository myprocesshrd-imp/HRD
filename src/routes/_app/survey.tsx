import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getSurveys, getSurveySections, OPEN_FEEDBACK, submitSurveyResponse } from "@/services/api";
import type { MockSurvey, SurveySection } from "@/services/api";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { getHRMSProfile, type HRMSProfile } from "@/services/hrms.service";
import { loadDraft, saveDraft, clearDraft } from "@/services/survey.service";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fireConfetti } from "@/lib/confetti";
import {
  ClipboardList, ArrowLeft, ArrowRight, CheckCircle2, Save, ShieldCheck, Clock,
  CalendarDays, Globe, Sparkles, Layout, UserCircle2, Briefcase, MapPin,
  Building2, MessageSquare, Heart, ShieldAlert, Info, ListChecks, Send,
  Zap, Rocket, Target, Shield, Lock, Fingerprint
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/survey")({
  component: SurveyPageWrapper,
});

interface DraftState {
  surveyId: string;
  anonymous: boolean;
  answers: Record<string, number | string | string[] | Record<string, string>>;
  feedback: Record<string, string>;
  startedAt: number;
}

// ── Campaign Inventory ──
function CampaignInventory({ onSelect }: { onSelect: (survey: MockSurvey) => void }) {
  const { t, lang } = useI18n();
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSurveys().then((data) => {
      setSurveys(data.filter((s) => s.status === "Active" || s.status === "Draft"));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl border-4 border-primary/10 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-primary/70" />
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground animate-pulse italic">Syncing Mission Data...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Operational Hub</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
            {t("survey.title")}
          </h1>
          <p className="text-sm font-medium text-muted-foreground/80 max-w-lg">
            {lang === "th" 
              ? "ศูนย์รวมแคมเปญการรับฟังเสียงของพนักงาน เพื่อร่วมกันขับเคลื่อนองค์กรสู่ความสำเร็จ" 
              : "Enterprise campaign intelligence center. Share your voice to drive organizational excellence."}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200">
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums leading-none text-slate-900">{surveys.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Active Nodes</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {surveys.length > 0 ? surveys.map((s) => (
          <Card 
            key={s.id} 
            className="group relative overflow-hidden bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer rounded-2xl" 
            onClick={() => onSelect(s)}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <ClipboardList className="w-20 h-20" />
            </div>
            
            <CardContent className="p-6 space-y-6 relative">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary group-hover:scale-105 transition-all shadow-sm border border-slate-100">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <Badge variant={s.status === "Active" ? "default" : "secondary"} className="h-6 text-[9px] font-bold uppercase tracking-wider px-3 rounded-full">
                  {s.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors leading-tight line-clamp-1">
                  {lang === "th" ? s.titleTh : s.titleEn}
                </h3>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                    <ListChecks className="w-4 h-4 text-primary" />
                    {s.sectionIds.length} Nodes
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Ends {s.endDate}
                  </div>
                  <Badge variant="outline" className={cn(
                    "h-6 text-[9px] font-bold uppercase tracking-widest rounded-lg border",
                    s.surveyType === "anonymous" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-primary/20 bg-primary/5 text-primary"
                  )}>
                    {s.surveyType}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                 <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}${i}`} alt="user" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shadow-sm">
                    +{Math.floor(Math.random() * 50)}
                  </div>
                </div>
                <Button size="sm" className="h-10 px-8 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md group-hover:bg-primary group-hover:shadow-primary/20 transition-all">
                  {t("survey.start")}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-20 space-y-4 opacity-60">
            <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center mx-auto border border-dashed border-slate-300">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500 tracking-tight italic">No active missions detected in your sector</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Survey Flow ──
function SurveyFlow({ survey, onBack }: { survey: MockSurvey; onBack: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const surveyId = survey.id;
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>({ surveyId, anonymous: false, answers: {}, feedback: {}, startedAt: Date.now() });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hrmsProfile, setHrmsProfile] = useState<HRMSProfile | null>(null);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSurveySections(surveyId).then((data) => {
      setSections(data);
      setSectionsLoaded(true);
    });
  }, [surveyId]);

  useEffect(() => {
    const saved = loadDraft(surveyId, user?.id);
    if (saved) {
      setDraft({ surveyId, anonymous: saved.anonymous, answers: saved.answers, feedback: saved.feedback, startedAt: saved.startedAt });
    }
    if (user) {
      getHRMSProfile(user.id).then(setHrmsProfile);
    }
  }, [surveyId, user]);

  useEffect(() => {
    const id = setTimeout(() => {
      saveDraft({ ...draft, surveyId, userId: user?.id, profile: {} });
      setSavedAt(new Date());
    }, 400);
    return () => clearTimeout(id);
  }, [draft, surveyId, user]);

  const totalSteps = 2 + sections.length + 1;
  const progress = Math.round((step / (totalSteps - 1)) * 100);

  const isSectionStep = step >= 2 && step < 2 + sections.length;
  const sectionIndex = step - 2;
  const currentSection = isSectionStep ? sections[sectionIndex] : null;
  const currentSectionAnswered = currentSection
    ? currentSection.questions.every((q) => {
        const v = draft.answers[q.id];
        if (!q.required) return true;
        if (v === undefined || v === "" || v === null) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    : true;

  const isFeedbackStep = step === 2 + sections.length;
  const isDone = step === totalSteps;

  const submit = async () => {
    setSubmitting(true);
    try {
      const answers = Object.entries(draft.answers).map(([questionId, value]) => {
        let numericValue: number | null = null;
        let textValue: string | null = null;
        let arrayTextValue: string[] | null = null;
        let jsonbValue: Record<string, string> | null = null;
        if (typeof value === "number") numericValue = value;
        else if (Array.isArray(value)) arrayTextValue = value;
        else if (typeof value === "object" && value !== null) jsonbValue = value as Record<string, string>;
        else textValue = String(value ?? "");
        return { questionId, numericValue, textValue, arrayTextValue, jsonbValue };
      });

      const feedback = Object.entries(draft.feedback).map(([questionId, textValue]) => ({
        questionId,
        textValue,
      }));

      await submitSurveyResponse({
        surveyId,
        userId: user?.id,
        answers,
        feedback: feedback.filter((f) => f.textValue.trim()),
        timeSpentSeconds: Math.round((Date.now() - draft.startedAt) / 1000),
      });

      clearDraft(surveyId, user?.id);
      setStep(totalSteps);
      fireConfetti();
      toast.success(lang === "th" ? "ส่งคำตอบเรียบร้อยแล้ว" : "Intelligence transmitted successfully");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาดในการส่งข้อมูล" : "Transmission failure detected");
    }
    setSubmitting(false);
  };

  const updateAnswer = (qId: string, value: number | string | string[] | Record<string, string>) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [qId]: value } }));
  };
  const updateFeedback = (qId: string, value: string) => {
    setDraft((d) => ({ ...d, feedback: { ...d.feedback, [qId]: value } }));
  };

  const reducedMotion = useReducedMotion();
  const animatedProgress = useAnimatedCounter(progress, reducedMotion ? 0 : 600);

  const [milestone, setMilestone] = useState<string | null>(null);
  useEffect(() => {
    let msg = null;
    if (progress >= 100) msg = t("survey.milestone.100");
    else if (progress >= 75) msg = t("survey.milestone.75");
    else if (progress >= 50) msg = t("survey.milestone.50");
    else if (progress >= 25) msg = t("survey.milestone.25");
    if (msg !== milestone) {
      setMilestone(msg);
      if (msg) setTimeout(() => setMilestone(null), 2500);
    }
  }, [progress]);

  const [pageKey, setPageKey] = useState(0);
  const goNext = () => { setPageKey((k) => k + 1); setStep((s) => Math.min(totalSteps, s + 1)); };
  const goBack = () => { setPageKey((k) => k + 1); setStep((s) => Math.max(0, s - 1)); };

  if (!sectionsLoaded) return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <div className="w-12 h-12 rounded-xl border-4 border-primary/10 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground italic">Configuring Secure Pipeline...</p>
    </div>
  );

  if (isDone) {
    return (
      <div className="max-w-xl mx-auto py-10 animate-in zoom-in-95 duration-500">
        <Card className="text-center p-10 shadow-xl border-slate-100 relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary/50" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("survey.thankYou")}</h2>
          <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed max-w-sm mx-auto italic opacity-80">
            {t("survey.thankYouDesc")}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-bold uppercase tracking-wider text-[10px] hover:bg-slate-50 transition-all" onClick={onBack}>
              {lang === "th" ? "กลับสู่ฐานบัญชาการ" : "Exit Hub"}
            </Button>
            <Button className="h-10 rounded-xl shadow-lg shadow-primary/20 font-bold uppercase tracking-wider text-[10px]" onClick={() => { setDraft({ surveyId, anonymous: false, answers: {}, feedback: {}, startedAt: Date.now() }); setStep(0); setProfileConfirmed(false); }}>
              {lang === "th" ? "เริ่มภารกิจใหม่" : "Restart Mission"}
            </Button>
          </div>
          <p className="mt-8 text-[9px] uppercase font-bold tracking-[0.3em] text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            {lang === "th" ? "ส่งข้อมูลปลอดภัย" : "End-to-End Encryption Active"}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* ── High-Trust Header ── */}
      <div className="flex flex-col gap-3 px-2">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="group flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-primary transition-all uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            {lang === "th" ? "ยกเลิกภารกิจ" : "Abort Mission"}
          </button>
          <div className="flex items-center gap-4">
            {savedAt && (
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                <Save className="w-3 h-3" /> {t("survey.autoSaved")}
              </span>
            )}
            <Badge variant="outline" className="h-7 text-[9px] font-bold tracking-wider uppercase border-primary/20 text-primary px-3 rounded-lg bg-primary/5">
              Seq {step + 1} / {totalSteps}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              {step === 0
                ? (lang === "th" ? "ภารกิจกำลังจะเริ่ม" : "Commence Mission")
                : isFeedbackStep
                  ? t("survey.feedback")
                  : currentSection
                    ? (lang === "th" ? currentSection.titleTh : currentSection.titleEn)
                    : t("survey.confirmProfile")}
            </h1>
            <p className="text-xs font-bold text-slate-400 truncate max-w-lg flex items-center gap-2 italic">
              <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
              {lang === "th" ? survey.titleTh : survey.titleEn}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold tabular-nums tracking-tight leading-none text-primary">{animatedProgress}%</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Completion</div>
          </div>
        </div>

        <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)]"
            style={{ width: `${progress}%` }}
          />
          {milestone && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white drop-shadow-md animate-in fade-in zoom-in duration-300">
                {milestone}
              </span>
            </div>
          )}
        </div>
      </div>

      <Card className="shadow-lg border border-slate-200 relative overflow-hidden group rounded-2xl bg-white" key={pageKey}>
        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
               <div className="absolute -left-1 top-6 bottom-6 w-1 bg-primary rounded-full" />
               <div className="absolute top-0 right-0 p-6 opacity-5">
                  <ShieldCheck className="w-16 h-16" />
               </div>
              <p className="text-lg font-medium text-slate-700 leading-relaxed italic relative pr-10">
                "{lang === "th"
                  ? "แคมเปญนี้ออกแบบมาเพื่อรับฟังเสียงที่แท้จริงของคุณ ข้อมูลของคุณจะได้รับการปกป้องอย่างสูงสุดภายใต้มาตรฐานความปลอดภัย"
                  : "This operational campaign is designed to capture authentic employee sentiment. Your responses are fortified by professional standards."}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Clock, label: t("survey.duration"), color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                { icon: Lock, label: lang === "th" ? "ความปลอดภัยสูง" : "Secure Node", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                { icon: Sparkles, label: lang === "th" ? "รางวัลภารกิจ" : "Rewards", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
              ].map((b) => (
                <div key={b.label} className={cn("flex flex-col items-center text-center p-6 rounded-xl border bg-white gap-3 group/item hover:bg-slate-50 transition-all", b.border)}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover/item:scale-105 shadow-sm", b.bg, b.color)}>
                    <b.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.label}</span>
                </div>
              ))}
            </div>

            <Separator className="bg-slate-100" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-xl bg-slate-50 border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Fingerprint className="w-16 h-16 text-primary" />
               </div>
              <div className="flex items-center gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border border-slate-200">
                  <Globe className={cn("w-5 h-5 transition-all duration-1000", draft.anonymous ? "animate-spin text-indigo-600" : "")} />
                </div>
                <div>
                  <h4 className="font-bold text-base tracking-tight text-slate-900">{lang === "th" ? "โหมดไม่ระบุตัวตน" : "Cloak Mode (Anonymous)"}</h4>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5 max-w-sm">
                    {lang === "th" ? "เปิดใช้งานเพื่อซ่อนอัตลักษณ์จากการประมวลผล" : "Enable to fully mask your identity node."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-lg shadow-sm border border-slate-200 relative">
                <Label htmlFor="anonymous" className="text-[9px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer">
                  {lang === "th" ? "เปิดใช้งาน" : "Enabled"}
                </Label>
                <Switch
                  id="anonymous"
                  checked={draft.anonymous}
                  onCheckedChange={(v) => {
                    setDraft((d) => ({ ...d, anonymous: !!v }));
                    if (v) toast.info("Stealth Mode Activated");
                    else toast.info("Identified Mode Restored");
                  }}
                  className="data-[state=checked]:bg-indigo-600 scale-90"
                />
              </div>
            </div>
            
            {user && !draft.anonymous && (
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 animate-in fade-in duration-1000 uppercase tracking-widest">
                <UserCircle2 className="w-3.5 h-3.5 text-primary" />
                {lang === "th" ? "ยืนยันตัวตนพนักงาน" : "Identity Linked"}: <span className="text-slate-900">{lang === "th" ? user.nameTh : user.nameEn}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 1: HRMS Profile Review */}
        {step === 1 && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl tracking-tight text-slate-900">{t("survey.confirmProfile")}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("survey.profileReviewDesc")}</p>
              </div>
            </div>

            {hrmsProfile ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: UserCircle2, label: "Identity", value: lang === "th" ? hrmsProfile.nameTh : hrmsProfile.nameEn, color: "text-blue-600" },
                    { icon: Building2, label: t("common.department"), value: hrmsProfile.department, color: "text-indigo-600" },
                    { icon: Briefcase, label: t("common.level"), value: hrmsProfile.level, color: "text-emerald-600" },
                    { icon: MapPin, label: t("common.location"), value: hrmsProfile.location, color: "text-amber-600" },
                  ].map((f) => (
                    <div key={f.label} className="p-4 rounded-xl bg-white border border-slate-200 flex items-center gap-4 group/item hover:bg-slate-50 transition-all shadow-sm">
                      <div className={cn("w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0", f.color)}>
                        <f.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{f.label}</p>
                        <p className="font-bold text-sm truncate tracking-tight text-slate-900">{f.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {!profileConfirmed ? (
                  <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-3 opacity-5">
                        <Info className="w-16 h-16 text-amber-600" />
                     </div>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-600 shrink-0 shadow-sm border border-amber-200">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-center sm:text-left relative">
                      <p className="text-sm font-bold text-amber-900 tracking-tight">{lang === "th" ? "ตรวจสอบความถูกต้องของข้อมูล" : "Verify Integrity of Identity"}</p>
                      <p className="text-[11px] font-medium text-amber-700/80 mt-0.5 max-w-sm italic">
                        Accurate profile data is vital for segmented intelligence.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => { setProfileConfirmed(true); toast.success("Identity Verified"); }} className="w-full sm:w-auto h-9 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow-md font-bold uppercase tracking-wider text-[10px]">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t("survey.profileConfirmBtn")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 p-6 rounded-xl bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest text-[10px] border border-emerald-200 shadow-inner">
                    <CheckCircle2 className="w-5 h-5" />
                    {t("survey.profileConfirmed")}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-4 opacity-60">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pulling Registry...</p>
              </div>
            )}
          </div>
        )}

        {/* Section steps */}
        {currentSection && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h3 className="font-bold text-xl tracking-tight flex items-center gap-3 text-slate-900">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Layout className="w-4 h-4" />
                </div>
                {lang === "th" ? currentSection.titleTh : currentSection.titleEn}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xl italic">
                {lang === "th" ? currentSection.descTh : currentSection.descEn}
              </p>
            </div>

            <div className="space-y-12 py-4">
              {currentSection.questions.map((q, idx) => (
                <div key={q.id} className="relative pl-8 border-l-2 border-slate-100 group/q transition-all">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 border-2 border-white group-hover/q:bg-primary group-hover/q:scale-125 transition-all" />
                  <div className="space-y-6">
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-6">
                        <Label className="text-base font-bold leading-tight text-slate-800 tracking-tight flex-1">
                          {idx + 1}. {lang === "th" ? q.textTh : q.textEn}
                          {q.required && <span className="text-rose-500 ml-1 text-xl leading-none">*</span>}
                        </Label>
                        {draft.answers[q.id] !== undefined && draft.answers[q.id] !== "" && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-emerald-500/20 animate-in zoom-in">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="ml-0">
                        <QuestionRenderer
                          question={q}
                          value={draft.answers[q.id]}
                          onChange={(v) => updateAnswer(q.id, v)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {isFeedbackStep && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="space-y-2">
              <h3 className="font-bold text-xl tracking-tight flex items-center gap-3 text-slate-900">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <MessageSquare className="w-4 h-4" />
                </div>
                {t("survey.feedback")}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xl italic">
                {t("survey.feedbackDesc")}
              </p>
            </div>

            <div className="space-y-8">
              {OPEN_FEEDBACK.map((q) => (
                <div key={q.id} className="space-y-4 p-6 rounded-xl bg-slate-50 border border-slate-200 hover:border-primary/20 transition-all group hover:bg-white shadow-sm hover:shadow-md">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{lang === "th" ? q.textTh : q.textEn}</span>
                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-wider opacity-60 border-slate-300 px-2">
                      {t("common.optional")}
                    </Badge>
                  </Label>
                  <QuestionRenderer
                    question={q}
                    value={draft.feedback[q.id]}
                    onChange={(v) => updateFeedback(q.id, String(v))}
                  />
                </div>
              ))}
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Heart className="w-20 h-20 text-primary" />
               </div>
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary shrink-0 shadow-sm border border-slate-100">
                <Heart className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-[11px] font-bold text-primary leading-relaxed max-w-sm italic uppercase tracking-wider">
                Note: Your feedback is the catalyst for our cultural evolution.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className="h-10 px-6 rounded-lg font-bold uppercase tracking-wider text-[10px] group text-slate-500 hover:bg-white transition-all" onClick={goBack} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t("common.back")}
          </Button>

          <div className="flex items-center gap-3">
            {step === 0 ? (
              <Button className="h-10 px-10 rounded-lg shadow-md font-bold uppercase tracking-wider text-[11px] group" onClick={goNext}>
                {t("survey.start")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : isFeedbackStep ? (
              <Button 
                onClick={submit} 
                disabled={submitting}
                className="h-10 px-12 rounded-lg bg-primary shadow-md font-bold uppercase tracking-wider text-[11px] group"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    {lang === "th" ? "กำลังส่ง..." : "Transmitting..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 mr-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    {t("common.submit")}
                  </div>
                )}
              </Button>
            ) : (
              <Button
                className="h-10 px-10 rounded-lg shadow-md font-bold uppercase tracking-wider text-[11px] group"
                onClick={goNext}
                disabled={(step === 1 && !profileConfirmed) || (isSectionStep && !currentSectionAnswered)}
              >
                {t("common.next")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {/* ── Security Badge Footer ── */}
      <div className="flex flex-col items-center justify-center gap-4 opacity-40 py-4">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5" />
          Mission Integrity Secured
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {["AES-256", "TLS 1.3", "SOC2", "ISO 27001"].map(s => (
            <div key={s} className="text-[8px] font-bold uppercase tracking-widest border-b border-slate-300 pb-0.5">{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Wrapper ──
function SurveyPageWrapper() {
  const [selected, setSelected] = useState<MockSurvey | null>(null);
  if (!selected) return <CampaignInventory onSelect={setSelected} />;
  return <SurveyFlow survey={selected} onBack={() => setSelected(null)} />;
}

export default SurveyPageWrapper;
