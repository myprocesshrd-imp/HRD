import { supabaseAdmin } from "@/lib/supabase";

export interface DemographicOption {
  id: string;
  field_key: string;
  value: string;
  label_en: string;
  label_th: string;
  sort_order: number;
}

export async function getDemographicOptions(fieldKey?: string): Promise<DemographicOption[]> {
  try {
    let query = supabaseAdmin.from("demographic_options").select("*").order("sort_order");
    if (fieldKey) {
      query = query.eq("field_key", fieldKey);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to load demographic options:", error);
    return [];
  }
}

export async function createDemographicOption(option: Omit<DemographicOption, "id">): Promise<DemographicOption> {
  const { data, error } = await supabaseAdmin
    .from("demographic_options")
    .insert([option])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDemographicOption(id: string, option: Partial<Omit<DemographicOption, "id" | "field_key">>): Promise<DemographicOption> {
  const { data, error } = await supabaseAdmin
    .from("demographic_options")
    .update(option)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDemographicOption(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("demographic_options")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
