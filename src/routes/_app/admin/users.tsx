import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { MOCK_USERS, type MockUser, type Role } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users as UsersIcon, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENTS, LEVELS, LOCATIONS, BUSINESS_UNITS } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MockUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = users.filter((u) =>
    u.nameEn.toLowerCase().includes(search.toLowerCase()) ||
    u.nameTh.includes(search) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editing) return;
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === editing.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = editing;
        return next;
      }
      return [...prev, { ...editing, id: `u${Date.now()}` }];
    });
    setDialogOpen(false);
    toast.success(lang === "th" ? "บันทึกผู้ใช้แล้ว" : "User saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("nav.users")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "th" ? "จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง" : "Manage user accounts and roles"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({
              id: "", email: "", password: "", nameTh: "", nameEn: "",
              role: "employee", department: "", businessUnit: "", level: "", location: "",
            })}><Plus className="w-4 h-4 mr-1.5" />{t("common.create")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing?.id ? (lang === "th" ? "แก้ไขผู้ใช้" : "Edit User") : (lang === "th" ? "สร้างผู้ใช้ใหม่" : "Create User")}</DialogTitle>
              <DialogDescription>{lang === "th" ? "กรอกข้อมูลผู้ใช้ด้านล่าง" : "Fill in the user details below"}</DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{lang === "th" ? "ชื่อ (TH)" : "Name (TH)"}</Label>
                  <Input value={editing.nameTh} onChange={(e) => setEditing({ ...editing, nameTh: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "th" ? "ชื่อ (EN)" : "Name (EN)"}</Label>
                  <Input value={editing.nameEn} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{lang === "th" ? "บทบาท" : "Role"}</Label>
                  <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v as Role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr_admin">HR Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.department")}</Label>
                  <Select value={editing.department} onValueChange={(v) => setEditing({ ...editing, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.level")}</Label>
                  <Select value={editing.level} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.businessUnit")}</Label>
                  <Select value={editing.businessUnit} onValueChange={(v) => setEditing({ ...editing, businessUnit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_UNITS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.location")}</Label>
                  <Select value={editing.location} onValueChange={(v) => setEditing({ ...editing, location: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-primary" />
              {lang === "th" ? "ผู้ใช้งานทั้งหมด" : "All users"}
            </CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "th" ? "ชื่อ" : "Name"}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>{lang === "th" ? "บทบาท" : "Role"}</TableHead>
                <TableHead>{t("common.department")}</TableHead>
                <TableHead>{t("common.level")}</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-xs font-semibold text-primary">
                        {u.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{lang === "th" ? u.nameTh : u.nameEn}</div>
                        <div className="text-xs text-muted-foreground">{lang === "th" ? u.nameEn : u.nameTh}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className="capitalize">
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.department}</TableCell>
                  <TableCell className="text-sm">{u.level}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
