import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { 
  getQuestionBank, createSection, updateSection, deleteSection, 
  createQuestion, updateQuestion, deleteQuestion, 
  reorderQuestions, moveQuestion as moveQuestionApi 
} from "@/services/api";
import type { SurveySection, Question, QuestionType } from "@/services/api";
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
  ShieldCheck, Layers, Terminal, Database, Download, MoveRight, FileQuestion
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
    minValue: 1, maxValue: 5,
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
    minValue: q.minValue ?? 1, maxValue: q.maxValue ?? 5,
    choices: (q.choices ?? []).map((c, i) => ({ key: `c${i}${Date.now()}`, ...c })),
    rows: (q.rows ?? []).map((r, i) => ({ key: `r${i}${Date.now()}`, textEn: r, textTh: q.rowsTh?.[i] ?? r })),
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
  question, index, sectionId, onEdit, onDuplicate, onDelete, onMoveToSection, lang, sections,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/row flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
        isDragging 
          ? "border-primary bg-primary/[0.02] shadow-xl ring-2 ring-primary/5 scale-[1.01]" 
          : "border-slate-100 bg-white hover:border-primary/20 hover:shadow-md"
      )}
    >
      <div {...attributes} {...listeners}><DragHandle /></div>
      
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 group-hover/row:text-primary group-hover/row:border-primary/10 transition-all shrink-0">
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-900 truncate">
            {lang === "th" ? question.textTh : question.textEn}
          </span>
          {question.required && (
            <Badge className="bg-rose-50 text-rose-500 border-rose-100 h-4 px-2 font-bold text-[9px] uppercase tracking-widest shadow-none">REQUIRED</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
           <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider", cfg.color)}>
              <cfg.icon className="w-3.5 h-3.5" />
              {lang === "th" ? cfg.labelTh : cfg.labelEn}
           </div>
           {question.category && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-wider border border-slate-100">
                <Box className="w-3 h-3" />
                {question.category}
             </div>
           )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
        {otherSections.length > 0 && (
          <Select value="" onValueChange={(v) => v && onMoveToSection(question, v)}>
            <SelectTrigger className="h-8 w-8 p-0 border border-slate-200 hover:border-primary/20 hover:bg-slate-50 shadow-none justify-center rounded-lg transition-all">
              <MoveRight className="w-3.5 h-3.5 text-slate-400" />
            </SelectTrigger>
            <SelectContent align="end" className="rounded-xl shadow-xl p-1">
              {otherSections.map((s: any) => (
                <SelectItem key={s.id} value={s.id} className="h-8 rounded-md text-[10px] font-bold uppercase cursor-pointer">
                  {lang === "th" ? s.titleTh : s.titleEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all" onClick={() => onDuplicate(question)}><Copy className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all" onClick={() => onEdit(question)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-all" onClick={() => onDelete(question)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

function QuestionsAdmin() {
  const { lang } = useI18n();
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyForm());

  const [secDialogOpen, setSecDialogOpen] = useState(false);
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [secTitleEn, setSecTitleEn] = useState("");
  const [secTitleTh, setSecTitleTh] = useState("");
  const [secDescEn, setSecDescEn] = useState("");
  const [secDescTh, setSecDescTh] = useState("");

  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteQ, setDeleteQ] = useState<{ sectionId: string; question: Question } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchBank = useCallback(async () => {
    try {
      const data = await getQuestionBank();
      setSections(data);
      if (Object.keys(expanded).length === 0) {
        setExpanded(Object.fromEntries(data.map(s => [s.id, true])));
      }
    } finally { setIsLoading(false); }
  }, [expanded]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  const openNewSection = () => {
    setEditingSecId(null); setSecTitleEn(""); setSecTitleTh(""); setSecDescEn(""); setSecDescTh("");
    setSecDialogOpen(true);
  };

  const editSection = (sec: SurveySection) => {
    setEditingSecId(sec.id); setSecTitleEn(sec.titleEn); setSecTitleTh(sec.titleTh); setSecDescEn(sec.descEn); setSecDescTh(sec.descTh);
    setSecDialogOpen(true);
  };

  const saveSection = async () => {
    if (!secTitleEn.trim() && !secTitleTh.trim()) return toast.error("Please enter section title");
    try {
      if (editingSecId) {
        await updateSection(editingSecId, { titleEn: secTitleEn, titleTh: secTitleTh, descEn: secDescEn, descTh: secDescTh });
      } else {
        await createSection({ code: `SEC-${Date.now()}`, titleEn: secTitleEn, titleTh: secTitleTh, descEn: secDescEn, descTh: secDescTh });
      }
      await fetchBank(); setSecDialogOpen(false);
      toast.success("Structural registry updated");
    } catch { toast.error("Sync error occurred"); }
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
    } catch { toast.error("Replication failed"); }
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
    } catch { toast.error("System sync failed"); }
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
  const totalQuestions = useMemo(() => sections.reduce((s, sec) => s + sec.questions.length, 0), [sections]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Syncing Logic Bank...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Questions</h1>
          <p className="text-xs font-medium text-slate-400">
            {lang === "th" ? "จัดการคลังข้อคำถามแยกตามหมวดหมู่" : "Orchestrate logic nodes and survey units."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 px-3 rounded-lg border-slate-200 font-bold text-[10px] uppercase gap-2" onClick={() => window.print()}>
            <Download className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Snapshot</span>
          </Button>
          <Button onClick={openNewSection} className="h-8 px-4 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Define Node
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Atomic Units", val: totalQuestions, icon: Box, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Logical Nodes", val: sections.length, icon: FolderTree, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Density", val: (totalQuestions / (sections.length || 1)).toFixed(1), icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Registry SOC3", val: "Verified", icon: ShieldCheck, color: "text-primary", bg: "bg-primary/5" },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:shadow-md transition-all">
             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110", kpi.bg, kpi.color)}>
               <kpi.icon className="w-5 h-5" />
             </div>
             <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                <div className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{kpi.val}</div>
             </div>
          </div>
        ))}
      </div>

      {/* ── Logic Sections ── */}
      <div className="space-y-4">
        {sections.map(sec => (
          <Card key={sec.id} className="border-none shadow-sm rounded-xl overflow-hidden bg-white border border-slate-100">
            <div 
              className={cn(
                "px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all group",
                expanded[sec.id] ? "bg-slate-50/50 border-b border-slate-100" : "hover:bg-slate-50/30"
              )}
              onClick={() => toggleSection(sec.id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-sm group-hover:border-primary/20 transition-all">
                  {sec.id}
                </div>
                <div className="min-w-0">
                   <div className="flex items-center gap-2.5">
                     <h3 className="text-base font-bold text-slate-900 truncate">{lang === "th" ? sec.titleTh : sec.titleEn}</h3>
                     <Badge variant="outline" className="h-5 px-2 rounded-xl text-[9px] font-bold bg-white text-slate-400 border-slate-200">{sec.questions.length} UNITS</Badge>
                   </div>
                   <p className="text-[11px] font-medium text-slate-400 truncate opacity-70">{lang === "th" ? sec.descTh : sec.descEn}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-white shadow-sm" onClick={(e) => { e.stopPropagation(); editSection(sec); }}><Pencil className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white shadow-sm" onClick={(e) => { e.stopPropagation(); setDeleteSectionId(sec.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-300">
                  {expanded[sec.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                  className="w-full h-8 border-dashed border-2 border-slate-200 hover:border-primary/20 hover:bg-primary/[0.02] text-slate-400 hover:text-primary text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add Logic Unit
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* ── Question Editor Dialog ── */}
      <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-xl p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col">
          <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                      <Box className="w-4 h-4" />
                   </div>
                   <div>
                     <DialogTitle className="text-base font-bold">{editingQ ? "Edit Logic Unit" : "New Logic Unit"}</DialogTitle>
                     <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Node: {activeSectionId} &bull; Protocol v2.4</span>
                   </div>
                </div>
                <div className="flex items-center gap-2 pr-4">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                     <Label className="text-[9px] font-bold text-white uppercase">Required</Label>
                     <Switch checked={form.required} onCheckedChange={(v) => updateForm({ required: v })} className="scale-75" />
                  </div>
                </div>
             </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-6">
               <div className="grid grid-cols-3 gap-6">
                  {/* Type Selection */}
                  <div className="space-y-2">
                     <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Logic Pattern</Label>
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
                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
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
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Content (Thai)</Label>
                        <Input value={form.textTh} onChange={(e) => updateForm({ textTh: e.target.value })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Content (English)</Label>
                        <Input value={form.textEn} onChange={(e) => updateForm({ textEn: e.target.value })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Internal Category</Label>
                           <Input value={form.category} onChange={(e) => updateForm({ category: e.target.value })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" placeholder="e.g. Engagement" />
                        </div>
                     </div>

                     {/* Dynamic Config Area */}
                     <div className="pt-4 border-t border-slate-100">
                        {form.type === "rating" && (
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Min Value</Label>
                                <Input type="number" value={form.minValue} onChange={(e) => updateForm({ minValue: Number(e.target.value) })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Max Value</Label>
                                <Input type="number" value={form.maxValue} onChange={(e) => updateForm({ maxValue: Number(e.target.value) })} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                             </div>
                          </div>
                        )}

                        {(form.type === "single_select" || form.type === "multiple_select") && (
                          <div className="space-y-2.5">
                             <div className="flex items-center justify-between">
                                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Response Choices</Label>
                                <Button variant="outline" size="sm" type="button" onClick={() => updateForm({ choices: [...form.choices, { key: `c${Date.now()}`, value: String(form.choices.length + 1), labelEn: "Option", labelTh: "ตัวเลือก" }] })} className="h-6 px-2 text-[8px] font-bold uppercase tracking-wider rounded-lg border-slate-200">Add Choice</Button>
                             </div>
                             <div className="space-y-1.5">
                                {form.choices.map((c, i) => (
                                  <div key={c.key} className="flex gap-2 items-center group/choice bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                     <Input value={c.labelTh} onChange={(e) => { const nc = [...form.choices]; nc[i].labelTh = e.target.value; updateForm({ choices: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold" placeholder="Thai" />
                                     <Input value={c.labelEn} onChange={(e) => { const nc = [...form.choices]; nc[i].labelEn = e.target.value; updateForm({ choices: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold" placeholder="English" />
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
                                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Grid Rows (Criteria)</Label>
                                   <Button variant="outline" size="sm" type="button" onClick={() => updateForm({ rows: [...form.rows, { key: `r${Date.now()}`, textEn: "New Row", textTh: "เกณฑ์ใหม่" }] })} className="h-6 px-2 text-[8px] font-bold uppercase tracking-wider rounded-lg border-slate-200">Add Row</Button>
                                </div>
                                <div className="space-y-1.5">
                                   {form.rows.map((r, i) => (
                                      <div key={r.key} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                         <Input value={r.textTh} onChange={(e) => { const nr = [...form.rows]; nr[i].textTh = e.target.value; updateForm({ rows: nr }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold" />
                                         <Input value={r.textEn} onChange={(e) => { const nr = [...form.rows]; nr[i].textEn = e.target.value; updateForm({ rows: nr }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold" />
                                         <Button variant="ghost" size="icon" type="button" className="h-7 w-7 text-slate-300 hover:text-rose-600" onClick={() => updateForm({ rows: form.rows.filter((_, idx) => idx !== i) })}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                   ))}
                                </div>
                             </div>
                             {/* Matrix Cols */}
                             <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Grid Columns (Scale)</Label>
                                   <Button variant="outline" size="sm" type="button" onClick={() => updateForm({ columns: [...form.columns, { key: `c${Date.now()}`, value: String(form.columns.length + 1), labelEn: "Option", labelTh: "ตัวเลือก" }] })} className="h-6 px-2 text-[8px] font-bold uppercase tracking-wider rounded-lg border-slate-200">Add Col</Button>
                                </div>
                                <div className="space-y-1.5">
                                   {form.columns.map((c, i) => (
                                      <div key={c.key} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                         <Input value={c.labelTh} onChange={(e) => { const nc = [...form.columns]; nc[i].labelTh = e.target.value; updateForm({ columns: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold" />
                                         <Input value={c.labelEn} onChange={(e) => { const nc = [...form.columns]; nc[i].labelEn = e.target.value; updateForm({ columns: nc }); }} className="h-8 rounded-md bg-white border-slate-200 text-[10px] font-bold" />
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

          <DialogFooter className="p-3 px-5 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
             <Button variant="ghost" size="sm" onClick={() => setQDialogOpen(false)} className="px-4 h-8 rounded-lg font-bold text-[10px] text-slate-400 uppercase">Cancel</Button>
             <Button onClick={saveQuestion} size="sm" className="px-6 h-8 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <Save className="w-3 h-3 mr-2" /> Sync Logic Unit
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Section Editor Dialog ── */}
      <Dialog open={secDialogOpen} onOpenChange={setSecDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden bg-white shadow-2xl">
          <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                   <FolderTree className="w-4 h-4" />
                </div>
                <div>
                   <DialogTitle className="text-base font-bold">{editingSecId ? "Modify Logic Node" : "Define Logic Node"}</DialogTitle>
                   <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Structural Topology v2.4</span>
                </div>
             </div>
          </DialogHeader>
          <div className="p-5 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title (Thai)</Label>
                   <Input value={secTitleTh} onChange={(e) => setSecTitleTh(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title (English)</Label>
                   <Input value={secTitleEn} onChange={(e) => setSecTitleEn(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                </div>
             </div>
             <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description (Thai)</Label>
                <Input value={secDescTh} onChange={(e) => setSecDescTh(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description (English)</Label>
                <Input value={secDescEn} onChange={(e) => setSecDescEn(e.target.value)} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
             </div>
          </div>
          <DialogFooter className="p-3 px-5 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
             <Button variant="ghost" size="sm" onClick={() => setSecDialogOpen(false)} className="px-4 h-8 rounded-lg font-bold text-[10px] text-slate-400 uppercase">Cancel</Button>
             <Button onClick={saveSection} size="sm" className="px-6 h-8 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">Save Node</Button>
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
        <AlertDialogContent className="rounded-xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px]">
           <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight">Purge Node?</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 All linked units will be de-indexed.
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase border-slate-200">Abort</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSection} className="flex-1 h-8 rounded-lg bg-rose-600 text-white font-bold text-[9px] uppercase">Confirm Purge</AlertDialogAction>
           </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteQ} onOpenChange={(o) => !o && setDeleteQ(null)}>
        <AlertDialogContent className="rounded-xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px]">
           <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight">Purge Unit?</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 Irreversible de-indexing protocol.
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase border-slate-200">Abort</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteQuestion} className="flex-1 h-8 rounded-lg bg-rose-600 text-white font-bold text-[9px] uppercase">Confirm</AlertDialogAction>
           </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default QuestionsAdmin;
