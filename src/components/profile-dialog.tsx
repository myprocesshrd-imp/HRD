import { Mail, Building2, Briefcase, MapPin, User, BadgeCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { MockUser } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProfileDialogProps {
  user: MockUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarFailed: boolean;
  onAvatarError: () => void;
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}

export function ProfileDialog({
  user,
  open,
  onOpenChange,
  avatarFailed,
  onAvatarError,
}: ProfileDialogProps) {
  const { t, lang } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
        <div className="h-24 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden flex items-center justify-center">
              {user.avatarUrl && !avatarFailed ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={onAvatarError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground bg-muted">
                  {user.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-12 px-6 pb-6 space-y-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {lang === "th" ? user.nameTh : user.nameEn}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-primary">
              {user.role.replace("_", " ")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {lang === "th" ? "รหัสพนักงาน" : "Employee ID"}
              </div>
              <div className="text-sm font-bold text-foreground mt-0.5">{user.employeeCode.toUpperCase()}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("profile.role")}
              </div>
              <div className="text-sm font-bold text-foreground mt-0.5 capitalize">{user.role.replace("_", " ")}</div>
            </div>
          </div>

          <div className="space-y-2">
            <ProfileField icon={User} label={t("profile.nameTh")} value={user.nameTh} />
            <ProfileField icon={User} label={t("profile.nameEn")} value={user.nameEn} />
            <ProfileField icon={Mail} label={t("profile.email")} value={user.email} />
            <ProfileField icon={Building2} label={t("profile.department")} value={user.department} />
            <ProfileField icon={Briefcase} label={t("profile.businessUnit")} value={user.businessUnit} />
            <ProfileField icon={BadgeCheck} label={t("profile.level")} value={user.level} />
            <ProfileField icon={MapPin} label={t("profile.location")} value={user.location} />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed italic">
            {lang === "th"
              ? "ข้อมูลจากระบบ HRMS หากไม่ถูกต้อง โปรดติดต่อ HR"
              : "Data synced from HRMS. Contact HR if any information is incorrect."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}