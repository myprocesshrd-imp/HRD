import { supabase, supabaseAdmin } from "@/lib/supabase";
import type { Role } from "@/lib/mock-data";
import { pushLog } from "./debug";

function md5(string: string): string {
  function RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function AddUnsigned(lX: number, lY: number) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }

  function F(x: number, y: number, z: number) { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number) { return (x ^ y ^ z); }
  function I(x: number, y: number, z: number) { return (y ^ (x | (~z))); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function ConvertToWordArray(string: string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function WordToHex(lValue: number) {
    var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substring(WordToHexValue_temp.length - 2);
    }
    return WordToHexValue;
  }

  function Utf8Encode(string: string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  var x = [];
  var k, S11, S12, S13, S14, S21, S22, S23, S24, S31, S32, S33, S34, S41, S42, S43, S44;
  var a = 0x67452301; var b = 0xEFCDAB89; var c = 0x98BADCFE; var d = 0x10325476;
  S11 = 7; S12 = 12; S13 = 17; S14 = 22;
  S21 = 5; S22 = 9; S23 = 14; S24 = 20;
  S31 = 4; S32 = 11; S33 = 16; S34 = 23;
  S41 = 6; S42 = 10; S43 = 15; S44 = 21;
  string = Utf8Encode(string);
  x = ConvertToWordArray(string);
  for (k = 0; k < x.length; k += 16) {
    var AA = a; var BB = b; var CC = c; var DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = AddUnsigned(a, AA); b = AddUnsigned(b, BB); c = AddUnsigned(c, CC); d = AddUnsigned(d, DD);
  }
  var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
  return temp.toLowerCase();
}

const IDMS_BASE = import.meta.env.VITE_IDMS_BASE_URL || (typeof process !== 'undefined' ? process.env.VITE_IDMS_BASE_URL : "");
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
            
            // Query the database to see if the user already exists and has a custom role
            let existingRole: Role = "employee";
            try {
              const { data: existingUser } = await supabaseAdmin
                .from("users")
                .select("role")
                .eq("employee_code", emp.ID_Emp)
                .single();
              if (existingUser?.role) {
                existingRole = existingUser.role as Role;
              }
            } catch {}

            const result = mapIDMSToUser(emp, employeeCode);
            
            // If user has a custom role in the database, preserve it
            if (existingRole && existingRole !== "employee") {
              result.role = existingRole;
            }

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
    // Check existing user to preserve their admin-assigned role
    const { data: existingData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("employee_code", user.employeeCode)
      .single();
    
    // Use existing role if set, otherwise use the mapped role
    const roleToWrite = existingData?.role ?? user.role;

    const { error } = await supabaseAdmin.from("users").upsert(
      {
        employee_code: user.employeeCode,
        email: user.email || null,
        name_th: user.nameTh,
        name_en: user.nameEn,
        role: roleToWrite,
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
