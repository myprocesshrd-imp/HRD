import { supabase } from "@/lib/supabase";
import { MOCK_USERS, type MockUser } from "@/lib/mock-data";

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

export async function getHRMSProfile(userId: string): Promise<HRMSProfile> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, departments(name_en)")
      .eq("id", userId)
      .single();
    if (!error && data) {
      return {
        employeeId: data.id,
        nameTh: data.name_th,
        nameEn: data.name_en,
        email: data.email ?? "",
        department: data.departments?.name_en ?? "",
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatar: data.name_en.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
      };
    }
  } catch {}
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) throw new Error("User not found in HRMS");
  return toHRMSProfile(user);
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
        department: data.departments?.name_en ?? "",
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatar: data.name_en.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
      };
    }
  } catch {}
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("User not found in HRMS");
  return toHRMSProfile(user);
}
