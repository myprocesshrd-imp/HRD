import { invokeAdminService } from "./index";
import { supabaseAdmin } from "@/lib/supabase";

export interface BusinessUnit {
  id: string;
  name: string; // Legacy
  name_en: string;
  name_th: string;
  code?: string;
  description?: string;
  created_at?: string;
}

export async function getBusinessUnits(): Promise<BusinessUnit[]> {
  try {
    const { data, error } = await supabaseAdmin.from("business_units").select("*").order("name_en");
    if (!error && data && data.length > 0) return data;
  } catch {}
  
  // Fallback mock if table is empty
  return [
    { id: "bu1", name: "Consumer Goods", name_en: "Consumer Goods", name_th: "สินค้าอุปโภคบริโภค", code: "CG", description: "FMCG and Retail Division" },
    { id: "bu2", name: "Industrial Power", name_en: "Industrial Power", name_th: "พลังงานอุตสาหกรรม", code: "IP", description: "Energy and Power Solutions" },
  ];
}

export async function createBusinessUnit(bu: any): Promise<BusinessUnit> {
  const nameEn = bu.name_en || bu.name || "";
  const nameTh = bu.name_th || bu.name || "";
  const code = bu.code || `BU-${Math.random().toString(36).substring(7).toUpperCase()}`;

  const result = await invokeAdminService("BUSINESS_UNIT_CREATE", {
    name: nameEn,
    name_en: nameEn,
    name_th: nameTh,
    code: code,
    description: bu.description || ""
  });
  return result;
}

export async function updateBusinessUnit(id: string, bu: Partial<BusinessUnit>): Promise<BusinessUnit> {
  const result = await invokeAdminService("BUSINESS_UNIT_UPDATE", { 
    id, 
    data: bu 
  });
  return result;
}

export async function deleteBusinessUnit(id: string): Promise<void> {
  await invokeAdminService("BUSINESS_UNIT_DELETE", { id });
}
