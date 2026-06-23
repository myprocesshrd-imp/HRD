import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getSurveys, type MockSurvey } from "@/services/api/surveys";
import { useAuth } from "@/lib/auth";

export interface AppNotification {
  id: string;
  type: "survey" | "reminder" | "milestone" | "system";
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  time: string;
  createdAt: string;
  isRead: boolean;
}

interface NotifCtx {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => void;
}

const Ctx = createContext<NotifCtx | null>(null);
const READ_KEY = "hrpulse.notifications.read";

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function generateFromSurveys(surveys: MockSurvey[]): AppNotification[] {
  const result: AppNotification[] = [];
  const now = Date.now();

  surveys.forEach((s) => {
    if (s.status === "Active") {
      result.push({
        id: `survey-active-${s.id}`,
        type: "survey",
        titleEn: "Survey Available",
        titleTh: "แบบสำรวจเปิดให้ตอบ",
        descEn: `${s.titleEn} is now open for responses.`,
        descTh: `แบบสำรวจ ${s.titleTh} เปิดให้ตอบแล้ว`,
        time: getRelativeTime(s.startDate || now.toString()),
        createdAt: s.startDate || new Date().toISOString(),
        isRead: false,
      });
    }

    if (s.status === "Active" && s.endDate && s.endDate !== "—") {
      const end = new Date(s.endDate).getTime();
      const daysLeft = Math.floor((end - now) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        result.push({
          id: `reminder-${s.id}`,
          type: "reminder",
          titleEn: "Closing Soon",
          titleTh: "ใกล้ปิดรับแบบสำรวจ",
          descEn: `${s.titleEn} closes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
          descTh: `แบบสำรวจ ${s.titleTh} จะปิดในอีก ${daysLeft} วัน`,
          time: getRelativeTime(s.endDate),
          createdAt: s.endDate,
          isRead: false,
        });
      }
    }

    if (s.responses > 0 && s.target > 0) {
      const pct = Math.round((s.responses / s.target) * 100);
      if (pct >= 80 && pct < 100) {
        result.push({
          id: `milestone-${s.id}`,
          type: "milestone",
          titleEn: "High Participation",
          titleTh: "การมีส่วนร่วมสูง",
          descEn: `${s.titleEn} reached ${pct}% participation.`,
          descTh: `แบบสำรวจ ${s.titleTh} มีผู้ตอบถึง ${pct}% แล้ว`,
          time: getRelativeTime(new Date().toISOString()),
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      }
    }
  });

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return result;
}

function loadReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveReadSet(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadSet);

  const refresh = useCallback(async () => {
    let generated: AppNotification[] = [];
    try {
      const surveys = await getSurveys();
      generated = generateFromSurveys(surveys);
    } catch {
      generated = [];
    }
    const merged = generated.map((n) => ({ ...n, isRead: readIds.has(n.id) }));
    setNotifications(merged);
  }, [readIds]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setReadIds((prev) => {
      const next = new Set(notifications.map((n) => n.id));
      saveReadSet(next);
      return next;
    });
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
