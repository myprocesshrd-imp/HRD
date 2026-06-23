# HRMS API → Database Field Mapping

## API Endpoint
```
Step 1: POST /login (employee_code + password)
        → { Result: "OK", EmpId: "670033" }

Step 2: GET /hrms/employee/{EmpId} (with session token)
        → { status: "success", data: { employee: { ... } } }
```

## Field Mapping

### Required — ต้อง sync มาใช้ในระบบ

| HRMS API Field | ค่า example | DB Column | ใช้ทำอะไร |
|----------------|------------|-----------|-----------|
| `ID_Emp` | `"670033"` | `users.employee_code` | Primary key จาก HRMS ใช้อ้างอิง |
| `FNameT` + `LNameT` | `"ยุพเรศ"` + `"เฉียวกุล"` | `users.name_th` | แสดงชื่อภาษาไทยทุกหน้าจอ |
| `FNameE` + `LNameE` | `"Yuparate"` + `"Chiewkul"` | `users.name_en` | แสดงชื่อภาษาอังกฤษ + avatar initials |
| `EMail` | `"yuparate_c@mibholding.com"` | `users.email` | ติดต่อ, notification |
| `Department` | `"HRBP Real Estate"` | → `users.department_id` | **Analytics หลัก** — filter dashboard, results, heatmap |
| `LevelName` | `"Department Mgr."` | `users.level` | **Analytics** — dashboard filter |
| `Workplace` | `"DAP"` | `users.location` | **Analytics** — dashboard filter |
| `Emp_BUWorking` | `"Corporate LO&RE"` | `users.business_unit` | **Analytics** — anonymous survey, report slicing |
| `Position` | `"HRBP Department Manager"` | `users.position` | แสดงใน profile (optional แต่มีประโยชน์) |
| `Sim_Number` | `"0858354498"` | `users.phone` | ติดต่อ |
| `WorkStatusID` | `3` | `users.is_active` = `(status ≠ resigned)` | ป้องกันพนักงานลาออกแล้วยังตอบแบบสำรวจได้ |
| `ResignStatus` | `true` | เช็คประกอบ `is_active` | confirm active status |

### Profile Picture

| HRMS API Field | DB Column | รูปแบบ URL |
|----------------|-----------|-----------|
| `IdentityID` (เลขบัตร ปชช.) | `users.avatar_url` | `https://wms.advanceagro.net/WSVIS/api/Face/GetImage?CardID={IdentityID}` |

⚠️ `IdentityID` ใช้เป็น key เรียก image **เท่านั้น** — ไม่ต้องเก็บเป็น plain text ใน DB ที่ query บ่อย
→ เก็บเฉพาะ `avatar_url` ที่ compose เสร็จแล้ว: `"https://wms.advanceagro.net/WSVIS/api/Face/GetImage?CardID=3200101125791"`

### Optional — มีดีกว่า แต่ไม่จำเป็น

| HRMS API Field | DB Column | เหตุผล |
|----------------|-----------|--------|
| `StartDate` | — (คำนวณ tenure) | ใช้ว่า tenure analytics ถ้ามี |
| `WorkAge` | — | string "2 ปี 4 เดือน" ใช้วางใน profile ได้ |
| `CompanyName` | — | เผื่อ multi-company ในอนาคต |
| `Emp_PositionGroup` / `Emp_PositionGroupE` | — | ใช้วางใน profile, ใกล้เคียง `level` แต่ละเอียดกว่า |

### NOT Needed — ไม่ต้อง sync (PII / ไม่เกี่ยวข้อง)

| HRMS API Field | เหตุผล |
|----------------|--------|
| `IdentityID` | **เลขบัตร ปชช.** — ใช้เป็น key เรียก image profile จาก `https://wms.advanceagro.net/WSVIS/api/Face/GetImage?CardID={IdentityID}` **เท่านั้น** ไม่เก็บ raw value, เก็บเฉพาะ `avatar_url` ที่ compose แล้ว |
| `PassportID` | **Passport** — sensitive PII, ห้ามเก็บ |
| `Gmail` | Email ส่วนตัว, ไม่จำเป็น |
| `Account` | Username ในระบบ内部 |
| `AccountStatus` | ภายใน, ไม่เกี่ยวข้อง |
| `CompanyID`, `Company_Code` | 内部 id |
| `DepartmentID`, `SectionID`, `Section` | Internal IDs, use `Department` string แทน |
| `PositionID`, `ID_MainPost`, `MainPosition` | Internal, `Position` string ก็พอ |
| `JobTitle`, `JD` | ละเอียดเกินไป |
| `CostCenterID`, `CostCenter` | การเงิน |
| `TypeProcessSalary`, `EmpTypeID`, `EmpType` | Payroll |
| `SexID` | อาจ sensitive ถ้าไม่จำเป็น |
| `chkNation`, `ProfileBase` | Internal flags |
| `DisplayName` | null เสมอ |

## Report Usage Matrix

| Report / Feature | Fields Used | Source |
|-----------------|-------------|--------|
| **Engagement by Department** | `department` | `users.department_id` → `departments.name_en/th` |
| **Engagement by Level** | `level` | `users.level` |
| **Engagement by Location** | `location` | `users.location` |
| **Engagement by Business Unit** | `business_unit` | `users.business_unit` |
| **Engagement by Tenure** | `tenure` | คำนวณจาก `StartDate` ถ้ามี |
| **Dashboard filter (5 dimensions)** | dept, level, location, age, tenure | dept/level/location จาก `users`, age/tenure จาก `survey_responses.demographics` |
| **Anonymous survey demographics** | dept, BU, level, location, age, gender, tenure | `survey_responses.demographics` (JSONB) |
| **HRMS Profile Review** | employee_code, name_th, name_en, email, dept, level, location, BU | `users` |
| **Personal Profile** | name_th, name_en, email, role, dept, level | `users` |

## Minimum Viable Sync Payload

จาก API response ~40 fields → **sync แค่ 12 fields** ที่จำเป็น:

```typescript
interface HRMSEmployeeSync {
  employee_code: string;   // ID_Emp
  name_th: string;         // FNameT + " " + LNameT
  name_en: string;         // FNameE + " " + LNameE
  email: string;           // EMail
  department: string;      // Department (map to departments table)
  level: string;           // LevelName
  location: string;        // Workplace
  business_unit: string;   // Emp_BUWorking
  position: string;        // Position
  phone: string;           // Sim_Number
  is_active: boolean;      // WorkStatusID ≠ resigned
  start_date?: string;     // StartDate (สำหรับคำนวณ tenure analytics)
  avatar_url: string;      // compose from IdentityID
                          //  → https://wms.advanceagro.net/WSVIS/api/Face/GetImage?CardID={IdentityID}
}
```
