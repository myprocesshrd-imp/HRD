import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MOCK_SURVEYS, getSurveySections, OPEN_FEEDBACK, type MockSurvey } from "@/lib/mock-data";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { getHRMSProfile, type HRMSProfile } from "@/services/hrms.service";
import { loadDraft, saveDraft, clearDraft } from "@/services/survey.service";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fireConfetti } from "@/lib/confetti";
import {
  ClipboardList, ArrowLeft, ArrowRight, CheckCircle2, Save, ShieldCheck, Clock, Pencil,
  CalendarDays, BarChart3, Globe,
} from "lucide-react";
import { toast } from "sonner";

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

// ── Survey List ──
function SurveyList({ onSelect }: { onSelect: (survey: MockSurvey) => void }) {
  const { t, lang } = useI18n();
  const available = MOCK_SURVEYS.filter((s) => s.status === "Active" || s.status === "Draft");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("survey.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "th" ? "เลือกแบบสำรวจที่ต้องการทำ" : "Select a survey to begin"}
        </p>
      </div>
      <div className="space-y-3">
        {available.map((s) => {
          const sections = getSurveySections(s.id);
          const totalQ = sections.reduce((sum, sec) => sum + sec.questions.length, 0) + OPEN_FEEDBACK.length;
          return (
            <Card key={s.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => onSelect(s)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{lang === "th" ? s.titleTh : s.titleEn}</h3>
                      <Badge variant={s.status === "Active" ? "default" : "outline"} className="text-[10px]">
                        {s.status === "Active" ? t("common.active") : t("common.draft")}
                      </Badge>
                      <Badge variant={s.surveyType === "anonymous" ? "outline" : "secondary"} className="text-[10px]">
                        {s.surveyType === "anonymous" ? (lang === "th" ? "ไม่ระบุตัวตน" : "Anonymous") : (lang === "th" ? "ระบุตัวตน" : "Identified")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" />
                        {totalQ} {lang === "th" ? "คำถาม" : "questions"} · {sections.length} {lang === "th" ? "หมวด" : "sections"}
                      </span>
                      {s.status === "Active" && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {s.startDate} → {s.endDate}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {s.responses}/{s.target} {lang === "th" ? "คนตอบ" : "responses"}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0">
                    {t("survey.start")}
                    <ArrowRight className="w-4 h-4 ml-1" />
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

// ── Survey Flow ──
function SurveyFlow({ survey, onBack }: { survey: MockSurvey; onBack: () => void }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const surveyId = survey.id;
  const sections = getSurveySections(surveyId);
  const [step, setStep] = useState(0);
  // 0 = intro, 1 = profile review, 2.. = sections, last = feedback, last+1 = done
  const [draft, setDraft] = useState<DraftState>({ surveyId, anonymous: false, answers: {}, feedback: {}, startedAt: Date.now() });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hrmsProfile, setHrmsProfile] = useState<HRMSProfile | null>(null);
  const [profileConfirmed, setProfileConfirmed] = useState(false);

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
        if (v === undefined || v === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    : true;

  const isFeedbackStep = step === 2 + sections.length;
  const isDone = step === totalSteps;

  const submit = () => {
    clearDraft(surveyId, user?.id);
    setStep(totalSteps);
    fireConfetti();
    setTimeout(() => {
      toast.success(lang === "th" ? "ส่งแบบสำรวจเรียบร้อยแล้ว" : "Survey submitted successfully");
    }, 200);
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

  if (isDone) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="text-center p-10 stagger-children">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-bounce-in">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold mt-6">{t("survey.thankYou")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("survey.thankYouDesc")}</p>
          <div className="flex gap-3 justify-center mt-8">
            <Button variant="outline" onClick={onBack}>
              {lang === "th" ? "กลับไปเลือกแบบสำรวจ" : "Back to surveys"}
            </Button>
            <Button onClick={() => { setDraft({ surveyId, anonymous: false, answers: {}, feedback: {}, startedAt: Date.now() }); setStep(0); setProfileConfirmed(false); }}>
              {lang === "th" ? "กลับสู่หน้าแรก" : "Back to start"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="w-4 h-4" />
          <button onClick={onBack} className="hover:text-foreground transition-colors">
            {lang === "th" ? "เลือกแบบสำรวจ" : "Survey list"}
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground/80 truncate max-w-[200px]">
            {lang === "th" ? survey.titleTh : survey.titleEn}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
          {step === 0
            ? (lang === "th" ? "เริ่มทำแบบสำรวจ" : "Start Survey")
            : isFeedbackStep
              ? t("survey.feedback")
              : currentSection
                ? (lang === "th" ? currentSection.titleTh : currentSection.titleEn)
                : t("survey.confirmProfile")}
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
            <p className="text-muted-foreground">
              {lang === "th"
                ? "แบบสำรวจนี้เป็นส่วนหนึ่งของการพัฒนาประสบการณ์ของพนักงานในองค์กร คำตอบของคุณจะถูกเก็บเป็นความลับ และนำไปวิเคราะห์ในรูปแบบรวมเท่านั้น"
                : "This survey supports our continuous improvement of employee experience. Your responses are confidential and analyzed only in aggregate."}
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Clock, label: t("survey.duration") },
                { icon: ShieldCheck, label: lang === "th" ? "ปลอดภัยและเข้ารหัส" : "Secure & encrypted" },
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
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch
                  id="anonymous"
                  checked={draft.anonymous}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, anonymous: !!v }))}
                />
                <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                  {lang === "th" ? "ตอบแบบไม่ระบุตัวตน" : "Submit anonymously"}
                </Label>
              </div>
              {user && !draft.anonymous && (
                <Badge variant="secondary" className="text-xs">
                  {lang === "th" ? "ตอบในนาม" : "Responding as"}: {lang === "th" ? user.nameTh : user.nameEn}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Step 1: HRMS Profile Review */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{t("survey.profileReviewDesc")}</p>
            {hrmsProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold">
                    {hrmsProfile.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{lang === "th" ? hrmsProfile.nameTh : hrmsProfile.nameEn}</div>
                    <div className="text-sm text-muted-foreground">{hrmsProfile.email}</div>
                    <Badge variant="outline" className="mt-1 text-[10px]">{t("survey.hrmsBadge")}</Badge>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    { label: t("common.department"), value: hrmsProfile.department },
                    { label: t("common.level"), value: hrmsProfile.level },
                    { label: t("common.location"), value: hrmsProfile.location },
                    { label: t("common.businessUnit"), value: hrmsProfile.businessUnit },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-medium">{f.value}</span>
                    </div>
                  ))}
                </div>
                {!profileConfirmed ? (
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => setProfileConfirmed(true)} className="flex-1">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {t("survey.profileConfirmBtn")}
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Pencil className="w-4 h-4 mr-1.5" />
                      {t("common.edit")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-success/10 text-sm text-success-foreground">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("survey.profileConfirmed")}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {lang === "th" ? "กำลังโหลดข้อมูล..." : "Loading profile..."}
              </div>
            )}
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
          ) : isFeedbackStep ? (
            <Button onClick={submit}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {t("common.submit")}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={(step === 1 && !profileConfirmed) || (isSectionStep && !currentSectionAnswered)}
            >
              {t("common.next")}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Wrapper ──
function SurveyPageWrapper() {
  const [selected, setSelected] = useState<MockSurvey | null>(null);

  if (!selected) {
    return <SurveyList onSelect={setSelected} />;
  }
  return <SurveyFlow survey={selected} onBack={() => setSelected(null)} />;
}
