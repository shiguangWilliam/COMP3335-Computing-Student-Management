const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3335";
const USE_TEST_API = (process.env.NEXT_PUBLIC_USE_TEST_API || "").toLowerCase();
const forceExternal = USE_TEST_API === "1" || USE_TEST_API === "true";

type Json = Record<string, unknown>;

import { secureRequest } from "./secureApi";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isInternal = path.startsWith("/API/");
  if (isInternal) {
    // 单层 /API/* 路径统一走安全传输：端点接收加密信封并转发到后端
    const method = (init?.method || "GET").toUpperCase();
    const bodyJson = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : undefined) : undefined;
    return await secureRequest<T>(path, { method, body: bodyJson as Record<string, unknown> | undefined });
  }
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    // 优先按 JSON 错误处理，避免把 HTML 直接显示到 UI
    if (contentType.includes("application/json")) {
      try {
        const errJson = await res.json();
        if ((errJson as Record<string, unknown>)?.code === "NOT_IMPLEMENTED") {
          // 抛出可识别的简短错误，带相对路径，避免暴露完整目录
          throw new Error(`NOT_IMPLEMENTED: ${isInternal ? path : ""}`.trim());
        }
        const msg = (errJson as Record<string, unknown>)?.message as string | undefined;
        throw new Error(msg || `HTTP ${res.status}`);
      } catch {
        // JSON 解析失败则退回到通用处理
        throw new Error(`HTTP ${res.status}`);
      }
    }
    // 非 JSON（如 404/HTML）统一为未实现或缺失的简短错误
    if (res.status === 404 || res.status === 501) {
      throw new Error(`NOT_IMPLEMENTED: ${isInternal ? path : ""}`.trim());
    }
    throw new Error(`HTTP ${res.status}`);
  }

  if (contentType.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

// Auth
export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobile: string;
};

export async function register(payload: RegisterPayload): Promise<Json> {
  return request<Json>("/API/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type LoginPayload = { email: string; password: string };

export async function login(payload: LoginPayload): Promise<Json> {
  return request<Json>("/API/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Role-based login
// 依据 Project.pdf：四种角色为 student/ARO/guardian/DRO
export type UserRole = "student" | "ARO" | "guardian" | "DRO";

export async function loginWithRole(role: UserRole, payload: LoginPayload): Promise<Json> {
  return request<Json>(`/API/login`, {
    method: "POST",
    body: JSON.stringify({ ...payload, role }),
  });
}

export const loginStudent = (payload: LoginPayload) => loginWithRole("student", payload);
export const loginARO = (payload: LoginPayload) => loginWithRole("ARO", payload);
export const loginGuardian = (payload: LoginPayload) => loginWithRole("guardian", payload);
export const loginDRO = (payload: LoginPayload) => loginWithRole("DRO", payload);

// Students
export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
};

export async function listStudents(params?: { q?: string; email?: string; id?: string }): Promise<Student[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<Student[]>(`/API/students${qs}`);
}

export async function createStudent(data: Partial<Student>): Promise<Student> {
  return request<Student>("/API/students", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<Student> {
  return request<Student>(`/API/students`, { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteStudent(id: string): Promise<Json> {
  const qs = `?${new URLSearchParams({ id }).toString()}`;
  return request<Json>(`/API/students${qs}`, { method: "DELETE" });
}

// Courses
export type Course = { id: string; code: string; name: string; credits?: number };

export async function listCourses(params?: { q?: string; code?: string }): Promise<Course[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<Course[]>(`/API/courses${qs}`);
}

export async function createCourse(data: Partial<Course>): Promise<Course> {
  return request<Course>("/API/courses", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  return request<Course>(`/API/courses`, { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteCourse(id: string): Promise<Json> {
  const qs = `?${new URLSearchParams({ id }).toString()}`;
  return request<Json>(`/API/courses${qs}`, { method: "DELETE" });
}

// Enrollments
export type Enrollment = { id: string; studentId: string; courseId: string; term?: string };

export async function listEnrollments(params?: { studentId?: string; courseId?: string }): Promise<Enrollment[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<Enrollment[]>(`/API/enrollments${qs}`);
}

export async function enrollStudent(data: { studentId: string; courseId: string; term?: string }): Promise<Enrollment> {
  return request<Enrollment>("/API/enrollments", { method: "POST", body: JSON.stringify(data) });
}

export async function unenrollStudent(id: string): Promise<Json> {
  const qs = `?${new URLSearchParams({ id }).toString()}`;
  return request<Json>(`/API/enrollments${qs}`, { method: "DELETE" });
}

// Grades
export type GradeRecord = { id: string; studentId: string; courseId: string; grade: string };

export async function listGrades(params?: { studentId?: string; courseId?: string }): Promise<GradeRecord[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<GradeRecord[]>(`/API/grades${qs}`);
}

export async function assignGrade(data: { studentId: string; courseId: string; grade: string }): Promise<GradeRecord> {
  return request<GradeRecord>("/API/grades", { method: "POST", body: JSON.stringify(data) });
}

// Disciplinary records
export type DisciplinaryRecord = { id: string; studentId: string; date: string; staffId: string; description?: string };

export async function listDisciplinaryRecords(params?: { studentId?: string; staffId?: string; date?: string }): Promise<DisciplinaryRecord[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<DisciplinaryRecord[]>(`/API/disciplinary-records${qs}`);
}

export async function createDisciplinaryRecord(data: { studentId: string; date: string; staffId: string; description?: string }): Promise<DisciplinaryRecord> {
  return request<DisciplinaryRecord>("/API/disciplinary-records", { method: "POST", body: JSON.stringify(data) });
}

export async function updateDisciplinaryRecord(id: string, data: Partial<{ studentId: string; date: string; staffId: string; description?: string }>): Promise<DisciplinaryRecord> {
  return request<DisciplinaryRecord>("/API/disciplinary-records", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteDisciplinaryRecord(id: string): Promise<Json> {
  const qs = `?${new URLSearchParams({ id }).toString()}`;
  return request<Json>(`/API/disciplinary-records${qs}`, { method: "DELETE" });
}

// Profile (placeholder)
export async function getProfile(): Promise<Json> {
  return request<Json>("/API/profile", { method: "GET" });
}

export async function updateProfile(data: Partial<{ firstName: string; lastName: string; email: string; mobile?: string }>): Promise<Json> {
  return request<Json>("/API/profile", { method: "PUT", body: JSON.stringify(data) });
}

// Reports (placeholder)
export async function generateReport(data: { kind: string; filters?: Record<string, unknown> }): Promise<Json> {
  return request<Json>("/API/reports", { method: "POST", body: JSON.stringify(data) });
}

export async function getAdminSummary(): Promise<Json> {
  return request<Json>("/API/admin-summary", { method: "GET" });
}

export async function logout(): Promise<Json> {
  return request<Json>("/API/logout", { method: "POST" });
}

export const api = {
  // auth
  register,
  login,
  loginWithRole,
  loginStudent,
  loginARO,
  loginGuardian,
  loginDRO,
  // students
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  // courses
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  // enrollments
  listEnrollments,
  enrollStudent,
  unenrollStudent,
  // grades
  listGrades,
  assignGrade,
  // disciplinary records
  listDisciplinaryRecords,
  createDisciplinaryRecord,
  updateDisciplinaryRecord,
  deleteDisciplinaryRecord,
  // profile
  getProfile,
  updateProfile,
  // reports
  generateReport,
  // admin
  getAdminSummary,
  logout,
};

export default api;
