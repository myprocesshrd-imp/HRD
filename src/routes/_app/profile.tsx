import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  User, Mail, Building2, Bell, Shield, 
  Save, LogOut, ShieldAlert, Sparkles,
  Camera, Zap, Globe, UserCircle2, Info,
  BadgeInfo, History, Database, Terminal
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang } = useI18n();
  const { user, logout } = useAuth();
  
  const [nameTh, setNameTh] = useState(user?.nameTh || "—");
  const [nameEn, setNameEn] = useState(user?.nameEn || "—");
  const [notifs, setNotifs] = useState([
    { id: "surveys", labelEn: "New Survey Broadcasts", labelTh: "แบบสำรวจใหม่", enabled: true, icon: Zap },
    { id: "results", labelEn: "Analytics Ready Signals", labelTh: "ผลลัพธ์การวิเคราะห์", enabled: true, icon: Sparkles },
    { id: "system", labelEn: "Core System Protocols", labelTh: "ข่าวสารระบบ", enabled: false, icon: Shield },
  ]);

  const handleSave = () => {
    toast.success("Profile Protocol Updated", {
      description: "Personnel attributes have been synchronized with the intelligence grid.",
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Identity Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your professional identity and session settings.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200" onClick={logout}>
              <LogOut className="w-4 h-4 text-rose-500" /> Decommission Session
           </Button>
           <Button size="sm" className="h-9 px-4 rounded-lg bg-slate-900 text-white font-bold text-xs uppercase tracking-wider gap-2 shadow-sm" onClick={handleSave}>
              <Save className="w-4 h-4" /> Synchronize Profile
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-4">
           <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden group">
              <div className="h-24 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative">
                 <div className="absolute -bottom-10 inset-x-0 flex justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-slate-200" />
                        )}
                      </div>
                      <button className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-primary transition-all">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                 </div>
              </div>
              <CardContent className="pt-12 pb-6 px-6 text-center space-y-4">
                 <div className="space-y-0.5">
                   <h2 className="text-lg font-bold text-slate-900 tracking-tight">{lang === "th" ? user.nameTh : user.nameEn}</h2>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{user.role.replace("_", " ")}</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                    <div className="text-left">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Employee ID</span>
                       <span className="text-sm font-bold text-slate-700">{user?.employeeCode.toUpperCase()}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Status</span>
                       <span className="text-sm font-bold text-emerald-600 uppercase">Active Node</span>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-slate-100 shadow-sm rounded-xl bg-slate-900 text-white overflow-hidden relative group">
              <CardContent className="p-5 space-y-4 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                       <ShieldAlert className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight">Security Protocol</h3>
                 </div>
                 <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                   Advanced encryption active. Multi-layer structural data protection initialized.
                 </p>
                 <Button variant="ghost" className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-slate-900 transition-all">
                    Reset Access Credentials
                 </Button>
              </CardContent>
           </Card>
        </div>

        {/* Form Main Area */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="px-5 py-4 border-b bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">Identity Attributes</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Personnel Metadata Mapping</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <UserCircle2 className="w-3 h-3" /> Full Name (Local)
                  </Label>
                  <Input 
                    value={nameTh} 
                    onChange={(e) => setNameTh(e.target.value)} 
                    className="h-10 rounded-lg border-slate-200 bg-white font-semibold text-sm focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <Globe className="w-3 h-3" /> Full Name (Global)
                  </Label>
                  <Input 
                    value={nameEn} 
                    onChange={(e) => setNameEn(e.target.value)} 
                    className="h-10 rounded-lg border-slate-200 bg-white font-semibold text-sm focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <Mail className="w-3 h-3" /> Communication Node
                  </Label>
                  <Input 
                    value={user.email} 
                    disabled 
                    className="h-10 rounded-lg border-slate-200 bg-slate-50 text-slate-500 font-semibold text-sm cursor-not-allowed italic"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <Building2 className="w-3 h-3" /> Structural Topology
                  </Label>
                  <Input 
                    value={user.department} 
                    disabled 
                    className="h-10 rounded-lg border-slate-200 bg-slate-50 text-slate-500 font-semibold text-sm cursor-not-allowed italic"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-lg bg-white border border-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm">
                  <BadgeInfo className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">Synchronized Personnel Mapping</h4>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic opacity-80">
                    {lang === "th" 
                      ? "รายละเอียดของคุณถูกดึงจากระบบส่วนกลางอัตโนมัติ หากไม่ถูกต้อง โปรดติดต่อ HR" 
                      : "Personnel attributes are orchestrated via the core HRMS engine. For corrections, contact HR Command."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="px-5 py-4 bg-slate-50/50 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">{lang === "th" ? "ตรรกะการสื่อสาร" : "Communication Logic"}</CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Operational Dispatch Settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-50">
              {notifs.map((n) => {
                const Icon = n.icon;
                return (
                  <div key={n.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-all group rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary transition-all shadow-sm">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{lang === "th" ? n.labelTh : n.labelEn}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Protocol Active</p>
                      </div>
                    </div>
                    <Switch
                      checked={n.enabled}
                      onCheckedChange={(v) =>
                        setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, enabled: v } : x)))
                      }
                      className="data-[state=checked]:bg-slate-900"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-30 pt-4">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <History className="w-3.5 h-3.5" /> 2.4.0-STABLE
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <Database className="w-3.5 h-3.5" /> PRD-CLUSTER-01
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              <Terminal className="w-3.5 h-3.5" /> API: 1.14.2
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
