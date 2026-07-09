import { supabase } from "@/lib/supabase";
import type { MockUser } from "@/lib/mock-data";

export interface HRMSProfile {
  employeeId: string;
  nameTh: string;
  nameEn: string;
  email: string;
  department: string;
  businessUnit: string;
  level: string;
  location: string;
  avatar: string;
}

function toHRMSProfile(u: MockUser): HRMSProfile {
  return {
    employeeId: u.id,
    nameTh: u.nameTh,
    nameEn: u.nameEn,
    email: u.email,
    department: u.department,
    businessUnit: u.businessUnit,
    level: u.level,
    location: u.location,
    avatar: u.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2),
  };
}

/**
 * Extract department name from Supabase row.
 * Priority: departments join (name_en) → hrms_raw_data.Department → hrms_raw_data.DepartmentName → ""
 */
function parseDepartment(data: any): string {
  if (data.departments?.name_en) return data.departments.name_en;
  try {
    const raw = typeof data.hrms_raw_data === "string"
      ? JSON.parse(data.hrms_raw_data)
      : data.hrms_raw_data;
    return raw?.Department ?? raw?.DepartmentName ?? "";
  } catch {
    return "";
  }
}

export async function getHRMSProfile(userId: string): Promise<HRMSProfile> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const query = supabase
      .from("users")
      .select("*, departments(name_en)");

    const { data, error } = await (isUuid
      ? query.eq("id", userId)
      : query.eq("employee_code", userId)
    ).single();

    if (!error && data) {
      return {
        employeeId: data.id,
        nameTh: data.name_th,
        nameEn: data.name_en,
        email: data.email ?? "",
        department: parseDepartment(data),
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatar: data.name_en.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
      };
    }
  } catch {}
  throw new Error("User not found in HRMS");
}

export async function getHRMSProfileByEmail(email: string): Promise<HRMSProfile> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, departments(name_en)")
      .eq("email", email.toLowerCase())
      .single();
    if (!error && data) {
      return {
        employeeId: data.id,
        nameTh: data.name_th,
        nameEn: data.name_en,
        email: data.email ?? "",
        department: parseDepartment(data),
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatar: data.name_en.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
      };
    }
  } catch {}
  throw new Error("User not found in HRMS");
}
