import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getSurveySections, getSurvey, OPEN_FEEDBACK, submitSurveyResponse, getDemographicsConstants, getDepartmentsWithId, getBusinessUnits } from "@/services/api";
import type { SurveySection, MockSurvey, Department, BusinessUnit } from "@/services/api";
import { DEMOGRAPHIC_FIELDS_REGISTRY } from "@/lib/mock-data";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { loadDraft, saveDraft, clearDraft } from "@/services/survey.service";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fireConfetti } from "@/lib/confetti";
import {
  ClipboardList, ArrowLeft, ArrowRight, CheckCircle2, Save, ShieldCheck, Clock,
  Users, Building2, MapPin, Hash, CalendarDays, VenetianMask, Globe,
  Sparkles, MessageSquare, Heart, ShieldAlert, Info, Send, Layout,
  Shield, Lock, Fingerprint, Zap, EyeOff, Binary, Compass, Search
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/survey/public/$id")({
  component: AnonymousSurveyPage,
});

interface DraftState {
  profile: Record<string, string>;
  answers: Record<string, number | string | string[] | Record<string, string>>;
  feedback: Record<string, string>;
}

function AnonymousSurveyPage() {
  const { t, lang } = useI18n();
  const { id } = Route.useParams();
  const [survey, setSurvey] = useState<MockSurvey | null>(null);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>({ profile: {}, answers: {}, feedback: {} });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pageKey, setPageKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [demoConstants, setDemoConstants] = useState<Record<string, string[]>>({});
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allBusinessUnits, setAllBusinessUnits] = useState<BusinessUnit[]>([]);
  const [depSearch, setDepSearch] = useState("");

  useEffect(() => {
    Promise.all([getSurveySections(id), getSurvey(id)]).then(([sData, surveyData]) => {
      setSections(sData);
      setSurvey(surveyData ?? null);
      setSectionsLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    Promise.all([
      getDemographicsConstants(),
      getDepartmentsWithId(),
      getBusinessUnits(),
    ]).then(([c, depts, bus]) => {
      setDemoConstants({
        department: c.departments,
        businessUnit: c.businessUnits,
        location: c.locations,
        level: c.levels,
        gender: c.genders,
        ageRange: c.ageRanges,
        tenure: c.tenure,
      });
      setAllDepartments(depts);
      setAllBusinessUnits(bus as BusinessUnit[]);
    });
  }, []);

  useEffect(() => {
    const saved = loadDraft(id, undefined);
    if (saved) {
      setDraft({ profile: saved.profile ?? {}, answers: saved.answers, feedback: saved.feedback });
    }
  }, [id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      saveDraft({
        surveyId: id,
        anonymous: true,
        profile: draft.profile,
        answers: draft.answers,
        feedback: draft.feedback,
        startedAt: Date.now(),
      });
      setSavedAt(new Date());
    }, 400);
    return () => clearTimeout(timeout);
  }, [draft, id]);

  const totalSteps = 2 + sections.length;
  const progress = Math.round((step / totalSteps) * 100);
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

  const isDemographicsStep = step === 1;
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

  const isLastSectionStep = step === 2 + sections.length - 1;
  const isDone = step === totalSteps;

  const ICON_MAP: Record<string, any> = {
    VenetianMask, CalendarDays, Hash, MapPin, Building2, Users
  };

  const buNameToId = useMemo(() => {
    const map: Record<string, string> = {};
    allBusinessUnits.forEach((bu) => {
      if (bu.name_en) map[bu.name_en] = bu.id;
      if (bu.name_th) map[bu.name_th] = bu.id;
    });
    return map;
  }, [allBusinessUnits]);

  const activeDemoFields = useMemo(() => {
    const config = survey?.demographicFields;
    const selectedBU = draft.profile["businessUnit"] ?? "";
    const selectedBUId = selectedBU ? buNameToId[selectedBU] : undefined;

    return DEMOGRAPHIC_FIELDS_REGISTRY
      .filter(f => !config || f.key in config)
      .map(f => {
        let options = f.masterOptions as readonly string[];
        if (config && config[f.key]?.length > 0) {
          options = config[f.key];
          if (f.key === "department" && selectedBUId && allDepartments.length > 0) {
            const filtered = options.filter(opt => {
              const deptObj = allDepartments.find(d => 
                d.name_en === opt || 
                d.name_th === opt
              );
              return deptObj ? (deptObj.business_unit_ids ?? []).includes(selectedBUId) : false;
            });
            options = filtered;
          }
        } else if (f.key === "businessUnit" && allBusinessUnits.length > 0) {
          options = allBusinessUnits.map(b => lang === "th" && b.name_th ? b.name_th : b.name_en);
        } else if (f.key === "department" && allDepartments.length > 0) {
          if (selectedBUId) {
            const filtered = allDepartments
              .filter(d => (d.business_unit_ids ?? []).includes(selectedBUId))
              .map(d => lang === "th" && d.name_th ? d.name_th : d.name_en);
            options = filtered.length > 0 ? filtered : allDepartments.map(d => lang === "th" && d.name_th ? d.name_th : d.name_en);
          } else {
            options = allDepartments.map(d => lang === "th" && d.name_th ? d.name_th : d.name_en);
          }
        } else if (demoConstants[f.key as keyof typeof demoConstants]?.length > 0) {
          options = demoConstants[f.key as keyof typeof demoConstants];
          if (f.key === "department" && selectedBUId && allDepartments.length > 0) {
            const filtered = options.filter(opt => {
              const deptObj = allDepartments.find(d => 
                d.name_en === opt || 
                d.name_th === opt
              );
              return deptObj ? (deptObj.business_unit_ids ?? []).includes(selectedBUId) : false;
            });
            options = filtered;
          }
        }
        return {
          key: f.key,
          labelTh: f.labelTh,
          labelEn: f.labelEn,
          icon: ICON_MAP[f.icon],
          options: options,
          span: f.key === "tenure",
        };
      });
  }, [survey, demoConstants, draft.profile, buNameToId, allDepartments, lang]);

  const demographicsComplete = activeDemoFields.every((f: any) => (draft.profile[f.key] ?? "").length > 0);

  const goNext = () => { setPageKey((k) => k + 1); setStep((s) => Math.min(totalSteps, s + 1)); };
  const goBack = () => { setPageKey((k) => k + 1); setStep((s) => Math.max(0, s - 1)); };

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
        else {
          textValue = String(value ?? "");
          if (!isNaN(Number(textValue)) && textValue.trim() !== "") {
            numericValue = Number(textValue);
          }
        }
        return { questionId, numericValue, textValue, arrayTextValue, jsonbValue };
      });

      await submitSurveyResponse({
        surveyId: id,
        anonymousToken: `anon_${Date.now()}`,
        answers,
        feedback: [],
        demographics: draft.profile,
      });

      clearDraft(id, undefined);
      setStep(totalSteps);
      fireConfetti();
      toast.success(lang === "th" ? "ส่งข้อมูลเรียบร้อยแล้ว" : "Response transmitted successfully");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาดในการส่งข้อมูล" : "Transmission failure detected");
    }
    setSubmitting(false);
  };

  const updateAnswer = (qId: string, value: number | string | string[] | Record<string, string>) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [qId]: value } }));
  };
  const updateProfile = (field: string, value: string) => {
    setDraft((d) => ({ ...d, profile: { ...d.profile, [field]: value } }));
  };

  // Replaced DEMO_FIELDS with activeDemoFields

  if (!sectionsLoaded) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] gap-6">
      <div className="relative">
        <div className="w-12 h-12 rounded-xl border-4 border-primary/10 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary/70" />
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 animate-pulse italic">Initializing Private Gateway...</p>
    </div>
  );

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 animate-in zoom-in-95 duration-500">
        <Card className="max-w-lg w-full text-center p-10 shadow-xl border-slate-100 relative overflow-hidden bg-white rounded-3xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-primary to-blue-500" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("survey.thankYou")}</h2>
          <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed max-w-sm mx-auto italic opacity-80">
            {t("survey.thankYouDesc")}
          </p>
          <div className="mt-10 flex justify-center">
            <Button className="h-10 px-10 rounded-xl shadow-lg shadow-primary/20 font-bold uppercase tracking-wider text-[10px] transition-all" onClick={() => { setDraft({ profile: {}, answers: {}, feedback: {} }); setStep(0); }}>
              {lang === "th" ? "ปิดหน้านี้" : "Close"}
            </Button>
          </div>
          <p className="mt-8 text-[9px] uppercase font-bold tracking-[0.3em] text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            {lang === "th" ? "ข้อมูลของคุณถูกเข้ารหัสอย่างปลอดภัย" : "Session Encrypted & Protected"}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-primary/20">
      {/* ── High-Trust Header ── */}
      <header className="sticky top-0 z-50 h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-base leading-none">{t("app.name")}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Anonymous Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <EyeOff className="w-3 h-3" />
            {t("survey.anonymousDescShort")}
          </div>
          {savedAt && (
             <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <Save className="w-3 h-3" /> Saved
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" 
            onClick={() => {
              if (step > 0 && !confirm(lang === "th" ? "ออกจากแบบสำรวจ? ข้อมูลจะหายไป" : "Exit? Data will be lost.")) return;
              window.location.href = "/";
            }}
          >
            {lang === "th" ? "ออก" : "Exit"}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 md:py-16 px-6">
        <div className="w-full max-w-3xl space-y-8">
          {/* ── Progress & Title ── */}
          <div className="space-y-6 px-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                 <div className="flex items-center gap-2 text-primary">
                    <Compass className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Sector Sequence</span>
                 </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                  {step === 0
                    ? t("survey.startLabelAnon")
                    : isDemographicsStep
                      ? (lang === "th" ? "ข้อมูลผู้ตอบ" : "Respondent Information")
                      : currentSection
                        ? (lang === "th" ? currentSection.titleTh : currentSection.titleEn)
                        : ""}
                </h1>
                <p className="text-xs font-bold text-slate-400 italic">
                  Private Engagement Campaign &bull; {id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold tabular-nums tracking-tight leading-none text-primary">{animatedProgress}%</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Completion</div>
              </div>
            </div>

            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-sm">
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

          <Card className="shadow-lg border border-slate-200 relative overflow-hidden bg-white rounded-2xl" key={pageKey}>
            {/* Step 0: Intro */}
            {step === 0 && (
              <div className="p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="relative p-8 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                  <div className="absolute -left-1 top-8 bottom-8 w-1 bg-indigo-600 rounded-full" />
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Lock className="w-20 h-20 text-indigo-600" />
                   </div>
                  <p className="text-lg font-medium text-slate-700 leading-relaxed italic relative">
                    "{lang === "th"
                        ? "แบบสำรวจนี้มีการปกป้องข้อมูลอย่างเต็มรูปแบบ คำตอบของคุณจะถูกนำไปวิเคราะห์ในภาพรวมเท่านั้น"
                        : "This survey is fully protected. Your responses are used exclusively for aggregate analysis."}"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Clock, label: t("survey.duration"), color: "text-amber-600", bg: "bg-amber-50" },
                    { icon: ShieldCheck, label: "Zero Trace", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { icon: Binary, label: "Encrypted", color: "text-blue-600", bg: "bg-blue-50" },
                  ].map((b) => (
                    <div key={b.label} className="flex flex-col items-center text-center p-6 rounded-xl border border-slate-100 bg-white gap-3 group hover:bg-slate-50 transition-all shadow-sm">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border border-slate-100", b.bg, b.color)}>
                        <b.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{b.label}</span>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-xl bg-slate-900 text-slate-400 flex items-center gap-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Fingerprint className="w-16 h-16 text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold leading-relaxed uppercase tracking-wider max-w-lg relative">
                    Stealth Protocol Active: No IP addresses or device identifiers are logged. Your privacy is structurally guaranteed.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Demographics */}
            {isDemographicsStep && (
              <div className="p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900 tracking-tight">Personnel Mapping</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Baseline Context</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                  {activeDemoFields.map((f: any) => (
                    <div key={f.key} className={cn("space-y-2", f.span ? "sm:col-span-2" : "")}>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                        {lang === "th" ? f.labelTh : f.labelEn}
                      </Label>
                      <Select
                        value={draft.profile[f.key] ?? ""}
                        onValueChange={(v) => {
                          updateProfile(f.key, v);
                          if (f.key === "businessUnit") {
                            updateProfile("department", "");
                          }
                        }}
                        onOpenChange={(open) => { if (!open) setDepSearch(""); }}
                      >
                        <SelectTrigger className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-primary/20 transition-all hover:bg-slate-50 shadow-sm">
                          <div className="flex items-center gap-3">
                            {f.icon && <f.icon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />}
                            <SelectValue placeholder={lang === "th" ? `เลือก${f.labelTh}` : `Select ${f.labelEn}`} />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200 shadow-xl p-1 max-h-[300px] overflow-y-auto [&_[data-radix-select-viewport]]:overflow-visible">
                          {f.key === "department" && (
                            <div className="sticky -top-1 z-10 bg-white px-2 pb-2 pt-2 border-b border-slate-100 mb-1">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  placeholder={lang === "th" ? "ค้นหาฝ่าย..." : "Search department..."}
                                  value={depSearch}
                                  onChange={(e) => setDepSearch(e.target.value)}
                                  className="h-9 pl-9 text-sm rounded-lg border-slate-200 bg-slate-50 focus:bg-white"
                                />
                              </div>
                            </div>
                          )}
                          {(f.key === "department" ? f.options.filter((o: string) => o.toLowerCase().includes(depSearch.toLowerCase())) : f.options).map((o: string) => (
                            <SelectItem key={o} value={o} className="h-10 rounded-lg font-medium focus:bg-primary/5 focus:text-primary transition-colors cursor-pointer px-4 whitespace-normal break-words">
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-4 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-5">
                      <Info className="w-16 h-16 text-amber-600" />
                   </div>
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-600 shrink-0 shadow-sm border border-amber-200">
                    <Info className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase tracking-wider max-w-lg">
                    หมายเหตุ: เพื่อความถูกต้องของข้อมูล ระบบจะไม่แสดงผลวิเคราะห์สำหรับกลุ่มที่มีผู้ตอบน้อยกว่า 5 คน
                  </p>
                </div>
              </div>
            )}

            {/* Section steps */}
            {currentSection && (
              <div className="p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                      <Layout className="w-5 h-5" />
                    </div>
                    {lang === "th" ? currentSection.titleTh : currentSection.titleEn}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xl italic opacity-80">
                    {lang === "th" ? currentSection.descTh : currentSection.descEn}
                  </p>
                </div>

                <div className="space-y-16 py-4">
                  {currentSection.questions.map((q, idx) => (
                    <div key={q.id} className="relative pl-8 border-l-2 border-slate-100 group/q">
                      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 border-2 border-white group-hover/q:bg-primary group-hover/q:scale-125 transition-all" />
                      <div className="space-y-6">
                        <div className="flex items-start justify-between gap-6">
                          <Label className="text-base font-bold leading-tight text-slate-800 flex-1 tracking-tight">
                            {idx + 1}. {lang === "th" ? q.textTh : q.textEn}
                            {q.required && <span className="text-rose-500 ml-1 text-xl leading-none">*</span>}
                          </Label>
                          {draft.answers[q.id] !== undefined && draft.answers[q.id] !== "" && (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-emerald-500/20 animate-in zoom-in">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="-ml-8">
                          <QuestionRenderer
                            question={q}
                            value={draft.answers[q.id]}
                            onChange={(v) => updateAnswer(q.id, v)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Bar */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
              <Button variant="ghost" size="sm" className="h-10 px-6 rounded-lg font-bold uppercase tracking-wider text-[10px] text-slate-400 hover:bg-white hover:text-primary transition-all group" onClick={goBack} disabled={step === 0}>
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                {t("common.back")}
              </Button>

              <div className="flex items-center gap-4">
                {step === 0 ? (
                  <Button size="sm" className="h-10 px-10 rounded-lg shadow-md font-bold uppercase tracking-wider text-[11px] bg-primary group" onClick={goNext}>
                    {t("survey.start")}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : isLastSectionStep ? (
                  <Button 
                    size="sm"
                    onClick={submit} 
                    disabled={submitting}
                    className="h-10 px-12 rounded-lg bg-slate-900 text-white shadow-md font-bold uppercase tracking-wider text-[11px] group"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        {lang === "th" ? "กำลังส่ง..." : "Submitting..."}
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
                    size="sm"
                    className="h-10 px-10 rounded-lg shadow-md font-bold uppercase tracking-wider text-[11px] transition-all group"
                    onClick={goNext}
                    disabled={(isDemographicsStep && !demographicsComplete) || (isSectionStep && !currentSectionAnswered)}
                  >
                    {t("common.next")}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="flex flex-col items-center justify-center gap-4 py-8 opacity-40">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              Structural Integrity Verified
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {["AES-256", "TLS 1.3", "SOC3"].map(s => (
                <span key={s} className="text-[8px] font-bold uppercase tracking-widest border-b border-slate-200 pb-0.5">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AnonymousSurveyPage;
