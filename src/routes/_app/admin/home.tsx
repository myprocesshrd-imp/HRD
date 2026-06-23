import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getBulletinPosts, saveBulletinPosts } from "@/lib/mock-data";
import type { BulletinPost, BulletinCategory, BulletinLink } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Home, Plus, Pin, PinOff, Pencil, Trash2, Megaphone, Shield,
  Cpu, Sparkles, BookOpen, User, Clock, Image as ImageIcon, Eye,
  Link as LinkIcon, X, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/admin/home")({
  component: HomeAdmin,
});

// ── Category Config ──
const CATEGORY_CONFIG: Record<BulletinCategory, { labelTh: string; labelEn: string; color: string; bg: string; border: string; icon: typeof Megaphone }> = {
  general:  { labelTh: "ทั่วไป",          labelEn: "General",  color: "text-slate-600",  bg: "bg-slate-100",   border: "border-slate-200",   icon: Megaphone },
  hr:       { labelTh: "ทรัพยากรบุคคล",  labelEn: "HR",       color: "text-indigo-600", bg: "bg-indigo-50",   border: "border-indigo-200",  icon: User },
  it:       { labelTh: "IT",              labelEn: "IT",       color: "text-cyan-600",   bg: "bg-cyan-50",     border: "border-cyan-200",    icon: Cpu },
  event:    { labelTh: "กิจกรรม",         labelEn: "Event",    color: "text-violet-600", bg: "bg-violet-50",   border: "border-violet-200",  icon: Sparkles },
  policy:   { labelTh: "นโยบาย",          labelEn: "Policy",   color: "text-amber-600",  bg: "bg-amber-50",    border: "border-amber-200",   icon: BookOpen },
  safety:   { labelTh: "ความปลอดภัย",    labelEn: "Safety",   color: "text-rose-600",   bg: "bg-rose-50",     border: "border-rose-200",    icon: Shield },
};

const CATEGORY_KEYS: BulletinCategory[] = ["general", "hr", "it", "event", "policy", "safety"];

function formatDate(iso: string, lang: "th" | "en"): string {
  try {
    const d = new Date(iso);
    if (lang === "th") return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

// ── Empty post factory ──
function emptyPost(postedBy: string): Omit<BulletinPost, "id"> {
  return {
    titleTh: "",
    titleEn: "",
    contentTh: "",
    contentEn: "",
    category: "general",
    imageUrl: "",
    isPinned: false,
    postedBy,
    postedAt: new Date().toISOString(),
    links: [],
  };
}

// ── Edit Dialog ──
interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  post: Omit<BulletinPost, "id"> & { id?: string };
  onSave: (data: Omit<BulletinPost, "id"> & { id?: string }) => void;
  lang: "th" | "en";
}

function EditDialog({ open, onClose, post: initial, onSave, lang }: EditDialogProps) {
  const [form, setForm] = useState(initial);
  useEffect(() => { setForm(initial); }, [initial]);

  const isValid = form.titleTh.trim() && form.titleEn.trim() && form.contentTh.trim() && form.contentEn.trim();

  const set = (key: keyof typeof form) => (val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            {initial.id ? (lang === "th" ? "แก้ไขประกาศ" : "Edit Announcement") : (lang === "th" ? "เพิ่มประกาศใหม่" : "New Announcement")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">หัวข้อ (ภาษาไทย) *</Label>
              <Input
                value={form.titleTh}
                onChange={(e) => set("titleTh")(e.target.value)}
                placeholder="หัวข้อภาษาไทย"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Title (English) *</Label>
              <Input
                value={form.titleEn}
                onChange={(e) => set("titleEn")(e.target.value)}
                placeholder="English title"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Contents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">เนื้อหา (ภาษาไทย) *</Label>
              <Textarea
                value={form.contentTh}
                onChange={(e) => set("contentTh")(e.target.value)}
                placeholder="เนื้อหาภาษาไทย..."
                rows={5}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Content (English) *</Label>
              <Textarea
                value={form.contentEn}
                onChange={(e) => set("contentEn")(e.target.value)}
                placeholder="English content..."
                rows={5}
                className="rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Category + Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {lang === "th" ? "หมวดหมู่" : "Category"}
              </Label>
              <Select value={form.category} onValueChange={(v) => set("category")(v as BulletinCategory)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KEYS.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const CatIcon = cfg.icon;
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <CatIcon className={cn("w-3.5 h-3.5", cfg.color)} />
                          <span>{lang === "th" ? cfg.labelTh : cfg.labelEn}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {lang === "th" ? "รูปภาพ (URL)" : "Image (URL)"}
                </span>
              </Label>
              <Input
                value={form.imageUrl ?? ""}
                onChange={(e) => set("imageUrl")(e.target.value)}
                placeholder="https://..."
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === "th" ? "ปักหมุดประกาศ" : "Pin this post"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === "th" ? "ประกาศที่ปักหมุดจะแสดงที่ด้านบนของหน้าหลัก" : "Pinned posts appear at the top of the home page"}
              </p>
            </div>
            <Switch
              checked={form.isPinned}
              onCheckedChange={(v) => set("isPinned")(v)}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>

          {/* ── Links Section ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                {lang === "th" ? "ลิงก์แนบ (สำหรับพนักงานคลิกเปิด)" : "Attached Links (employees can click to open)"}
              </Label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, links: [...(prev.links ?? []), { labelTh: "", labelEn: "", url: "" }] }))}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {lang === "th" ? "เพิ่มลิงก์" : "Add link"}
              </button>
            </div>

            {(form.links ?? []).length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-400">
                <ExternalLink className="w-4 h-4 opacity-50" />
                {lang === "th" ? "ยังไม่มีลิงก์ กด \"เพิ่มลิงก์\" เพื่อเพิ่ม" : "No links yet. Click \"Add link\" to attach one."}
              </div>
            ) : (
              <div className="space-y-2">
                {(form.links ?? []).map((link, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {lang === "th" ? `ลิงก์ที่ ${idx + 1}` : `Link ${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, links: (prev.links ?? []).filter((_, i) => i !== idx) }))}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500">ชื่อลิงก์ (ไทย)</Label>
                        <Input
                          value={link.labelTh}
                          onChange={(e) => setForm((prev) => {
                            const links = [...(prev.links ?? [])];
                            links[idx] = { ...links[idx], labelTh: e.target.value };
                            return { ...prev, links };
                          })}
                          placeholder="เช่น ดาวน์โหลดเอกสาร"
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-500">Link Label (EN)</Label>
                        <Input
                          value={link.labelEn}
                          onChange={(e) => setForm((prev) => {
                            const links = [...(prev.links ?? [])];
                            links[idx] = { ...links[idx], labelEn: e.target.value };
                            return { ...prev, links };
                          })}
                          placeholder="e.g. Download document"
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">URL</Label>
                      <Input
                        value={link.url}
                        onChange={(e) => setForm((prev) => {
                          const links = [...(prev.links ?? [])];
                          links[idx] = { ...links[idx], url: e.target.value };
                          return { ...prev, links };
                        })}
                        placeholder="https://..."
                        className="h-8 text-xs rounded-lg font-mono"
                      />
                    </div>
                    {/* Preview */}
                    {link.url && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {lang === "th" ? (link.labelTh || link.labelEn || "ดูลิงก์") : (link.labelEn || link.labelTh || "View link")}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            {lang === "th" ? "ยกเลิก" : "Cancel"}
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!isValid}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md"
          >
            {lang === "th" ? "บันทึกประกาศ" : "Save Announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Post Row ──
interface PostRowProps {
  post: BulletinPost;
  lang: "th" | "en";
  onEdit: (post: BulletinPost) => void;
  onDelete: (post: BulletinPost) => void;
  onTogglePin: (post: BulletinPost) => void;
}

function PostRow({ post, lang, onEdit, onDelete, onTogglePin }: PostRowProps) {
  const cfg = CATEGORY_CONFIG[post.category];
  const CatIcon = cfg.icon;
  const title = lang === "th" ? post.titleTh : post.titleEn;

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-xl border transition-all group",
      post.isPinned
        ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20"
        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
    )}>
      {/* Category icon */}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.bg, cfg.border, cfg.color)}>
        <CatIcon className="w-5 h-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">{title}</h4>
          <div className="flex items-center gap-2 shrink-0">
            {post.isPinned && (
              <Badge className="bg-indigo-600 text-white text-[9px] font-bold uppercase px-2 h-5 rounded-full border-none">
                Pinned
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[9px] font-bold uppercase px-2 h-5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
              {lang === "th" ? cfg.labelTh : cfg.labelEn}
            </Badge>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.postedBy}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(post.postedAt, lang)}</span>
          {post.imageUrl && <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" />Image</span>}
          {(post.links ?? []).length > 0 && (
            <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400">
              <LinkIcon className="w-3 h-3" />
              {(post.links ?? []).length} {lang === "th" ? "ลิงก์" : "link(s)"}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onTogglePin(post)}
          title={post.isPinned ? (lang === "th" ? "เลิกปักหมุด" : "Unpin") : (lang === "th" ? "ปักหมุด" : "Pin")}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            post.isPinned
              ? "text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
              : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          )}
        >
          {post.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onEdit(post)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
          title={lang === "th" ? "แก้ไข" : "Edit"}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(post)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          title={lang === "th" ? "ลบ" : "Delete"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Admin Component ──
function HomeAdmin() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<(Omit<BulletinPost, "id"> & { id?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BulletinPost | null>(null);

  const displayName = user ? (lang === "th" ? user.nameTh : user.nameEn) : "Admin";

  useEffect(() => {
    setPosts(getBulletinPosts());
  }, []);

  const persistAndSet = useCallback((updated: BulletinPost[]) => {
    setPosts(updated);
    saveBulletinPosts(updated);
  }, []);

  const handleAddNew = () => {
    setEditingPost(emptyPost(displayName));
    setDialogOpen(true);
  };

  const handleEdit = (post: BulletinPost) => {
    setEditingPost({ ...post });
    setDialogOpen(true);
  };

  const handleSave = (data: Omit<BulletinPost, "id"> & { id?: string }) => {
    if (data.id) {
      // Update
      const updated = posts.map((p) => p.id === data.id ? { ...data, id: data.id! } as BulletinPost : p);
      persistAndSet(updated);
      toast.success(lang === "th" ? "แก้ไขประกาศแล้ว" : "Announcement updated");
    } else {
      // Create
      const newPost: BulletinPost = {
        ...data,
        id: `b${Date.now()}`,
        postedAt: new Date().toISOString(),
      };
      persistAndSet([newPost, ...posts]);
      toast.success(lang === "th" ? "เพิ่มประกาศแล้ว" : "Announcement created");
    }
    setDialogOpen(false);
    setEditingPost(null);
  };

  const handleDelete = (post: BulletinPost) => {
    setDeleteTarget(post);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    persistAndSet(posts.filter((p) => p.id !== deleteTarget.id));
    toast.success(lang === "th" ? "ลบประกาศแล้ว" : "Announcement deleted");
    setDeleteTarget(null);
  };

  const handleTogglePin = (post: BulletinPost) => {
    const updated = posts.map((p) => p.id === post.id ? { ...p, isPinned: !p.isPinned } : p);
    persistAndSet(updated);
    toast.info(post.isPinned
      ? (lang === "th" ? "เลิกปักหมุดแล้ว" : "Unpinned")
      : (lang === "th" ? "ปักหมุดแล้ว" : "Pinned")
    );
  };

  const pinnedCount = posts.filter((p) => p.isPinned).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-[0.2em]">
            <Home className="w-4 h-4" />
            <span>Admin</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("home.adminTitle")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("home.adminSubtitle")}</p>
        </div>
        <Button
          onClick={handleAddNew}
          id="add-announcement-btn"
          className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200/40 font-bold text-[12px] uppercase tracking-wider flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("home.addPost")}
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: lang === "th" ? "ประกาศทั้งหมด" : "Total Posts",   value: posts.length,           color: "text-slate-900 dark:text-white",   bg: "bg-slate-50 dark:bg-slate-800",   icon: Megaphone },
          { label: lang === "th" ? "ปักหมุด" : "Pinned",              value: pinnedCount,            color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", icon: Pin },
          { label: lang === "th" ? "กิจกรรม" : "Events",             value: posts.filter(p=>p.category==="event").length,   color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", icon: Sparkles },
          { label: lang === "th" ? "นโยบาย" : "Policies",            value: posts.filter(p=>p.category==="policy").length,  color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30",   icon: BookOpen },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn("border-slate-200 dark:border-slate-800 rounded-2xl", kpi.bg)}>
              <CardContent className="p-5 flex items-center gap-3">
                <Icon className={cn("w-5 h-5 shrink-0", kpi.color)} />
                <div>
                  <div className={cn("text-2xl font-black tabular-nums leading-none", kpi.color)}>{kpi.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">{kpi.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Posts List ── */}
      <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === "th" ? "รายการประกาศทั้งหมด" : "All Announcements"}
            </span>
            <Badge variant="secondary" className="text-[10px] font-bold h-5 px-2 rounded-full">{posts.length}</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            <span>{lang === "th" ? "วางเมาส์เพื่อดูตัวเลือก" : "Hover to see actions"}</span>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          {/* Pinned section */}
          {posts.filter(p => p.isPinned).length > 0 && (
            <>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                <Pin className="w-3 h-3" />
                <span>{lang === "th" ? "ปักหมุด" : "Pinned"}</span>
              </div>
              {posts.filter(p => p.isPinned).map(post => (
                <PostRow key={post.id} post={post} lang={lang} onEdit={handleEdit} onDelete={handleDelete} onTogglePin={handleTogglePin} />
              ))}
              {posts.filter(p => !p.isPinned).length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Megaphone className="w-3 h-3" />
                  <span>{lang === "th" ? "ประกาศอื่นๆ" : "Other Posts"}</span>
                </div>
              )}
            </>
          )}

          {/* Non-pinned */}
          {posts
            .filter(p => !p.isPinned)
            .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
            .map(post => (
              <PostRow key={post.id} post={post} lang={lang} onEdit={handleEdit} onDelete={handleDelete} onTogglePin={handleTogglePin} />
            ))
          }

          {posts.length === 0 && (
            <div className="py-16 text-center space-y-3 opacity-60">
              <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto border border-dashed border-slate-300 dark:border-slate-700">
                <Megaphone className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                {lang === "th" ? "ยังไม่มีประกาศ กดปุ่มด้านบนเพื่อเพิ่ม" : "No announcements yet. Click the button above to add one."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      {editingPost !== null && (
        <EditDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingPost(null); }}
          post={editingPost}
          onSave={handleSave}
          lang={lang}
        />
      )}

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteDesc")}
              {deleteTarget && (
                <span className="block mt-2 font-semibold text-slate-900 dark:text-white">
                  "{lang === "th" ? deleteTarget.titleTh : deleteTarget.titleEn}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{lang === "th" ? "ยกเลิก" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">
              {lang === "th" ? "ยืนยันการลบ" : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default HomeAdmin;
