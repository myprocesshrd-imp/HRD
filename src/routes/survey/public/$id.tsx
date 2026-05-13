import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { getSurveySections, OPEN_FEEDBACK } from "@/lib/mock-data";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { loadDraft, saveDraft, clearDraft } from "@/services/survey.service";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fireConfetti } from "@/lib/confetti";
import {
  ClipboardList, ArrowLeft, ArrowRight, CheckCircle2, Save, ShieldCheck, Clock, Globe,
  Users, Building2, MapPin, Hash, CalendarDays, VenetianMask,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEPARTMENTS, BUSINESS_UNITS, LOCATIONS, LEVELS, GENDERS, AGE_RANGES, TENURE,
} from "@/lib/mock-data";

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
  const sections = getSurveySections(id);
  const [step, setStep] = useState(0);
  // 0 = intro, 1.. = sections, last = feedback, last+1 = done
  const [draft, setDraft] = useState<DraftState>({ profile: {}, answers: {}, feedback: {} });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pageKey, setPageKey] = useState(0);

  // load draft
  useEffect(() => {
    const saved = loadDraft("s4", undefined);
    if (saved) {
      setDraft({ profile: saved.profile ?? {}, answers: saved.answers, feedback: saved.feedback });
    }
  }, []);

  // autosave
  useEffect(() => {
    const id = setTimeout(() => {
      saveDraft({
        surveyId: "s4",
        anonymous: true,
        profile: draft.profile,
        answers: draft.answers,
        feedback: draft.feedback,
        startedAt: Date.now(),
      });
      setSavedAt(new Date());
    }, 400);
    return () => clearTimeout(id);
  }, [draft]);

  const totalSteps = 1 + 1 + sections.length + 1;
  const progress = Math.round((step / (totalSteps - 1)) * 100);
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
        if (v === undefined || v === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    : true;

  const isFeedbackStep = step === 2 + sections.length;
  const isDone = step === totalSteps;

  const demographicsComplete = ["department", "businessUnit", "level", "location", "ageRange", "gender", "tenure"]
    .every((k) => (draft.profile[k] ?? "").length > 0);

  const goNext = () => {
    setPageKey((k) => k + 1);
    setStep((s) => Math.min(totalSteps, s + 1));
  };
  const goBack = () => {
    setPageKey((k) => k + 1);
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = () => {
    clearDraft("s4", undefined);
    setStep(totalSteps);
    fireConfetti();
    setTimeout(() => {
      toast.success(lang === "th" ? "ส่งแบบสำรวจเรียบร้อยแล้ว" : "Survey submitted successfully");
    }, 200);
  };

  const updateAnswer = (qId: string, value: number | string | string[] | Record<string, string>) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [qId]: value } }));
  };

  const updateProfile = (field: string, value: string) => {
    setDraft((d) => ({ ...d, profile: { ...d.profile, [field]: value } }));
  };

  const updateFeedback = (qId: string, value: string) => {
    setDraft((d) => ({ ...d, feedback: { ...d.feedback, [qId]: value } }));
  };

  if (isDone) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="text-center p-10 stagger-children">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-bounce-in">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold mt-6">{t("survey.thankYou")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("survey.thankYouDesc")}</p>
          <Button className="mt-8" onClick={() => { setDraft({ profile: {}, answers: {}, feedback: {} }); setStep(0); }}>
            {lang === "th" ? "กลับสู่หน้าแรก" : "Back to start"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <span className="font-semibold tracking-tight">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Globe className="w-3 h-3" />
            {t("survey.anonymousDescShort")}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="w-4 h-4" />
            <span>{t("survey.anonymousTitle")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
            {step === 0
              ? t("survey.startLabelAnon")
              : isFeedbackStep
                ? t("survey.feedback")
                : currentSection
                  ? (lang === "th" ? currentSection.titleTh : currentSection.titleEn)
                  : ""}
          </h1>
        </div>

        {step > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                {t("survey.progress")} · 
                <span className="tabular-nums inline-block min-w-[2.5ch]">{animatedProgress}</span>%
                {milestone && (
                  <span className="ml-2 animate-fade-in text-primary font-medium" key={milestone}>
                    {milestone}
                  </span>
                )}
              </span>
              {savedAt && (
                <span className="flex items-center gap-1">
                  <Save className="w-3 h-3" /> {t("survey.autoSaved")}
                </span>
              )}
            </div>
            <div className="relative">
              <Progress value={progress} className="h-1.5 transition-all duration-500" />
              {progress >= 100 && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
              )}
            </div>
          </div>
        )}

        <Card className="p-6 md:p-8" key={pageKey}>
          {/* Step 0: Intro */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-3 rounded-md bg-primary-soft border border-primary/20 text-sm">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>{t("survey.anonymousDesc")}</span>
              </div>
              <p className="text-muted-foreground">
                {lang === "th"
                    ? "เราจะเก็บเฉพาะข้อมูลพื้นฐาน เช่น หน่วยงาน ช่วงอายุ และอายุงาน เพื่อวิเคราะห์ในภาพรวมเท่านั้น ไม่สามารถระบุตัวตนของคุณได้"
                    : "We only collect basic info like department, age range, and tenure for aggregate analysis. You cannot be identified."}
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Clock, label: t("survey.duration") },
                  { icon: ShieldCheck, label: t("survey.anonymousDescShort") },
                  { icon: Save, label: lang === "th" ? "บันทึกอัตโนมัติ" : "Auto-saved" },
                ].map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.label} className="flex items-center gap-2.5 p-3 rounded-md border border-border bg-muted/30 text-sm">
                      <Icon className="w-4 h-4 text-primary" />
                      <span>{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Demographics */}
          {isDemographicsStep && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                {lang === "th"
                  ? "ข้อมูลเหล่านี้ใช้สำหรับวิเคราะห์ในภาพรวมรายแผนกเท่านั้น ไม่สามารถระบุตัวตนของคุณได้"
                  : "This data is used for department-level analysis only and cannot identify you."}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "department", labelTh: "หน่วยงาน", labelEn: "Department", icon: Building2, options: DEPARTMENTS },
                  { key: "businessUnit", labelTh: "หน่วยธุรกิจ", labelEn: "Business Unit", icon: Building2, options: BUSINESS_UNITS },
                  { key: "level", labelTh: "ระดับพนักงาน", labelEn: "Level", icon: Users, options: LEVELS },
                  { key: "location", labelTh: "สถานที่ทำงาน", labelEn: "Location", icon: MapPin, options: LOCATIONS },
                  { key: "ageRange", labelTh: "ช่วงอายุ", labelEn: "Age Range", icon: CalendarDays, options: AGE_RANGES },
                  { key: "gender", labelTh: "เพศ", labelEn: "Gender", icon: VenetianMask, options: GENDERS },
                  { key: "tenure", labelTh: "อายุงาน", labelEn: "Tenure", icon: Hash, options: TENURE, span: true },
                ].map((f) => (
                  <div key={f.key} className={`space-y-1.5 ${f.span ? "sm:col-span-2" : ""}`}>
                    <Label className="text-xs font-medium">
                      {lang === "th" ? f.labelTh : f.labelEn}
                    </Label>
                    <Select
                      value={draft.profile[f.key] ?? ""}
                      onValueChange={(v) => updateProfile(f.key, v)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder={lang === "th" ? `เลือก${f.labelTh}` : `Select ${f.labelEn}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section steps */}
          {currentSection && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {lang === "th" ? currentSection.descTh : currentSection.descEn}
              </p>
              <div className="space-y-5">
                {currentSection.questions.map((q, idx) => (
                  <div key={q.id} className="border-b border-border pb-5 last:border-b-0 last:pb-0">
                    <div className="flex gap-3">
                      <span className="text-xs font-mono text-muted-foreground mt-1 w-6 shrink-0">{idx + 1}.</span>
                      <div className="flex-1 space-y-3">
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

          {/* Feedback */}
          {isFeedbackStep && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{t("survey.feedbackDesc")}</p>
              {OPEN_FEEDBACK.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <Label className="text-sm">
                    {lang === "th" ? q.textTh : q.textEn}{" "}
                    <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
                  </Label>
                  <QuestionRenderer
                    question={q}
                    value={draft.feedback[q.id]}
                    onChange={(v) => updateFeedback(q.id, String(v))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            <Button variant="ghost" onClick={goBack} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t("common.back")}
            </Button>
            {step === 0 ? (
              <Button onClick={goNext}>
                {t("survey.start")}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : isDemographicsStep ? (
              <Button onClick={goNext} disabled={!demographicsComplete}>
                {t("common.next")}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : isFeedbackStep ? (
              <Button onClick={submit}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {t("common.submit")}
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={isSectionStep && !currentSectionAnswered}
              >
                {t("common.next")}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground mt-6">
          {lang === "th"
            ? "HR Pulse · แพลตฟอร์มสำรวจความผูกพันของพนักงาน"
            : "HR Pulse · Employee Engagement Survey Platform"}
        </div>
      </main>
    </div>
  );
}
