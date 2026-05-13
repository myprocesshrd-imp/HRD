import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { getSurveySections, OPEN_FEEDBACK } from "@/services/api";
import type { MockSurvey, SurveySection } from "@/services/api";
import { 
  X, Smartphone, Tablet, Monitor, ChevronLeft, ChevronRight, 
  CheckCircle2, Info, MessageSquare, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewSurveyDialogProps {
  survey: MockSurvey;
  onClose: () => void;
}

export function PreviewSurveyDialog({ survey, onClose }: PreviewSurveyDialogProps) {
  const { lang, t } = useI18n();
  const [viewMode, setViewMode] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSurveySections(survey.id).then((data) => {
      setSections(data);
      setLoading(false);
    });
  }, [survey.id]);

  const totalSteps = 2 + sections.length + 1; // Intro + Profile + Sections + Feedback
  const isSectionStep = step >= 2 && step < 2 + sections.length;
  const sectionIndex = step - 2;
  const currentSection = isSectionStep ? sections[sectionIndex] : null;
  const isFeedbackStep = step === 2 + sections.length;
  const isDone = step === totalSteps;
  const progress = Math.round((step / (totalSteps - 1)) * 100);

  const handleNext = () => setStep(s => Math.min(totalSteps, s + 1));
  const handleBack = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl flex flex-col h-full bg-background border shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{lang === "th" ? "ตัวอย่างแบบสำรวจ" : "Survey Preview"}</h2>
              <p className="text-xs text-muted-foreground">{lang === "th" ? survey.titleTh : survey.titleEn}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg border">
            <Button 
              variant={viewMode === "mobile" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setViewMode("mobile")}
            >
              <Smartphone className="w-4 h-4 mr-1.5" />
              <span className="text-xs">Mobile</span>
            </Button>
            <Button 
              variant={viewMode === "tablet" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setViewMode("tablet")}
            >
              <Tablet className="w-4 h-4 mr-1.5" />
              <span className="text-xs">Tablet</span>
            </Button>
            <Button 
              variant={viewMode === "desktop" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setViewMode("desktop")}
            >
              <Monitor className="w-4 h-4 mr-1.5" />
              <span className="text-xs">Desktop</span>
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-muted/50 overflow-hidden relative flex items-center justify-center p-6">
          <div 
            className={cn(
              "bg-background border shadow-xl transition-all duration-500 overflow-hidden flex flex-col",
              viewMode === "mobile" && "w-[375px] h-[667px] rounded-[3rem] border-[8px] border-slate-900",
              viewMode === "tablet" && "w-[768px] h-[1024px] max-h-full rounded-2xl border-4 border-slate-900",
              viewMode === "desktop" && "w-full h-full rounded-lg border shadow-sm"
            )}
          >
            {/* Device StatusBar (Mock) */}
            {viewMode !== "desktop" && (
              <div className="h-6 w-full flex items-center justify-center pt-2">
                <div className="w-20 h-4 bg-slate-900 rounded-full" />
              </div>
            )}

            {/* Inner Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground animate-pulse">
                  {lang === "th" ? "กำลังโหลด..." : "Loading preview..."}
                </div>
              ) : isDone ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-success" />
                  </div>
                  <h3 className="text-xl font-bold">{t("survey.thankYou")}</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    {lang === "th" ? "นี่เป็นเพียงตัวอย่างเท่านั้น ข้อมูลจะไม่ถูกบันทึก" : "This is a preview mode. No data was saved."}
                  </p>
                  <Button variant="outline" className="mt-8" onClick={() => setStep(0)}>
                    {lang === "th" ? "เริ่มใหม่อีกครั้ง" : "Start Again"}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Progress Bar */}
                  <div className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">
                      <span>{t("survey.progress")}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  <ScrollArea className="flex-1 px-6 py-6">
                    <div className="space-y-6 max-w-2xl mx-auto">
                      {/* Step 0: Intro */}
                      {step === 0 && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none px-2 py-0 h-5 text-[10px]">PREVIEW MODE</Badge>
                          <h1 className="text-2xl font-bold leading-tight">{lang === "th" ? survey.titleTh : survey.titleEn}</h1>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {lang === "th" 
                              ? "แบบสำรวจนี้ถูกสร้างขึ้นเพื่อทดสอบการแสดงผลและลำดับคำถามก่อนใช้งานจริง" 
                              : "This survey is generated for previewing layouts and question flows before publishing."}
                          </p>
                          <div className="p-4 rounded-xl bg-primary-soft border border-primary/10 flex gap-3">
                            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed text-primary-dark">
                              {lang === "th" 
                                ? "คุณสามารถเปลี่ยนมุมมองระหว่าง มือถือ, แท็บเล็ต และคอมพิวเตอร์ ได้ที่แถบด้านบน" 
                                : "You can switch between Mobile, Tablet, and Desktop views using the top bar."}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 1: Profile */}
                      {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                            <UserCheck className="w-4 h-4" />
                            {t("survey.confirmProfile")}
                          </div>
                          <div className="p-5 rounded-2xl border bg-muted/30 space-y-4">
                             <div className="flex items-center gap-3">
                               <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">JD</div>
                               <div>
                                 <div className="font-semibold text-sm">John Doe (Demo)</div>
                                 <div className="text-[10px] text-muted-foreground uppercase">ADMIN PREVIEW USER</div>
                               </div>
                             </div>
                             <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                               <div className="space-y-0.5"><span className="text-muted-foreground">Dept</span><div className="font-medium">HR Strategy</div></div>
                               <div className="space-y-0.5"><span className="text-muted-foreground">Level</span><div className="font-medium">Manager</div></div>
                             </div>
                          </div>
                          <p className="text-[10px] text-center text-muted-foreground italic">
                            {lang === "th" ? "ข้อมูลโปรไฟล์จะแสดงตามสิทธิของผู้ใช้งานที่ทำแบบสำรวจ" : "Profile data reflects the respondent's HRMS record."}
                          </p>
                        </div>
                      )}

                      {/* Section Steps */}
                      {currentSection && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                           <div>
                             <h3 className="font-bold text-lg text-primary">{lang === "th" ? currentSection.titleTh : currentSection.titleEn}</h3>
                             <p className="text-xs text-muted-foreground mt-1">{lang === "th" ? currentSection.descTh : currentSection.descEn}</p>
                           </div>
                           <div className="space-y-8 pt-2">
                             {currentSection.questions.map((q, idx) => (
                               <div key={q.id} className="space-y-3">
                                 <div className="flex gap-2">
                                   <span className="text-[10px] font-mono font-bold text-muted-foreground/50 mt-1">{idx+1}.</span>
                                   <div className="flex-1">
                                      <QuestionRenderer 
                                        question={q} 
                                        value={answers[q.id]} 
                                        onChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))} 
                                      />
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}

                      {/* Feedback Step */}
                      {isFeedbackStep && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                           <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                             <MessageSquare className="w-4 h-4" />
                             {t("survey.feedback")}
                           </div>
                           <div className="space-y-6">
                             {OPEN_FEEDBACK.map(q => (
                               <div key={q.id}>
                                 <QuestionRenderer 
                                    question={q} 
                                    value={feedback[q.id]} 
                                    onChange={(v) => setFeedback(prev => ({ ...prev, [q.id]: String(v) }))} 
                                  />
                               </div>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Footer Controls */}
                  <div className="p-6 border-t bg-muted/10 flex items-center justify-between gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleBack} 
                      disabled={step === 0}
                      className="h-10 px-4"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1.5" />
                      {t("common.back")}
                    </Button>
                    <Button 
                      onClick={handleNext}
                      className="h-10 px-6 font-semibold"
                    >
                      {step === totalSteps - 1 ? (lang === "th" ? "จบการทดสอบ" : "Finish Preview") : t("common.next")}
                      <ChevronRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 border-t bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success" /> SYSTEM ONLINE</span>
            <span className="uppercase">{survey.id}</span>
            <span className="uppercase">{survey.surveyType}</span>
          </div>
          <div>DOUBLE A HR PULSE SURVEY PLATFORM</div>
        </div>
      </div>
    </div>
  );
}
