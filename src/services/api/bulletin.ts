import { supabase, supabaseAdmin } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";
import type { BulletinPost, BulletinLink, BulletinCategory } from "@/lib/mock-data";

// ── Supabase row shape ──
interface BulletinRow {
  id: string;
  title_th: string;
  title_en: string;
  content_th: string;
  content_en: string;
  category: BulletinCategory;
  image_url: string | null;
  is_pinned: boolean;
  posted_by: string;
  links: BulletinLink[];
  created_at: string;
  updated_at: string;
}

// ── Map DB row → app type ──
function mapRow(row: BulletinRow): BulletinPost {
  return {
    id: row.id,
    titleTh: row.title_th,
    titleEn: row.title_en,
    contentTh: row.content_th,
    contentEn: row.content_en,
    category: row.category,
    imageUrl: row.image_url ?? undefined,
    isPinned: row.is_pinned,
    postedBy: row.posted_by,
    links: row.links ?? [],
    postedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Fetch all posts (pinned first, then by date desc) ──
// SELECT is allowed for authenticated anon users — use supabase client directly
export async function getBulletinPostsFromDB(): Promise<BulletinPost[]> {
  try {
    const client = supabaseAdmin ?? supabase;
    if (!client) {
      console.error("[bulletin] Supabase client is not initialized");
      return [];
    }
    const { data, error } = await client
      .from("bulletin_posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[bulletin] fetch error:", error.message);
      return [];
    }
    return (data as BulletinRow[]).map(mapRow);
  } catch (err: any) {
    console.error("[bulletin] getBulletinPostsFromDB error:", err);
    return [];
  }
}

// ── Create a new post (via Edge Function to bypass RLS) ──
export async function createBulletinPost(
  payload: Omit<BulletinPost, "id" | "postedAt" | "updatedAt">
): Promise<BulletinPost | null> {
  try {
    const row = await invokeAdminService("BULLETIN_CREATE", {
      title_th:   payload.titleTh,
      title_en:   payload.titleEn,
      content_th: payload.contentTh,
      content_en: payload.contentEn,
      category:   payload.category,
      image_url:  payload.imageUrl || null,
      is_pinned:  payload.isPinned,
      posted_by:  payload.postedBy,
      links:      payload.links ?? [],
    });
    return row ? mapRow(row as BulletinRow) : null;
  } catch (err: any) {
    console.error("[bulletin] create error:", err.message);
    return null;
  }
}

// ── Update existing post (via Edge Function to bypass RLS) ──
export async function updateBulletinPost(
  id: string,
  payload: Partial<Omit<BulletinPost, "id" | "postedAt" | "updatedAt">>
): Promise<BulletinPost | null> {
  const patch: Record<string, unknown> = { id };
  if (payload.titleTh   !== undefined) patch.title_th   = payload.titleTh;
  if (payload.titleEn   !== undefined) patch.title_en   = payload.titleEn;
  if (payload.contentTh !== undefined) patch.content_th = payload.contentTh;
  if (payload.contentEn !== undefined) patch.content_en = payload.contentEn;
  if (payload.category  !== undefined) patch.category   = payload.category;
  if (payload.imageUrl  !== undefined) patch.image_url  = payload.imageUrl || null;
  if (payload.isPinned  !== undefined) patch.is_pinned  = payload.isPinned;
  if (payload.postedBy  !== undefined) patch.posted_by  = payload.postedBy;
  if (payload.links     !== undefined) patch.links      = payload.links;

  try {
    const row = await invokeAdminService("BULLETIN_UPDATE", patch);
    return row ? mapRow(row as BulletinRow) : null;
  } catch (err: any) {
    console.error("[bulletin] update error:", err.message);
    return null;
  }
}

// ── Delete a post (via Edge Function to bypass RLS) ──
export async function deleteBulletinPost(id: string): Promise<boolean> {
  try {
    await invokeAdminService("BULLETIN_DELETE", { id });
    return true;
  } catch (err: any) {
    console.error("[bulletin] delete error:", err.message);
    return false;
  }
}

// ── Toggle pin only (via Edge Function to bypass RLS) ──
export async function togglePinBulletinPost(
  id: string,
  isPinned: boolean
): Promise<boolean> {
  try {
    await invokeAdminService("BULLETIN_TOGGLE_PIN", { id, is_pinned: isPinned });
    return true;
  } catch (err: any) {
    console.error("[bulletin] toggle pin error:", err.message);
    return false;
  }
}
