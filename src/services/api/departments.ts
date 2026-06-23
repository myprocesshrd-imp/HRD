import { supabase, supabaseAdmin } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";


export interface Department {
  id: string;
  name_en: string;
  name_th: string;
  business_unit?: string | null;
  business_unit_id?: string | null;
  business_unit_ids?: string[] | null;
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
    const { data, error } = await supabaseAdmin.from("departments").select("*, business_unit_ids:department_business_units(business_unit_id)").order("name_en");
    if (!error && data && data.length > 0) return data.map((d: any) => ({
      ...d,
      business_unit_ids: d.business_unit_ids?.map((item: any) => item.business_unit_id) || []
    }));
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


export async function createDepartment(nameEn: string, nameTh: string, buIds: string[] = []): Promise<void> {
  await invokeAdminService("DEPARTMENT_CREATE", { 
    name_en: nameEn, 
    name_th: nameTh,
    business_unit_ids: buIds
  });
}

export async function updateDepartment(id: string, nameEn: string, nameTh: string, buIds: string[] = []): Promise<void> {
  await invokeAdminService("DEPARTMENT_UPDATE", { 
    id,
    data: {
      name_en: nameEn, 
      name_th: nameTh,
      business_unit_ids: buIds
    }
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  await invokeAdminService("DEPARTMENT_DELETE", { id });
}
