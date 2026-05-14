import { supabase, supabaseAdmin } from "@/lib/supabase";
import type { Role } from "@/lib/mock-data";
import md5 from "md5";
import { pushLog } from "./debug";

const IDMS_BASE = import.meta.env.VITE_IDMS_BASE_URL;
const IDMS_AUTH_URL = "https://mobiledev.advanceagro.net/ws/api/idms/authentication/";
const USE_MD5 = true;

export interface IDMSProfile {
  ID_Emp: string;
  FNameT: string;
  LNameT: string;
  FNameE: string;
  LNameE: string;
  EMail: string;
  Department: string;
  LevelName: string;
  Workplace: string;
  Emp_BUWorking: string;
  Position: string;
  Sim_Number: string;
  WorkStatusID: number;
  ResignStatus: boolean;
  IdentityID: string;
  StartDate?: string;
}

export interface SyncResult {
  success: boolean;
  role: Role;
  employeeCode: string;
  nameTh: string;
  nameEn: string;
  email: string;
  department: string;
  businessUnit: string;
  level: string;
  location: string;
  avatarUrl: string;
}

export async function idmsLogin(
  employeeCode: string,
  password: string
): Promise<SyncResult | null> {
  // 1. Try real IDMS API
  const passwordToSend = USE_MD5 ? md5(password) : password;
  pushLog("log","[IDMS] Attempting login for:", employeeCode);
  pushLog("log","[IDMS] Password (MD5):", passwordToSend);

  try {
    const params = new URLSearchParams({
      account: employeeCode,
      password: passwordToSend,
      Service: "0000",
      AgentId: "SystemMango",
      AgentCode: "Np4kfRh5",
    });
    pushLog("log","[IDMS] Target URL:", `${IDMS_AUTH_URL}?${params}`);

    const loginRes = await fetch(`${IDMS_AUTH_URL}?${params}`);

    pushLog("log","[IDMS] Login response status:", loginRes.status);

    if (!loginRes.ok) {
      const text = await loginRes.text();
      pushLog("warn",  "[IDMS] Login failed:", loginRes.status, text);
      // Fall through to Supabase
    } else {
      const loginData = await loginRes.json();
      pushLog("log","[IDMS] Login response body:", loginData);

      if (loginData.Result === "OK" && loginData.EmpId) {
        pushLog("log","[IDMS] Login OK, EmpId:", loginData.EmpId);

        const profileRes = await fetch(
          `${IDMS_BASE}/hrms/employee/${loginData.EmpId}`,
          { headers: { Authorization: `Bearer ${loginData.Token}` } }
        );

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          pushLog("log","[IDMS] Profile response:", profileData);

          const emp: IDMSProfile =
            profileData?.data?.employee ?? profileData?.employee ?? profileData;

          if (emp?.ID_Emp) {
            pushLog("log","[IDMS] Profile matched, syncing to Supabase...");
            const result = mapIDMSToUser(emp, employeeCode);
            await syncUserToSupabase(emp, result);
            pushLog("log","[IDMS] Sync complete. Role:", result.role);
            return result;
          } else {
            pushLog("warn",  "[IDMS] No ID_Emp in profile response");
          }
        } else {
          pushLog("warn",  "[IDMS] Profile fetch failed:", profileRes.status);
        }
      } else {
        pushLog("warn",  "[IDMS] Login Result not OK:", loginData);
      }
    }
  } catch (err) {
    pushLog("error", "[IDMS] API error:", err);
  }

  // 2. Try Supabase users table
  pushLog("log","[IDMS] Trying Supabase lookup...");
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, departments(name_en)")
      .eq("employee_code", employeeCode.toLowerCase())
      .single();

    if (error) {
      pushLog("warn",  "[IDMS] Supabase lookup error:", error.message);
    }

    if (!error && data) {
      pushLog("log","[IDMS] Found user in Supabase:", data.employee_code, data.role);
      return {
        success: true,
        role: data.role as Role,
        employeeCode: data.employee_code,
        nameTh: data.name_th,
        nameEn: data.name_en,
        email: data.email ?? "",
        department: data.departments?.name_en ?? "",
        businessUnit: data.business_unit ?? "",
        level: data.level ?? "",
        location: data.location ?? "",
        avatarUrl: data.avatar_url ?? "",
      };
    }
  } catch (err) {
    pushLog("error", "[IDMS] Supabase lookup error:", err);
  }

  pushLog("warn",  "[IDMS] All auth methods failed for:", employeeCode);
  return null;
}

function mapIDMSToUser(emp: IDMSProfile, employeeCode: string): SyncResult {
  const role: Role =
    employeeCode.toLowerCase() === "chatchawan_tu"
      ? "super_admin"
      : "employee";

  const avatarUrl = emp.ID_Emp
    ? `https://wms.advanceagro.net/WSVIS/api/Face/GetImage?CardID=${emp.ID_Emp}`
    : "";

  return {
    success: true,
    role,
    employeeCode: emp.ID_Emp,
    nameTh: `${emp.FNameT ?? ""} ${emp.LNameT ?? ""}`.trim(),
    nameEn: `${emp.FNameE ?? ""} ${emp.LNameE ?? ""}`.trim(),
    email: emp.EMail ?? "",
    department: emp.Department ?? "",
    businessUnit: emp.Emp_BUWorking ?? "",
    level: emp.LevelName ?? "",
    location: emp.Workplace ?? "",
    avatarUrl,
  };
}

async function syncUserToSupabase(emp: IDMSProfile, user: SyncResult) {
  try {
    const { error } = await supabaseAdmin.from("users").upsert(
      {
        employee_code: user.employeeCode,
        email: user.email || null,
        name_th: user.nameTh,
        name_en: user.nameEn,
        role: user.role,
        department_id: null,
        business_unit: user.businessUnit || null,
        level: user.level || null,
        location: user.location || null,
        position: emp.Position || null,
        phone: emp.Sim_Number || null,
        avatar_url: user.avatarUrl || null,
        is_active: true,
        last_synced_at: new Date().toISOString(),
        hrms_raw_data: JSON.stringify(emp),
      },
      { onConflict: "employee_code", ignoreDuplicates: false }
    );

    if (error) {
      pushLog("warn",  "[IDMS] Supabase sync error:", error.message);
    } else {
      pushLog("log","[IDMS] Supabase sync OK");
    }
  } catch (err) {
    pushLog("warn",  "[IDMS] Supabase sync exception:", err);
  }
}

export async function syncUserByEmployeeCode(
  employeeCode: string
): Promise<SyncResult | null> {
  try {
    const profileRes = await fetch(
      `${IDMS_BASE}/hrms/employee/${employeeCode}`,
      { headers: { Authorization: `Bearer ${import.meta.env.VITE_IDMS_TOKEN ?? ""}` } }
    );
    const data = await profileRes.json();
    const emp: IDMSProfile = data?.data?.employee ?? data?.employee ?? data;
    if (emp?.ID_Emp) {
      const result = mapIDMSToUser(emp, employeeCode);
      await syncUserToSupabase(emp, result);
      return result;
    }
  } catch (err) {
    pushLog("error", "[IDMS] SyncByCode error:", err);
  }
  return null;
}
