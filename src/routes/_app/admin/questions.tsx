import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { 
  getQuestionBank, createSection, updateSection, deleteSection, 
  createQuestion, updateQuestion, deleteQuestion, 
  reorderQuestions, moveQuestion as moveQuestionApi,
  getBusinessUnits, type BusinessUnit
} from "@/services/api";
import type { SurveySection, Question, QuestionType } from "@/services/api";
import { getSssMappings } from "@/services/api/sss";
import type { SssQuestionMapping } from "@/services/api/sss";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, DialogContent, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Pencil, Trash2, Copy, GripVertical, ChevronDown, ChevronUp,
  Search, Info, ListChecks, CheckCircle2, Star, MessageSquare, 
  LayoutGrid, HelpCircle, Save, FolderTree, Box, Activity, 
  ShieldCheck, Layers, Terminal, Database, Download, MoveRight, FileQuestion,
  UserRound, Clock, Target
} from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/questions")({
  component: QuestionsAdmin,
});

const QUESTION_TYPES: { value: QuestionType; labelEn: string; labelTh: string; icon: any; color: string }[] = [
  { value: "rating", labelEn: "Rating Scale", labelTh: "มาตรวัดระดับ", icon: Star, color: "text-amber-500 bg-amber-500/10" },
  { value: "single_select", labelEn: "Single Choice", labelTh: "เลือกหนึ่งเดียว", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  { value: "multiple_select", labelEn: "Multi-Select", labelTh: "เลือกได้หลายอย่าง", icon: ListChecks, color: "text-indigo-500 bg-indigo-500/10" },
  { value: "open_text_short", labelEn: "Short Text", labelTh: "คำบรรยายสั้น", icon: Info, color: "text-slate-500 bg-slate-500/10" },
  { value: "open_text_long", labelEn: "Narrative", labelTh: "คำบรรยายยาว", icon: FileQuestion, color: "text-slate-700 bg-slate-700/10" },
  { value: "binary", labelEn: "Polarity (Y/N)", labelTh: "ใช่/ไม่ใช่", icon: ShieldCheck, color: "text-rose-500 bg-rose-500/10" },
  { value: "nps", labelEn: "NPS Index", labelTh: "ดัชนี NPS", icon: Activity, color: "text-primary bg-primary/10" },
  { value: "matrix", labelEn: "Dimensional Grid", labelTh: "ตารางมิติ", icon: LayoutGrid, color: "text-violet-500 bg-violet-500/10" },
];

const TYPE_CONFIG = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t]));

interface QuestionForm {
  textEn: string; textTh: string;
  descEn: string; descTh: string;
  type: QuestionType;
  required: boolean;
  category: string;
  minValue: number; maxValue: number;
  choices: { key: string; value: string; labelEn: string; labelTh: string }[];
  rows: { key: string; textEn: string; textTh: string }[];
  columns: { key: string; value: string; labelEn: string; labelTh: string }[];
}

function emptyForm(type: QuestionType = "rating"): QuestionForm {
  return {
    textEn: "", textTh: "", descEn: "", descTh: "",
    type, required: true, category: "",
    minValue: 1, maxValue: 6,
    choices: [{ key: `c${Date.now()}`, value: "1", labelEn: "Excellent", labelTh: "ดีเยี่ยม" }],
    rows: [{ key: `r${Date.now()}`, textEn: "Criteria 1", textTh: "เกณฑ์ที่ 1" }],
    columns: [{ key: `c${Date.now()}`, value: "1", labelEn: "1", labelTh: "1" }],
  };
}

function formFromQuestion(q: Question): QuestionForm {
  return {
    textEn: q.textEn, textTh: q.textTh,
    descEn: q.descEn ?? "", descTh: q.descTh ?? "",
    type: q.type, required: q.required ?? true,
    category: q.category ?? "",
    minValue: q.minValue ?? 1, maxValue: q.maxValue ?? 6,
    choices: (q.choices ?? []).map((c, i) => ({ key: `c${i}${Date.now()}`, ...c })),
    rows: (q.rows ?? []).map((r, i) => ({ key: `r${i}${Date.now()}`, ...r })),
    columns: (q.columns ?? []).map((c, i) => ({ key: `c${i}${Date.now()}`, ...c })),
  };
}

function DragHandle() {
  return (
    <button className="cursor-grab active:cursor-grabbing touch-none p-2 rounded-lg hover:bg-slate-100 transition-all group shrink-0">
      <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
    </button>
  );
}

function SortableQuestionRow({
  question, index, sectionId, onEdit, onDuplicate, onDelete, onMoveToSection, lang, sections, t, sssMappings,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const otherSections = sections.filter((s: any) => s.id !== sectionId);
  const cfg = TYPE_CONFIG[question.type] || TYPE_CONFIG.rating;

  // Format audit timestamp to locale string
  const fmtDate = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const createdLabel = question.createdBy || t("questions.auditUnknown");
  const updatedLabel = question.updatedBy || t("questions.auditUnknown");
  const hasAudit = question.createdAt || question.updatedAt;

  const questionSss = sssMappings?.get(question.id) ?? [];
  const sssLabel = questionSss.map((m: any) => m.dimension.toUpperCase()).join("/");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/row flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300",
        isDragging 
          ? "border-primary bg-primary/[0.02] shadow-xl ring-2 ring-primary/5 scale-[1.01]" 
          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-primary/20 hover:shadow-md"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners}><DragHandle /></div>
        
        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 group-hover/row:text-primary group-hover/row:border-primary/10 transition-all shrink-0">
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold text-slate-900 dark:text-white truncate">
              {lang === "th" ? question.textTh : question.textEn}
            </span>
            {question.required && (
              <Badge className="bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-900/50 h-5 px-2.5 font-bold text-[10px] uppercase tracking-widest shadow-none">REQUIRED</Badge>
            )}
            {questionSss.length > 0 && (
              <Badge className="bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50 h-5 px-2 font-bold text-[10px] uppercase tracking-widest shadow-none flex items-center gap-1 shrink-0">
                <Target className="w-3 h-3" />
                {sssLabel}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-2">
             <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider", cfg.color)}>
                <cfg.icon className="w-4 h-4" />
                {lang === "th" ? cfg.labelTh : cfg.labelEn}
             </div>
              {question.category && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold text-[10px] uppercase tracking-wider border border-slate-100 dark:border-slate-800">
                   <Box className="w-3.5 h-3.5" />
                   {question.category}
                </div>
              )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0 transition-opacity">
          {otherSections.length > 0 && (
            <Select value="" onValueChange={(v) => v && onMoveToSection(question, v)}>
              <SelectTrigger className="h-10 w-10 p-0 border border-slate-200 dark:border-slate-700 hover:border-primary/20 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-none justify-center rounded-xl transition-all">
                <MoveRight className="w-4.5 h-4.5 text-slate-400" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl shadow-xl p-1.5">
                {otherSections.map((s: any) => (
                  <SelectItem key={s.id} value={s.id} className="h-10 rounded-lg text-[11px] font-bold uppercase cursor-pointer">
                    {lang === "th" ? s.titleTh : s.titleEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all" onClick={() => onDuplicate(question)}><Copy className="w-4.5 h-4.5" /></Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all" onClick={() => onEdit(question)}><Pencil className="w-4.5 h-4.5" /></Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-200 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all" onClick={() => onDelete(question)}><Trash2 className="w-4.5 h-4.5" /></Button>
        </div>
      </div>

      {/* Audit strip */}
      {hasAudit && (
        <div className="flex items-center gap-5 pt-2 border-t border-slate-50 dark:border-slate-800/60 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
          {question.createdAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <UserRound className="w-3 h-3 shrink-0 text-slate-300" />
              <span className="text-slate-300 font-bold uppercase tracking-widest">{t("questions.auditCreatedBy")}:</span>
              <span className="font-bold text-slate-500">{createdLabel}</span>
              <Clock className="w-3 h-3 shrink-0 text-slate-300 ml-1" />
              <span>{fmtDate(question.createdAt)}</span>
            </div>
          )}
          {question.updatedAt && question.updatedAt !== question.createdAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Pencil className="w-3 h-3 shrink-0 text-slate-300" />
              <span className="text-slate-300 font-bold uppercase tracking-widest">{t("questions.auditUpdatedBy")}:</span>
              <span className="font-bold text-slate-500">{updatedLabel}</span>
              <Clock className="w-3 h-3 shrink-0 text-slate-300 ml-1" />
              <span>{fmtDate(question.updatedAt)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionsAdmin() {
  const { t, lang } = useI18n();
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sssMappings, setSssMappings] = useState<Map<string, SssQuestionMapping[]>>(new Map());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm());

  const [secDialogOpen, setSecDialogOpen] = useState(false);
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [secCode, setSecCode] = useState("");
  const [secTitleEn, setSecTitleEn] = useState("");
  const [secTitleTh, setSecTitleTh] = useState("");
  const [secDescEn, setSecDescEn] = useState("");
  const [secDescTh, setSecDescTh] = useState("");
  const [secBUId, setSecBUId] = useState<string | undefined>(undefined);

  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteQ, setDeleteQ] = useState<{ sectionId: string; question: Question } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchBank = useCallback(async () => {
    try {
      const [bankData, buData, sssData] = await Promise.all([
        getQuestionBank(),
        getBusinessUnits(),
        getSssMappings()
      ]);
      setSections(bankData);
      setBusinessUnits(buData);
      const map = new Map<string, SssQuestionMapping[]>();
      sssData.filter(m => m.isActive).forEach(m => {
        const existing = map.get(m.questionId) || [];
        existing.push(m);
        map.set(m.questionId, existing);
      });
      setSssMappings(map);
      if (Object.keys(expanded).length === 0) {
        setExpanded(Object.fromEntries(bankData.map(s => [s.id, true])));
      }
    } finally { setIsLoading(false); }
  }, [expanded]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  const openNewSection = () => {
    let maxNum = 0;
    let detectedPrefix = "SEC-";
    sections.forEach(sec => {
      const match = sec.id.match(/^([A-Za-z-]+?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        if (num > maxNum) {
          maxNum = num;
          detectedPrefix = prefix;
        }
      }
    });
    const nextCode = `${detectedPrefix}${maxNum + 1}`;
    setEditingSecId(null); setSecCode(nextCode); setSecTitleEn(""); setSecTitleTh(""); setSecDescEn(""); setSecDescTh(""); setSecBUId(undefined);
    setSecDialogOpen(true);
  };

  const editSection = (sec: SurveySection) => {
    setEditingSecId(sec.id); setSecCode(sec.id); setSecTitleEn(sec.titleEn); setSecTitleTh(sec.titleTh); setSecDescEn(sec.descEn); setSecDescTh(sec.descTh);
    setSecBUId(sec.businessUnitId);
    setSecDialogOpen(true);
  };

  const saveSection = async () => {
    if (!secTitleEn.trim() && !secTitleTh.trim()) return toast.error("Please enter section title");
    try {
      const secData = { 
        titleEn: secTitleEn, 
        titleTh: secTitleTh, 
        descEn: secDescEn, 
        descTh: secDescTh,
        businessUnitId: secBUId === "none" ? undefined : secBUId 
      };
      if (editingSecId) {
        await updateSection(editingSecId, secData);
      } else {
        const finalCode = secCode.trim() || `SEC-${Date.now()}`;
        await createSection({ code: finalCode, ...secData });
      }
      await fetchBank(); setSecDialogOpen(false);
      toast.success("Structural registry updated");
    } catch (e) { toast.error(`Sync error: ${e instanceof Error ? e.message : e}`); }
  };

  const confirmDeleteSection = async () => {
    if (!deleteSectionId) return;
    try {
      await deleteSection(deleteSectionId);
      await fetchBank(); setDeleteSectionId(null);
      toast.success("Node purged successfully");
    } catch { toast.error("Critical: Cannot purge active node"); }
  };

  const openNewQuestion = (sectionId: string) => {
    setActiveSectionId(sectionId); setEditingQ(null); setForm(emptyForm());
    setQDialogOpen(true);
  };

  const editQuestion = (q: Question) => {
    const sec = sections.find((s) => s.questions.some((x) => x.id === q.id));
    setActiveSectionId(sec?.id ?? ""); setEditingQ(q); setForm(formFromQuestion(q));
    setQDialogOpen(true);
  };

  const duplicateQuestion = async (q: Question) => {
    try {
      const sec = sections.find((s) => s.questions.some((x) => x.id === q.id));
      if (!sec) return;
      await createQuestion({
        sectionCode: sec.id,
        ...q,
        id: undefined,
        textEn: `${q.textEn} (Copy)`,
        textTh: `${q.textTh} (สำเนา)`,
      } as any);
      await fetchBank();
      toast.success("Unit replicated");
    } catch (e) { toast.error(`Replication failed: ${e instanceof Error ? e.message : e}`); }
  };

  const handleMoveToSection = async (q: Question, toId: string) => {
    try {
      await moveQuestionApi(q.id, toId);
      await fetchBank();
      toast.success(`Unit reassigned to ${toId}`);
    } catch { toast.error("Reassignment failed"); }
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQ) return;
    try {
      await deleteQuestion(deleteQ.question.id);
      await fetchBank(); setDeleteQ(null);
      toast.success("Unit purged from registry");
    } catch { toast.error("Purge failure detected"); }
  };

  const saveQuestion = async () => {
    if (!form.textEn.trim() && !form.textTh.trim()) return toast.error("Question content required");
    try {
      const payload = {
        type: form.type, textEn: form.textEn, textTh: form.textTh,
        descEn: form.descEn || undefined, descTh: form.descTh || undefined,
        required: form.required, category: form.category || undefined,
        minValue: form.type === "rating" ? form.minValue : undefined,
        maxValue: form.type === "rating" ? form.maxValue : undefined,
        choices: (form.type === "single_select" || form.type === "multiple_select") ? form.choices.map(c => ({ value: c.value, labelEn: c.labelEn, labelTh: c.labelTh })) : undefined,
        rows: form.type === "matrix" ? form.rows.map(r => ({ textEn: r.textEn, textTh: r.textTh })) : undefined,
        columns: form.type === "matrix" ? form.columns.map(c => ({ value: c.value, labelEn: c.labelEn, labelTh: c.labelTh })) : undefined,
      };
      if (editingQ) await updateQuestion(editingQ.id, payload);
      else await createQuestion({ sectionCode: activeSectionId, ...payload });
      await fetchBank(); setQDialogOpen(false);
      toast.success("Unit synchronized with registry");
    } catch (e) { toast.error(`System sync failed: ${e instanceof Error ? e.message : e}`); }
  };

  const handleDragEnd = async (sectionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    const oldIdx = sec.questions.findIndex(q => q.id === active.id);
    const newIdx = sec.questions.findIndex(q => q.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...sec.questions];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, questions: reordered } : s));
    try { await reorderQuestions(sectionId, reordered.map(q => q.id)); }
    catch { await fetchBank(); toast.error("Reorder failed"); }
  };

  const updateForm = (patch: Partial<QuestionForm>) => setForm(f => ({ ...f, ...patch }));
  const toggleSection = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const q = searchTerm.toLowerCase();
    return sections.map(sec => {
      const matchesSec = sec.titleEn.toLowerCase().includes(q) || sec.titleTh.toLowerCase().includes(q);
      const filteredQs = sec.questions.filter(question => 
        question.textEn.toLowerCase().includes(q) || 
        question.textTh.toLowerCase().includes(q) ||
        question.category?.toLowerCase().includes(q)
      );
      if (matchesSec || filteredQs.length > 0) {
        return { ...sec, questions: matchesSec ? sec.questions : filteredQs };
      }
      return null;
    }).filter(Boolean) as typeof sections;
  }, [sections, searchTerm]);

  const totalQuestions = useMemo(() => sections.reduce((s, sec) => s + sec.questions.length, 0), [sections]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("questions.loading")}</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t("questions.title")}</h1>
          <p className="text-[15px] font-medium text-slate-400">
            {t("questions.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 px-5 rounded-xl border-slate-200 font-bold text-[11px] uppercase gap-2.5 shadow-sm" onClick={() => window.print()}>
            <Download className="w-4.5 h-4.5 text-slate-400" />
            <span className="hidden sm:inline">{t("questions.snapshot")}</span>
          </Button>
          <Button onClick={openNewSection} className="h-11 px-7 rounded-xl bg-slate-900 text-white font-bold text-[12px] uppercase tracking-wider shadow-lg shadow-slate-900/10">
            <Plus className="w-5 h-5 mr-2" /> {t("questions.addSection")}
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: t("questions.kpiQuestions"), val: totalQuestions, icon: Box, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: t("questions.kpiSections"), val: sections.length, icon: FolderTree, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: t("questions.kpiAvgDensity"), val: (totalQuestions / (sections.length || 1)).toFixed(1), icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: t("questions.kpiRegistry"), val: t("questions.kpiVerified"), icon: ShieldCheck, color: "text-primary dark:text-primary", bg: "bg-primary/5 dark:bg-primary/10" },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-5 p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm group hover:shadow-md transition-all">
             <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110", kpi.bg, kpi.color)}>
               <kpi.icon className="w-5.5 h-5.5" />
             </div>
             <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{kpi.val}</div>
             </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-800/30">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                <Search className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white uppercase tracking-widest">{t("questions.bankRegistry")}</h3>
           </div>
           <div className="relative flex-1 sm:w-96 max-w-md">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("questions.searchPlaceholder")}
                className="h-11 pl-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] shadow-none focus:ring-1 focus:ring-primary/10 transition-all font-medium" 
              />
           </div>
        </div>
      </Card>

      {/* ── Logic Sections ── */}
      <div className="space-y-4">
        {filteredSections.map(sec => (
          <Card key={sec.id} className="border-none shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div 
              className={cn(
                "px-5 py-3.5 flex items-center justify-between cursor-pointer transition-all group",
                expanded[sec.id] ? "bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700" : "hover:bg-slate-50/30 dark:hover:bg-slate-800/30"
              )}
              onClick={() => toggleSection(sec.id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shrink-0 shadow-sm transition-all px-3">
                  <FolderTree className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                   <div className="flex items-center gap-3">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{lang === "th" ? sec.titleTh : sec.titleEn}</h3>
                     <Badge variant="outline" className="h-7 px-3 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 uppercase tracking-wider"> {sec.questions.length} {t("surveys.units")}</Badge>
                   </div>
                   <p className="text-[14px] font-medium text-slate-400 truncate opacity-70 mt-0.5">{lang === "th" ? sec.descTh : sec.descEn}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-white shadow-sm" onClick={(e) => { e.stopPropagation(); editSection(sec); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white shadow-sm" onClick={(e) => { e.stopPropagation(); setDeleteSectionId(sec.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300">
                  {expanded[sec.id] ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                </Button>
              </div>
            </div>

            {expanded[sec.id] && (
              <CardContent className="p-3 space-y-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(sec.id, e)}>
                  <SortableContext items={sec.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {sec.questions.map((q, idx) => (
                        <SortableQuestionRow 
                          key={q.id} 
                          question={q} 
                          index={idx} 
                          sectionId={sec.id} 
                          lang={lang} 
                          sections={sections}
                          t={t}
                          sssMappings={sssMappings}
                          onEdit={editQuestion}
                          onDuplicate={duplicateQuestion}
                          onDelete={() => setDeleteQ({ sectionId: sec.id, question: q })}
                          onMoveToSection={(q: Question, toId: string) => handleMoveToSection(q, toId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <Button 
                  onClick={() => openNewQuestion(sec.id)} 
                  variant="outline" 
                  className="w-full h-11 border-dashed border-2 border-slate-200 hover:border-primary/20 hover:bg-primary/[0.02] text-slate-400 hover:text-primary text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all mt-2"
                >
                  <Plus className="w-5 h-5 mr-2.5" /> {t("questions.addQuestion")}
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* ── Question Editor Dialog ── */}
      <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-h-[90vh] flex flex-col">
          <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                      <Box className="w-5 h-5" />
                   </div>
                   <div>
                     <DialogTitle className="text-lg font-bold">
                        {editingQ 
                          ? t("questions.editQuestion") 
                          : t("questions.newQuestion")}
                      </DialogTitle>
                     <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t("questions.node")}{activeSectionId} &bull; Protocol v2.4</span>
                   </div>
                </div>
                <div className="flex items-center gap-2 pr-4">
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                     <Label className="text-[10px] font-bold text-white uppercase tracking-wider">{t("questions.required")}</Label>
                     <Switch checked={form.required} onCheckedChange={(v) => updateForm({ required: v })} className="scale-90" />
                  </div>
                </div>
             </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-6">
               <div className="grid grid-cols-3 gap-6">
                  {/* Type Selection */}
                  <div className="space-y-2">
                     <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.questionType")}</Label>
                     <div className="grid grid-cols-1 gap-1.5">
                        {QUESTION_TYPES.map(t => (
                          <button 
                            key={t.value}
                            type="button"
                            onClick={() => updateForm({ type: t.value })}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg border text-left transition-all",
                              form.type === t.value 
                                ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-200 dark:hover:border-slate-600"
                            )}
                          >
                             <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", form.type === t.value ? "bg-white/20" : t.color)}>
                                <t.icon className="w-3.5 h-3.5" />
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-tight">{lang === "th" ? t.labelTh : t.labelEn}</span>
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Content Configuration */}
                  <div className="col-span-2 space-y-5">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.contentTh")}</Label>
                        <Input value={form.textTh} onChange={(e) => updateForm({ textTh: e.target.value })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.contentEn")}</Label>
                        <Input value={form.textEn} onChange={(e) => updateForm({ textEn: e.target.value })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.category")}</Label>
                           <Input value={form.category} onChange={(e) => updateForm({ category: e.target.value })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" placeholder="e.g. Engagement" />
                        </div>
                     </div>

                     {/* Dynamic Config Area */}
                     <div className="pt-4 border-t border-slate-100">
                        {form.type === "rating" && (
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.minValue")}</Label>
                                <Input type="number" value={form.minValue} onChange={(e) => updateForm({ minValue: Number(e.target.value) })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.maxValue")}</Label>
                                <Input type="number" value={form.maxValue} onChange={(e) => updateForm({ maxValue: Number(e.target.value) })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                             </div>
                          </div>
                        )}

                        {(form.type === "single_select" || form.type === "multiple_select") && (
                          <div className="space-y-2.5">
                             <div className="flex items-center justify-between">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.choices")}</Label>
                                <Button variant="outline" size="sm" type="button" onClick={() => updateForm({ choices: [...form.choices, { key: `c${Date.now()}`, value: String(form.choices.length + 1), labelEn: "Option", labelTh: "ตัวเลือก" }] })} className="h-6 px-2 text-[8px] font-bold uppercase tracking-wider rounded-lg border-slate-200">{t("questions.addChoice")}</Button>
                             </div>
                             <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {form.choices.map((c, i) => (
                                  <div key={c.key} className="flex gap-2 items-center group/choice bg-slate-50/50 p-2 rounded-lg border border-slate-100 w-full min-w-0">
                                     <Input value={c.labelTh} onChange={(e) => { const nc = [...form.choices]; nc[i].labelTh = e.target.value; updateForm({ choices: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold min-w-0 flex-1" placeholder="Thai" />
                                     <Input value={c.labelEn} onChange={(e) => { const nc = [...form.choices]; nc[i].labelEn = e.target.value; updateForm({ choices: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold min-w-0 flex-1" placeholder="English" />
                                     <Button variant="ghost" size="icon" type="button" className="h-7 w-7 text-slate-300 hover:text-rose-600 shrink-0" onClick={() => updateForm({ choices: form.choices.filter((_, idx) => idx !== i) })}><Trash2 className="w-3 h-3" /></Button>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}

                        {form.type === "matrix" && (
                          <div className="space-y-6">
                             {/* Matrix Rows */}
                             <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.matrixRows")}</Label>
                                   <Button variant="outline" size="sm" type="button" onClick={() => updateForm({ rows: [...form.rows, { key: `r${Date.now()}`, textEn: "New Row", textTh: "เกณฑ์ใหม่" }] })} className="h-6 px-2 text-[8px] font-bold uppercase tracking-wider rounded-lg border-slate-200">{t("questions.addRow")}</Button>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                   {form.rows.map((r, i) => (
                                      <div key={r.key} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100 w-full min-w-0">
                                         <Input value={r.textTh} onChange={(e) => { const nr = [...form.rows]; nr[i].textTh = e.target.value; updateForm({ rows: nr }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold min-w-0 flex-1" />
                                         <Input value={r.textEn} onChange={(e) => { const nr = [...form.rows]; nr[i].textEn = e.target.value; updateForm({ rows: nr }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold min-w-0 flex-1" />
                                         <Button variant="ghost" size="icon" type="button" className="h-7 w-7 text-slate-300 hover:text-rose-600" onClick={() => updateForm({ rows: form.rows.filter((_, idx) => idx !== i) })}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                   ))}
                                </div>
                             </div>
                             {/* Matrix Cols */}
                             <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.matrixCols")}</Label>
                                   <Button variant="outline" size="sm" type="button" onClick={() => updateForm({ columns: [...form.columns, { key: `c${Date.now()}`, value: String(form.columns.length + 1), labelEn: "Option", labelTh: "ตัวเลือก" }] })} className="h-6 px-2 text-[8px] font-bold uppercase tracking-wider rounded-lg border-slate-200">{t("questions.addCol")}</Button>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                   {form.columns.map((c, i) => (
                                      <div key={c.key} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100 w-full min-w-0">
                                         <Input value={c.labelTh} onChange={(e) => { const nc = [...form.columns]; nc[i].labelTh = e.target.value; updateForm({ columns: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold min-w-0 flex-1" />
                                         <Input value={c.labelEn} onChange={(e) => { const nc = [...form.columns]; nc[i].labelEn = e.target.value; updateForm({ columns: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold min-w-0 flex-1" />
                                         <Button variant="ghost" size="icon" type="button" className="h-7 w-7 text-slate-300 hover:text-rose-600" onClick={() => updateForm({ columns: form.columns.filter((_, idx) => idx !== i) })}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 px-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
             <Button variant="ghost" size="sm" onClick={() => setQDialogOpen(false)} className="px-5 h-9 rounded-xl font-bold text-[11px] text-slate-400 uppercase">{t("common.cancel")}</Button>
             <Button onClick={saveQuestion} size="sm" className="px-7 h-9 rounded-xl bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <Save className="w-4 h-4 mr-2.5" /> {t("questions.saveQuestion")}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Section Editor Dialog ── */}
      <Dialog open={secDialogOpen} onOpenChange={setSecDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl border-none">
          <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                   <FolderTree className="w-5 h-5" />
                </div>
                 <div>
                    <DialogTitle className="text-lg font-bold">
                      {editingSecId 
                        ? (lang === "th" ? "แก้ไขหมวดหมู่คำถาม" : "Modify Logic Node") 
                        : (lang === "th" ? "เพิ่มหมวดหมู่คำถามใหม่" : "Define Logic Node")}
                    </DialogTitle>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Structural Topology v2.4</span>
                 </div>
             </div>
          </DialogHeader>
          <div className="p-5 space-y-4">
             <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.sectionCodeLabel")}</Label>
                <Input 
                  value={secCode} 
                  onChange={(e) => setSecCode(e.target.value)} 
                  disabled={!!editingSecId} 
                  placeholder={editingSecId ? "" : t("questions.sectionCodePlaceholder")}
                  className="h-9 rounded-lg border-slate-200 font-bold text-xs" 
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.sectionTitleTh")}</Label>
                   <Input value={secTitleTh} onChange={(e) => setSecTitleTh(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.sectionTitleEn")}</Label>
                   <Input value={secTitleEn} onChange={(e) => setSecTitleEn(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                </div>
             </div>
             <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.sectionDescTh")}</Label>
                <Input value={secDescTh} onChange={(e) => setSecDescTh(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.sectionDescEn")}</Label>
                <Input value={secDescEn} onChange={(e) => setSecDescEn(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
             </div>
             <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("questions.targetBusinessUnit")}</Label>
                <Select value={secBUId || "none"} onValueChange={setSecBUId}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 font-bold text-xs bg-slate-50/30">
                    <SelectValue placeholder={t("questions.selectBusinessUnit")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-slate-100 p-1 max-h-[300px] overflow-y-auto">
                    <SelectItem value="none" className="h-10 rounded-lg text-xs font-bold text-slate-400">{t("questions.globalAllUnits")}</SelectItem>
                    {businessUnits.map(bu => (
                      <SelectItem key={bu.id} value={bu.id} className="h-10 rounded-lg text-xs font-bold">
                        {lang === "th" ? bu.name_th : bu.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-medium text-slate-400 px-1 italic">
                  {t("questions.buRestrictionDesc")}
                </p>
             </div>
          </div>
          <DialogFooter className="p-4 px-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
             <Button variant="ghost" size="sm" onClick={() => setSecDialogOpen(false)} className="px-5 h-9 rounded-xl font-bold text-[11px] text-slate-400 uppercase">{t("common.cancel")}</Button>
             <Button onClick={saveSection} size="sm" className="px-7 h-9 rounded-xl bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">{t("questions.saveSection")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Visual Footer ── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-100 opacity-40">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          Atomic Logic Bank &bull; Node 2.4-STABLE
        </div>
      </div>

      {/* ── Purge Confirmations ── */}
      <AlertDialog open={!!deleteSectionId} onOpenChange={(o) => !o && setDeleteSectionId(null)}>
        <AlertDialogContent className="rounded-xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px] bg-white dark:bg-slate-900 border-none shadow-2xl">
           <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight">{t("questions.deleteSectionConfirm")}</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 {t("questions.deleteSectionDescMsg")}
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase border-slate-200">{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSection} className="flex-1 h-8 rounded-lg bg-rose-600 text-white font-bold text-[9px] uppercase">{t("questions.deleteSection")}</AlertDialogAction>
           </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteQ} onOpenChange={(o) => !o && setDeleteQ(null)}>
        <AlertDialogContent className="rounded-xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px] bg-white dark:bg-slate-900 border-none shadow-2xl">
           <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight">{t("questions.deleteQuestionConfirm")}</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 {t("questions.deleteQuestionDescMsg")}
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase border-slate-200">{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteQuestion} className="flex-1 h-8 rounded-lg bg-rose-600 text-white font-bold text-[9px] uppercase">{t("common.confirm")}</AlertDialogAction>
           </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default QuestionsAdmin;
