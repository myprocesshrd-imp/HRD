import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getSurveys, getSurveySections, submitSurveyResponse, getDemographicsConstants, getDepartmentsWithId, getBusinessUnits } from "@/services/api";
import { getDemographicOptions, type DemographicOption } from "@/services/api/demographic-options";
import type { Department, BusinessUnit } from "@/services/api";
import type { MockSurvey, SurveySection } from "@/services/api";
import { DEMOGRAPHIC_FIELDS_REGISTRY } from "@/lib/mock-data";
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
  Zap, Rocket, Target, Shield, Lock, Fingerprint, VenetianMask, Hash,
  Users, Search
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const surveySearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_app/survey")({
  validateSearch: (search) => surveySearchSchema.parse(search),
  component: SurveyPageWrapper,
});

interface DraftState {
  surveyId: string;
  anonymous: boolean;
  profile: Record<string, string>;
  answers: Record<string, number | string | string[] | Record<string, string>>;
  feedback: Record<string, string>;
  startedAt: number;
}

// ── Survey Flow ──
function SurveyFlow({ survey, onBack }: { survey: MockSurvey; onBack: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const surveyId = survey.id;
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>({ surveyId, anonymous: survey.surveyType === "anonymous", profile: {}, answers: {}, feedback: {}, startedAt: Date.now() });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hrmsProfile, setHrmsProfile] = useState<HRMSProfile | null>(null);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoConstants, setDemoConstants] = useState<Record<string, string[]>>({});
  const [dbDemoOptions, setDbDemoOptions] = useState<DemographicOption[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allBusinessUnits, setAllBusinessUnits] = useState<BusinessUnit[]>([]);
  const [depSearch, setDepSearch] = useState("");

  useEffect(() => {
    Promise.all([
      getDemographicsConstants(),
      getDepartmentsWithId(),
      getBusinessUnits(),
      getDemographicOptions(),
    ]).then(([c, depts, bus, dbOpts]) => {
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
      setDbDemoOptions(dbOpts);
    });
  }, []);

  useEffect(() => {
    getSurveySections(surveyId).then((data) => {
      setSections(data);
      setSectionsLoaded(true);
    });
  }, [surveyId]);

  useEffect(() => {
    const saved = loadDraft(surveyId, user?.id);
    if (saved) {
      setDraft({ surveyId, anonymous: survey.surveyType === "anonymous", profile: saved.profile ?? {}, answers: saved.answers, feedback: saved.feedback, startedAt: saved.startedAt });
    }
    if (user && survey.surveyType !== "anonymous" && !draft.anonymous) {
      getHRMSProfile(user.id)
        .then((p) => {
          setHrmsProfile(p);
          setProfileConfirmed(true);
        })
        .catch((err) => {
          console.warn("[Survey] HRMS profile load failed, auto-proceeding", err);
          setProfileConfirmed(true);
          if (user) {
            setHrmsProfile({
              employeeId: user.id,
              nameTh: user.nameTh,
              nameEn: user.nameEn,
              email: user.email || "",
              department: user.department,
              businessUnit: user.businessUnit || "",
              level: user.level,
              location: user.location,
              avatar: "",
            });
          }
        });
    } else {
      setHrmsProfile(null);
      setProfileConfirmed(true);
    }
  }, [surveyId, user, draft.anonymous]);

  useEffect(() => {
    const id = setTimeout(() => {
      saveDraft({ ...draft, surveyId, userId: user?.id });
      setSavedAt(new Date());
    }, 400);
    return () => clearTimeout(id);
  }, [draft, surveyId, user]);

  const hasProfileStep = survey.surveyType !== "anonymous" && !draft.anonymous;
  const hasDemographicsStep = draft.anonymous;
  const firstSectionStep = 1 + (hasProfileStep ? 1 : 0) + (hasDemographicsStep ? 1 : 0);
  const totalSteps = firstSectionStep + sections.length;
  const progress = Math.round((step / totalSteps) * 100);

  const isProfileStep = hasProfileStep && step === 1;
  const isDemographicsStep = hasDemographicsStep && step === 1;
  const isSectionStep = step >= firstSectionStep && step < firstSectionStep + sections.length;
  const sectionIndex = step - firstSectionStep;
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

  const isLastSectionStep = step === firstSectionStep + sections.length - 1;
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
        else {
          textValue = String(value ?? "");
          if (!isNaN(Number(textValue)) && textValue.trim() !== "") {
            numericValue = Number(textValue);
          }
        }
        return { questionId, numericValue, textValue, arrayTextValue, jsonbValue };
      });

      const result = await submitSurveyResponse({
        surveyId,
        userId: user?.id,
        answers,
        demographics: draft.anonymous ? draft.profile : undefined,
        feedback: [],
        timeSpentSeconds: Math.round((Date.now() - draft.startedAt) / 1000),
      });

      if (!result) throw new Error("submit failed");

      clearDraft(surveyId, user?.id);
      setStep(totalSteps);
      fireConfetti();
      toast.success(lang === "th" ? "ส่งคำตอบเรียบร้อยแล้ว" : "Intelligence transmitted successfully", { duration: 1500 });
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาดในการส่งข้อมูล" : "Transmission failure detected");
    }
    setSubmitting(false);
  };

  const updateAnswer = (qId: string, value: number | string | string[] | Record<string, string>) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [qId]: value } }));
  };

  const updateProfile = (key: string, value: string) => {
    setDraft((d) => ({ ...d, profile: { ...d.profile, [key]: value } }));
  };

  const reducedMotion = useReducedMotion();
  const animatedProgress = useAnimatedCounter(progress, reducedMotion ? 0 : 600);

  const ICON_MAP: Record<string, any> = {
    VenetianMask, CalendarDays, Hash, MapPin, Building2, Users
  };

  // Build map: BU name → BU id
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
        const demoKey = f.key === "department" ? "department" : f.key;

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
          // Filter departments by selected BU when possible
          if (selectedBUId) {
            const filtered = allDepartments
              .filter(d => (d.business_unit_ids ?? []).includes(selectedBUId))
              .map(d => lang === "th" && d.name_th ? d.name_th : d.name_en);
            options = filtered.length > 0 ? filtered : allDepartments.map(d => lang === "th" && d.name_th ? d.name_th : d.name_en);
          } else {
            options = allDepartments.map(d => lang === "th" && d.name_th ? d.name_th : d.name_en);
          }
        } else if (demoConstants[demoKey]?.length > 0) {
          options = demoConstants[demoKey];
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
          icon: ICON_MAP[f.icon as keyof typeof ICON_MAP],
          options: options,
          span: f.key === "tenure",
        };
      });
  }, [survey, demoConstants, draft.profile, buNameToId, allDepartments, lang]);

  const demographicsComplete = activeDemoFields.length === 0 || activeDemoFields.every((f: any) => (draft.profile[f.key] ?? "").length > 0);

  const getOptionLabel = (fieldKey: string, optionValue: string) => {
    const dbOpt = dbDemoOptions.find(
      (opt) =>
        (opt.field_key === fieldKey ||
         opt.field_key === fieldKey + "s" ||
         (fieldKey === "ageRange" && opt.field_key === "ageRanges")) &&
        (opt.value === optionValue || opt.label_en === optionValue)
    );
    if (lang === "th" && dbOpt) {
      return dbOpt.label_th;
    }
    if (lang === "th") {
      const fallbackMap: Record<string, string> = {
        "Male": "ชาย",
        "Female": "หญิง",
        "LGBTQ+": "LGBTQ+",
        "Prefer not to say": "ไม่ต้องการระบุ",
        "Under 20": "ต่ำกว่า 20 ปี",
        "21-25": "21-25 ปี",
        "26-30": "26-30 ปี",
        "31-35": "31-35 ปี",
        "36-40": "36-40 ปี",
        "41-50": "41-50 ปี",
        "Over 50": "มากกว่า 50 ปี",
        "Less than 1 year": "น้อยกว่า 1 ปี",
        "1-3 years": "1-3 ปี",
        "4-6 years": "4-6 ปี",
        "7-10 years": "7-10 ปี",
        "More than 10 years": "มากกว่า 10 ปี",
        "Head Office": "สำนักงานใหญ่",
        "Factory": "โรงงาน",
        "Warehouse": "คลังสินค้า",
        "Branch Office": "สาขา",
        "Remote Work": "ทำงานทางไกล (Remote)",
        "Operational Level": "ระดับปฏิบัติการ",
        "Supervisor": "หัวหน้างาน",
        "Assistant Manager": "ผู้ช่วยผู้จัดการ",
        "Manager": "ผู้จัดการ",
        "Senior Manager": "ผู้จัดการอาวุโส",
        "Executive": "ผู้บริหาร",
      };
      return fallbackMap[optionValue] || optionValue;
    }
    return optionValue;
  };

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
  const goNext = () => {
    setPageKey((k) => k + 1);
    setStep((s) => {
      if (s === 0) return 1;
      return Math.min(totalSteps, s + 1);
    });
  };
  const goBack = () => {
    setPageKey((k) => k + 1);
    setStep((s) => {
      if (s === firstSectionStep) return 1;
      return Math.max(0, s - 1);
    });
  };

  if (!sectionsLoaded) return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <div className="w-12 h-12 rounded-xl border-4 border-primary/10 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground italic">{lang === "th" ? "กำลังโหลดแบบสำรวจ..." : "Loading survey..."}</p>
    </div>
  );

  if (isDone) {
    return (
      <div className="max-w-xl mx-auto py-10 animate-in zoom-in-95 duration-500">
        <Card className="text-center p-10 shadow-xl border-slate-100 dark:border-slate-800 relative overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary/50" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50/50 dark:ring-emerald-500/10">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t("survey.thankYou")}</h2>
          <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed max-w-sm mx-auto italic opacity-80">
            {t("survey.thankYouDesc")}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-bold uppercase tracking-wider text-[10px] hover:bg-slate-50 transition-all" onClick={onBack}>
              {lang === "th" ? "กลับสู่รายการ" : "Back to List"}
            </Button>
            <Button className="h-10 rounded-xl shadow-lg shadow-primary/20 font-bold uppercase tracking-wider text-[10px]" onClick={() => { setDraft({ surveyId, anonymous: survey.surveyType === "anonymous", profile: {}, answers: {}, feedback: {}, startedAt: Date.now() }); setStep(0); }}>
              {lang === "th" ? "ทำแบบสำรวจอีกครั้ง" : "Take Another Survey"}
            </Button>
          </div>
          <p className="mt-8 text-[9px] uppercase font-bold tracking-[0.3em] text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" />
            {lang === "th" ? "การส่งข้อมูลเป็นความลับและปลอดภัย" : "End-to-End Encryption Active"}
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
            {lang === "th" ? "ย้อนกลับ" : "Go Back"}
          </button>
          <div className="flex items-center gap-4">
            {savedAt && (
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                <Save className="w-3 h-3" /> {t("survey.autoSaved")}
              </span>
            )}
            <Badge variant="outline" className="h-7 text-[9px] font-bold tracking-wider uppercase border-primary/20 text-primary px-3 rounded-lg bg-primary/5 dark:bg-primary/20">
              Seq {step + 1} / {totalSteps}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {step === 0
                ? (lang === "th" ? "เริ่มทำแบบสำรวจ" : "Start Survey")
                : isProfileStep
                  ? t("survey.confirmProfile")
                  : isDemographicsStep
                    ? (lang === "th" ? "ข้อมูลผู้ตอบแบบสำรวจ" : "Respondent Information")
                    : currentSection
                      ? (lang === "th" ? currentSection.titleTh : currentSection.titleEn)
                      : ""}
            </h1>
            <p className="text-xs font-bold text-slate-400 truncate max-w-lg flex items-center gap-2 italic">
              <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
              {lang === "th" ? survey.titleTh : survey.titleEn}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold tabular-nums tracking-tight leading-none text-primary">{animatedProgress}%</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">{lang === "th" ? "ความคืบหน้า" : "Completion"}</div>
          </div>
        </div>

        <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-200 dark:border-slate-700">
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

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800 relative overflow-hidden group rounded-2xl bg-white dark:bg-slate-900/50" key={pageKey}>
        {/* Step 0: Intro */}
        {step === 0 && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
               <div className="absolute -left-1 top-6 bottom-6 w-1 bg-primary rounded-full" />
               <div className="absolute top-0 right-0 p-6 opacity-5">
                  <ShieldCheck className="w-16 h-16" />
               </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic relative pr-10">
                 "{lang === "th"
                    ? "แบบสำรวจนี้ถูกออกแบบมาเพื่อรับฟังความคิดเห็นที่แท้จริงของคุณ ข้อมูลของคุณจะได้รับการปกป้องอย่างสูงสุดภายใต้มาตรฐานความปลอดภัย"
                    : "This survey is designed to capture authentic employee sentiment. Your responses are protected by professional security standards."}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Clock, label: t("survey.duration"), color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                { icon: Lock, label: lang === "th" ? "ข้อมูลเป็นความลับ" : "Confidential", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                { icon: Sparkles, label: lang === "th" ? "ร่วมพัฒนาองค์กรไปด้วยกัน" : "Building Together", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
              ].map((b) => (
                <div key={b.label} className={cn("flex flex-col items-center text-center p-6 rounded-xl border bg-white gap-3 group/item hover:bg-slate-50 transition-all", b.border)}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover/item:scale-105 shadow-sm", b.bg, b.color)}>
                    <b.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.label}</span>
                </div>
              ))}
            </div>


            {user && !draft.anonymous && (
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 animate-in fade-in duration-1000 uppercase tracking-widest">
                <UserCircle2 className="w-3.5 h-3.5 text-primary" />
                {lang === "th" ? "ผู้ตอบแบบสำรวจ" : "Respondent"}: <span className="text-slate-900 dark:text-slate-300">{lang === "th" ? user.nameTh : user.nameEn}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 1: HRMS Profile Review */}
        {isProfileStep && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">{t("survey.confirmProfile")}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{t("survey.profileReviewDesc")}</p>
              </div>
            </div>

            {hrmsProfile ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: UserCircle2, label: "ชื่อ-นามสกุล", value: lang === "th" ? hrmsProfile.nameTh : hrmsProfile.nameEn, color: "text-blue-600" },
                    { icon: Globe, label: "หน่วยงานสังกัด", value: hrmsProfile.businessUnit, color: "text-violet-600" },
                    { icon: Building2, label: "ฝ่าย / แผนก", value: hrmsProfile.department, color: "text-indigo-600" },
                    { icon: Briefcase, label: "ระดับตำแหน่ง", value: hrmsProfile.level, color: "text-emerald-600" },
                    { icon: MapPin, label: "สถานที่ปฏิบัติงาน", value: hrmsProfile.location, color: "text-amber-600" },
                  ].filter((f) => !!f.value).map((f) => (
                    <div key={f.label} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 group/item hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm">
                      <div className={cn("w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0", f.color)}>
                        <f.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{f.label}</p>
                        <p className="font-bold text-sm truncate tracking-tight text-slate-900 dark:text-white">{f.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 p-6 rounded-xl bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest text-[10px] border border-emerald-200 shadow-inner">
                  <CheckCircle2 className="w-5 h-5" />
                  {t("survey.profileConfirmed")}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-4 opacity-60">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{lang === "th" ? "กำลังโหลดข้อมูล..." : "Loading profile..."}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Demographics (for anonymous mode) */}
        {isDemographicsStep && (
          <div className="p-8 md:p-10 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">{lang === "th" ? "ข้อมูลผู้ตอบแบบสำรวจ" : "Personnel Mapping"}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Baseline Context</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
              {activeDemoFields.map((f: any) => (
                <div key={f.key} className={cn("space-y-2", f.span ? "sm:col-span-2" : "")}>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                    {lang === "th" ? f.labelTh : f.labelEn}
                  </Label>
                  <Select
                    value={draft.profile[f.key] ?? ""}
                    onValueChange={(v) => {
                      updateProfile(f.key, v);
                      // Clear department when BU changes
                      if (f.key === "businessUnit") {
                        updateProfile("department", "");
                      }
                    }}
                    onOpenChange={(open) => { if (!open) setDepSearch(""); }}
                  >
                    <SelectTrigger className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-primary/20 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm">
                      <div className="flex items-center gap-3">
                        {f.icon && <f.icon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />}
                        <SelectValue placeholder={lang === "th" ? `เลือก${f.labelTh}` : `Select ${f.labelEn}`} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-1 max-h-[300px] overflow-y-auto [&_[data-radix-select-viewport]]:overflow-visible">
                      {f.key === "department" && (
                        <div className="sticky -top-1 z-10 bg-white dark:bg-slate-900 px-2 pb-2 pt-2 border-b border-slate-100 dark:border-slate-800 mb-1">
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
                          {getOptionLabel(f.key, o)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <Info className="w-16 h-16 text-amber-600" />
              </div>
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-amber-600 shrink-0 shadow-sm border border-amber-200 dark:border-amber-500/20">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed uppercase tracking-wider max-w-lg">
                หมายเหตุ: เพื่อความถูกต้องของข้อมูล ระบบจะไม่แสดงผลวิเคราะห์สำหรับกลุ่มที่มีผู้ตอบน้อยกว่า 5 คน
              </p>
            </div>
          </div>
        )}

        {/* Section steps */}
        {currentSection && (
          <div className="p-8 md:p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h3 className="font-bold text-xl tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Layout className="w-4 h-4" />
                </div>
                {lang === "th" ? currentSection.titleTh : currentSection.titleEn}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl italic">
                {lang === "th" ? currentSection.descTh : currentSection.descEn}
              </p>
            </div>

            <div className="space-y-12 py-4">
              {currentSection.questions.map((q, idx) => (
                <div key={q.id} className="relative pl-8 border-l-2 border-slate-100 group/q transition-all">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 border-2 border-white group-hover/q:bg-primary group-hover/q:scale-125 transition-all" />
                  <div className="space-y-6">
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-6 w-full min-w-0">
                        <Label className="text-base font-bold leading-tight text-slate-800 dark:text-slate-200 tracking-tight flex-1 min-w-0 break-words">
                          {idx + 1}. {lang === "th" ? q.textTh : q.textEn}
                          {q.required && <span className="text-rose-500 ml-1 text-xl leading-none">*</span>}
                        </Label>
                        {draft.answers[q.id] !== undefined && draft.answers[q.id] !== "" && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-emerald-500/20 animate-in zoom-in">
                            <CheckCircle2 className="w-3 h-3 text-white" />
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-10 px-4 rounded-lg font-bold uppercase tracking-wider text-[10px] group text-slate-500 hover:bg-white dark:hover:bg-slate-700 transition-all" onClick={goBack} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {t("common.back")}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 px-4 rounded-lg font-bold uppercase tracking-wider text-[10px] text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950" 
              onClick={() => {
                if (step > 0) {
                  const msg = lang === "th" ? "ออกจากแบบสำรวจ? ข้อมูลที่กรอกไว้จะหายไป" : "Exit survey? Unsaved answers will be lost.";
                  if (!confirm(msg)) return;
                }
                onBack();
              }}
            >
              {lang === "th" ? "ออก" : "Exit"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {step === 0 ? (
              <Button className="h-10 px-10 rounded-lg shadow-md font-bold uppercase tracking-wider text-[11px] group" onClick={goNext}>
                {t("survey.start")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : isLastSectionStep ? (
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
                disabled={(isProfileStep && !profileConfirmed) || (isSectionStep && !currentSectionAnswered) || (isDemographicsStep && !demographicsComplete)}
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
          {lang === "th" ? "ระบบความปลอดภัยข้อมูล" : "Data Security"}
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
  const { id } = Route.useSearch();
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSurveys().then((data) => {
      setSurveys(data.filter((s) => s.status === "Active"));
      setLoading(false);
    });
  }, []);

  const navigate = useNavigate();

  const selectedSurvey = useMemo(() => {
    if (!id) return null;
    return surveys.find((s) => s.id === id) || null;
  }, [id, surveys]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <div className="w-12 h-12 rounded-xl border-4 border-primary/10 border-t-primary animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground italic">Loading...</p>
      </div>
    );
  }

  if (!selectedSurvey) {
    return <RedirectToHome />;
  }

  return <SurveyFlow survey={selectedSurvey} onBack={() => navigate({ to: "/" })} />;
}

function RedirectToHome() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/" });
  }, [navigate]);
  return null;
}

export default SurveyPageWrapper;
