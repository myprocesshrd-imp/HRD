import { supabaseAdmin } from "@/lib/supabase";

export interface AppNotification {
  id: string;
  type: string;
  titleEn: string;
  titleTh: string;
  bodyEn?: string | null;
  bodyTh?: string | null;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((n) => ({
        id: n.id,
        type: n.type,
        titleEn: n.title_en,
        titleTh: n.title_th,
        bodyEn: n.body_en,
        bodyTh: n.body_th,
        linkUrl: n.link_url,
        isRead: n.is_read,
        createdAt: n.created_at,
      }));
    }
  } catch {}
  return [];
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", id);
    return !error;
  } catch {}
  return false;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    return !error;
  } catch {}
  return false;
}
