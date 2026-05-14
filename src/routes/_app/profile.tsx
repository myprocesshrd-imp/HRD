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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Identity Profile</h1>
          <p className="text-[15px] font-medium text-slate-400">Manage your professional identity and session settings.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 px-5 rounded-xl font-bold text-[11px] uppercase gap-2.5 border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 shadow-sm" onClick={logout}>
               <LogOut className="w-4.5 h-4.5 text-rose-500" /> Decommission Session
            </Button>
            <Button className="h-10 px-6 rounded-xl bg-slate-900 dark:bg-primary text-white font-bold text-[11px] uppercase tracking-wider gap-2.5 shadow-lg shadow-slate-900/10 dark:shadow-primary/10" onClick={handleSave}>
               <Save className="w-4.5 h-4.5" /> Synchronize Profile
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-4">
             <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50 group">
                <div className="h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative">
                   <div className="absolute -bottom-12 inset-x-0 flex justify-center">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                         {user.avatarUrl ? (
                           <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                           <User className="w-12 h-12 text-slate-200" />
                         )}
                       </div>
                       <button className="absolute bottom-1 right-1 w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-primary transition-all">
                         <Camera className="w-4 h-4" />
                       </button>
                     </div>
                  </div>
               </div>
                <CardContent className="pt-14 pb-8 px-8 text-center space-y-5">
                   <div className="space-y-1">
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{lang === "th" ? user.nameTh : user.nameEn}</h2>
                     <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{user.role.replace("_", " ")}</p>
                   </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div className="text-left">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Employee ID</span>
                         <span className="text-[15px] font-bold text-slate-700 dark:text-slate-300">{user?.employeeCode.toUpperCase()}</span>
                      </div>
                     <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Status</span>
                        <span className="text-[15px] font-bold text-emerald-600 uppercase">Active Node</span>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm rounded-2xl bg-slate-900 text-white overflow-hidden relative group">
               <CardContent className="p-6 space-y-5 relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                        <ShieldAlert className="w-6 h-6 text-primary" />
                     </div>
                     <h3 className="text-base font-bold tracking-tight">Security Protocol</h3>
                  </div>
                  <p className="text-sm font-medium text-slate-400 leading-relaxed italic">
                    Advanced encryption active. Multi-layer structural data protection initialized.
                  </p>
                  <Button variant="ghost" className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-slate-900 transition-all">
                     Reset Access Credentials
                  </Button>
               </CardContent>
            </Card>
        </div>

        {/* Form Main Area */}
         <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
            <CardHeader className="px-6 py-5 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                   <User className="w-5 h-5" />
                </div>
                 <div>
                  <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Identity Attributes</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Personnel Metadata Mapping</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <UserCircle2 className="w-3.5 h-3.5" /> Full Name (Local)
                  </Label>
                   <Input 
                    value={nameTh} 
                    onChange={(e) => setNameTh(e.target.value)} 
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-[15px] text-slate-900 dark:text-white focus-visible:ring-primary/20 shadow-sm transition-all"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <Globe className="w-3.5 h-3.5" /> Full Name (Global)
                  </Label>
                   <Input 
                    value={nameEn} 
                    onChange={(e) => setNameEn(e.target.value)} 
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-[15px] text-slate-900 dark:text-white focus-visible:ring-primary/20 shadow-sm transition-all"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <Mail className="w-3.5 h-3.5" /> Communication Node
                  </Label>
                   <Input 
                    value={user.email} 
                    disabled 
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold text-[15px] cursor-not-allowed italic"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                    <Building2 className="w-3.5 h-3.5" /> Structural Topology
                  </Label>
                   <Input 
                    value={user.department} 
                    disabled 
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold text-[15px] cursor-not-allowed italic"
                  />
                </div>
              </div>

               <div className="p-5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 flex items-start gap-5 relative overflow-hidden group">
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-primary/10 dark:border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                  <BadgeInfo className="w-6 h-6" />
                </div>
                 <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">Synchronized Personnel Mapping</h4>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic opacity-80">
                    {lang === "th" 
                      ? "รายละเอียดของคุณถูกดึงจากระบบส่วนกลางอัตโนมัติ หากไม่ถูกต้อง โปรดติดต่อ HR" 
                      : "Personnel attributes are orchestrated via the core HRMS engine. For corrections, contact HR Command."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

           <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
            <CardHeader className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30 border-b dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                   <Bell className="w-5 h-5" />
                </div>
                 <div>
                  <CardTitle className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{lang === "th" ? "ตรรกะการสื่อสาร" : "Communication Logic"}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Operational Dispatch Settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-50 dark:divide-slate-800">
              {notifs.map((n) => {
                const Icon = n.icon;
                return (
                    <div className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all group rounded-xl">
                      <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-primary transition-all shadow-sm">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors leading-none">{lang === "th" ? n.labelTh : n.labelEn}</span>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Protocol Active</p>
                        </div>
                      </div>
                      <Switch
                        checked={n.enabled}
                        onCheckedChange={(v) =>
                          setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, enabled: v } : x)))
                        }
                        className="data-[state=checked]:bg-primary"
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
