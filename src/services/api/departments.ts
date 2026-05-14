import { supabase, supabaseAdmin } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";


export interface Department {
  id: string;
  name_en: string;
  name_th: string;
  business_unit?: string | null;
  business_unit_id?: string | null;
}

export async function getDepartments(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin.from("departments").select("name_en").order("name_en");
    if (!error && data && data.length > 0) return data.map((d: { name_en: string }) => d.name_en);
  } catch {}
  return [];
}

export async function getDepartmentsWithId(): Promise<Department[]> {
  try {
    const { data, error } = await supabaseAdmin.from("departments").select("*").order("name_en");
    if (!error && data && data.length > 0) return data;
  } catch {}
  return [];
}

export async function getLegacyBusinessUnits(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("business_unit")
      .not("business_unit", "is", null)
      .order("business_unit");
    if (!error && data && data.length > 0) {
      const units = Array.from(new Set<string>(data.map((d: { business_unit: string | null }) => d.business_unit as string)));
      if (units.length > 0) return units;
    }
  } catch {}
  return [];
}


export async function createDepartment(name: string, buId?: string, buName?: string): Promise<void> {
  await invokeAdminService("DEPARTMENT_CREATE", { 
    name_en: name, 
    name_th: name,
    business_unit_id: buId || null,
    business_unit: buName || null
  });
}

export async function updateDepartment(id: string, newName: string, buId?: string, buName?: string): Promise<void> {
  await invokeAdminService("DEPARTMENT_UPDATE", { 
    id,
    data: {
      name_en: newName, 
      name_th: newName,
      business_unit_id: buId || null,
      business_unit: buName || null
    }
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  await invokeAdminService("DEPARTMENT_DELETE", { id });
}
