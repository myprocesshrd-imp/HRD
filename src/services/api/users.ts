import { supabase } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";
import { MOCK_USERS as MOCK_USERS_DATA, type MockUser, type Role } from "@/lib/mock-data";

export type { MockUser, Role };

export async function getRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*");
    if (!error && data) return data.map((r: any) => r.role as Role);
  } catch {}
  return [];
}


export async function getUsers(): Promise<MockUser[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, departments(name_en)")
      .order("created_at");
    if (!error && data && data.length > 0) {
      return data.map((u: any) => ({
        id: u.id,
        employeeCode: u.employee_code ?? "",
        email: u.email ?? "",
        password: "",
        nameTh: u.name_th,
        nameEn: u.name_en,
        role: u.role as Role,
        department: u.departments?.name_en ?? "",
        businessUnit: u.business_unit ?? "",
        level: u.level ?? "",
        location: u.location ?? "",
        avatarUrl: u.avatar_url ?? "",
        isActive: u.is_active !== false,
        lastSyncedAt: u.last_synced_at ?? undefined,
      }));
    }
  } catch {}
  return [];
}

export async function getUserById(id: string): Promise<MockUser | undefined> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, departments(name_en)")
      .eq("id", id)
      .single();
    if (!error && data) {
      return {
        id: data.id,
        employeeCode: data.employee_code ?? "",
        email: data.email ?? "",
        password: "",
        nameTh: data.name_th,
        nameEn: data.name_en,
        role: data.role as Role,
        department: data.departments?.name_en ?? "",
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatarUrl: data.avatar_url ?? "",
      };
    }
  } catch {}
  return undefined;
}

export async function getUserByEmail(email: string): Promise<MockUser | undefined> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, departments(name_en)")
      .eq("email", email.toLowerCase())
      .single();
    if (!error && data) {
      return {
        id: data.id,
        employeeCode: data.employee_code ?? "",
        email: data.email ?? "",
        password: "",
        nameTh: data.name_th,
        nameEn: data.name_en,
        role: data.role as Role,
        department: data.departments?.name_en ?? "",
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatarUrl: data.avatar_url ?? "",
      };
    }
  } catch {}
  return undefined;
}

export async function getDemographicsConstants(): Promise<{
  departments: string[];
  businessUnits: string[];
  locations: string[];
  levels: string[];
  genders: string[];
  ageRanges: string[];
  tenure: string[];
}> {
  let dbDepartments: string[] = [];
  try {
    const { data } = await supabase
      .from("departments")
      .select("name_en")
      .order("name_en");
    if (data && data.length > 0) {
      dbDepartments = data.map((d: any) => d.name_en);
    }
  } catch {}

  let dbBus: string[] = [];
  try {
    const { data } = await supabase
      .from("business_units")
      .select("name_en")
      .order("name_en");
    if (data && data.length > 0) {
      dbBus = data.map((b: any) => b.name_en);
    }
  } catch {}

  let locations: string[] = [];
  let levels: string[] = [];
  let genders: string[] = [];
  let ageRanges: string[] = [];
  let tenure: string[] = [];

  try {
    const { data } = await supabase
      .from("demographic_options")
      .select("field_key, label_en")
      .order("sort_order");
    
    if (data && data.length > 0) {
      data.forEach((item: any) => {
        if (item.field_key === "location" || item.field_key === "locations") locations.push(item.label_en);
        else if (item.field_key === "level" || item.field_key === "levels") levels.push(item.label_en);
        else if (item.field_key === "gender" || item.field_key === "genders") genders.push(item.label_en);
        else if (item.field_key === "ageRange" || item.field_key === "ageRanges") ageRanges.push(item.label_en);
        else if (item.field_key === "tenure" || item.field_key === "tenures") tenure.push(item.label_en);
      });
    }
  } catch {}

  const { DEPARTMENTS, BUSINESS_UNITS, LOCATIONS, LEVELS, GENDERS, AGE_RANGES, TENURE } = await import("@/lib/mock-data");
  return {
    departments: dbDepartments.length > 0 ? dbDepartments : DEPARTMENTS,
    businessUnits: dbBus.length > 0 ? dbBus : BUSINESS_UNITS,
    locations: locations.length > 0 ? locations : LOCATIONS,
    levels: levels.length > 0 ? levels : LEVELS,
    genders: genders.length > 0 ? genders : GENDERS,
    ageRanges: ageRanges.length > 0 ? ageRanges : AGE_RANGES,
    tenure: tenure.length > 0 ? tenure : TENURE,
  };
}

export async function createUser(data: {
  employeeCode: string;
  email: string;
  nameTh: string;
  nameEn: string;
  role: Role;
  department: string;
  businessUnit: string;
  level: string;
  location: string;
}): Promise<string> {
  const result = await invokeAdminService("USER_UPSERT_BULK", {
    users: [{
      employee_code: data.employeeCode,
      email: data.email,
      name_th: data.nameTh,
      name_en: data.nameEn,
      role: data.role,
      business_unit: data.businessUnit || null,
      level: data.level || null,
      location: data.location || null,
    }]
  });
  return result[0].id;
}

export async function updateUser(id: string, data: {
  employeeCode: string;
  email: string;
  nameTh: string;
  nameEn: string;
  role: Role;
  department: string;
  businessUnit: string;
  level: string;
  location: string;
}): Promise<void> {
  await invokeAdminService("USER_UPSERT_BULK", {
    users: [{
      id,
      employee_code: data.employeeCode,
      email: data.email,
      name_th: data.nameTh,
      name_en: data.nameEn,
      role: data.role,
      business_unit: data.businessUnit || null,
      level: data.level || null,
      location: data.location || null,
    }]
  });
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  await invokeAdminService("USER_SET_ACTIVE", { id, active });
}

export async function syncUsersFromHRMS(): Promise<{ success: number; failed: number }> {
  try {
    const idmsBase = import.meta.env.VITE_IDMS_BASE_URL || (typeof process !== 'undefined' ? process.env.VITE_IDMS_BASE_URL : "");
    const response = await fetch(`${idmsBase}/employees`);
    if (!response.ok) throw new Error("HRMS API unreachable");
    
    const hrmsUsers = await response.json();
    return await importUsersBulk(hrmsUsers);
  } catch (error) {
    console.error("HRMS Sync Error:", error);
    throw error;
  }
}

export async function importUsersBulk(users: any[]): Promise<{ success: number; failed: number }> {
  try {
    const payload = users.map(user => ({
      employee_code: user.employeeCode || user.emp_id,
      email: user.email,
      name_th: user.nameTh || user.full_name_th,
      name_en: user.nameEn || user.full_name_en,
      role: user.role || "employee",
      business_unit: user.businessUnit || user.bu,
      level: user.level,
      location: user.location,
      last_synced_at: new Date().toISOString(),
      is_active: true,
    }));

    await invokeAdminService("USER_UPSERT_BULK", { users: payload });
    return { success: users.length, failed: 0 };
  } catch (error) {
    console.error("Bulk Import Error:", error);
    throw error;
  }
}
