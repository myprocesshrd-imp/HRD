import { supabase, supabaseAdmin } from "@/lib/supabase";
import {
  DEPARTMENTS as MOCK_DEPARTMENTS,
  BUSINESS_UNITS as MOCK_BUSINESS_UNITS,
  ENGAGEMENT_BY_DEPT as MOCK_ENGAGEMENT_BY_DEPT,
} from "@/lib/mock-data";

export interface Department {
  id: string;
  name_en: string;
  name_th: string;
  business_unit?: string | null;
}

export async function getDepartments(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin.from("departments").select("name_en").order("name_en");
    if (!error && data && data.length > 0) return data.map((d) => d.name_en);
  } catch {}
  return MOCK_DEPARTMENTS;
}

export async function getDepartmentsWithId(): Promise<Department[]> {
  try {
    const { data, error } = await supabaseAdmin.from("departments").select("*").order("name_en");
    if (!error && data && data.length > 0) return data;
  } catch {}
  return MOCK_DEPARTMENTS.map((name, i) => ({
    id: String(i + 1),
    name_en: name,
    name_th: name,
    business_unit: null,
  }));
}

export async function getBusinessUnits(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("business_unit")
      .not("business_unit", "is", null)
      .order("business_unit");
    if (!error && data && data.length > 0) {
      const units = [...new Set(data.map((d) => d.business_unit as string))];
      if (units.length > 0) return units;
    }
  } catch {}
  return MOCK_BUSINESS_UNITS;
}


export async function createDepartment(name: string): Promise<void> {
  const { error } = await supabaseAdmin.from("departments").insert([{ name_en: name, name_th: name }]);
  if (error) throw new Error(error.message);
}

export async function updateDepartment(oldName: string, newName: string): Promise<void> {
  const { error } = await supabaseAdmin.from("departments").update({ name_en: newName, name_th: newName }).eq("name_en", oldName);
  if (error) throw new Error(error.message);
}

export async function deleteDepartment(name: string): Promise<void> {
  const { error } = await supabaseAdmin.from("departments").delete().eq("name_en", name);
  if (error) throw new Error(error.message);
}
