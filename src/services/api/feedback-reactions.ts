import { supabaseAdmin } from "@/lib/supabase";

export type ReactionType = "agree" | "actioned";

export interface ReactionState {
  agree: boolean;
  actioned: boolean;
}

/**
 * Fetch the shared reaction flags for a set of feedback answer ids.
 * Returns a map keyed by answer_id. Missing entries default to both false.
 */
export async function fetchReactions(
  answerIds: string[],
): Promise<Record<string, ReactionState>> {
  const map: Record<string, ReactionState> = {};
  if (!supabaseAdmin || answerIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("feedback_reactions")
    .select("answer_id, reaction_type")
    .in("answer_id", answerIds);

  if (error) {
    console.error("[fetchReactions]", error.message);
    return map;
  }

  for (const row of data || []) {
    const id = row.answer_id as string;
    const type = row.reaction_type as ReactionType;
    if (!map[id]) map[id] = { agree: false, actioned: false };
    if (type === "agree") map[id].agree = true;
    if (type === "actioned") map[id].actioned = true;
  }
  return map;
}

/**
 * Toggle a reaction. `on = true` upserts the flag (global), `on = false` deletes it.
 * `by` is the employee code of the acting HRD user.
 */
export async function setReaction(
  answerId: string,
  type: ReactionType,
  on: boolean,
  by: string,
): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    if (on) {
      const { error } = await supabaseAdmin.from("feedback_reactions").upsert(
        {
          answer_id: answerId,
          reaction_type: type,
          created_by: by,
        },
        { onConflict: "answer_id,reaction_type" },
      );
      if (error) console.error("[setReaction upsert]", error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("feedback_reactions")
        .delete()
        .eq("answer_id", answerId)
        .eq("reaction_type", type);
      if (error) console.error("[setReaction delete]", error.message);
    }
  } catch (e) {
    console.error("[setReaction]", e);
  }
}
