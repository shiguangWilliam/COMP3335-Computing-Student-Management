const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3335";
const USE_TEST_API = (process.env.NEXT_PUBLIC_USE_TEST_API || "").toLowerCase();
const forceExternal = USE_TEST_API === "1" || USE_TEST_API === "true";

type Json = Record<string, unknown>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isInternal = path.startsWith("/API/function");
  const url = isInternal && !forceExternal ? path : `${API_URL}${path}`;
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
  return request<Json>("/API/function/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type LoginPayload = { email: string; password: string };

export async function login(payload: LoginPayload): Promise<Json> {
  return request<Json>("/API/function/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Role-based login
// 依据 Project.pdf：四种角色为 student/ARO/guardian/DRO
export type UserRole = "student" | "ARO" | "guardian" | "DRO";

export async function loginWithRole(role: UserRole, payload: LoginPayload): Promise<Json> {
  return request<Json>(`/API/function/login/${role}`, {
    method: "POST",
    body: JSON.stringify(payload),
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
  return request<Student[]>(`/API/function/students${qs}`);
}

export async function createStudent(data: Partial<Student>): Promise<Student> {
  return request<Student>("/API/function/students", { method: "POST", body: JSON.stringify(data) });
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<Student> {
  return request<Student>(`/API/function/students/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteStudent(id: string): Promise<Json> {
  return request<Json>(`/API/function/students/${id}`, { method: "DELETE" });
}

// Courses
export type Course = { id: string; code: string; name: string; credits?: number };

export async function listCourses(params?: { q?: string; code?: string }): Promise<Course[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<Course[]>(`/API/function/courses${qs}`);
}

export async function createCourse(data: Partial<Course>): Promise<Course> {
  return request<Course>("/API/function/courses", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  return request<Course>(`/API/function/courses/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteCourse(id: string): Promise<Json> {
  return request<Json>(`/API/function/courses/${id}`, { method: "DELETE" });
}

// Enrollments
export type Enrollment = { id: string; studentId: string; courseId: string; term?: string };

export async function listEnrollments(params?: { studentId?: string; courseId?: string }): Promise<Enrollment[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<Enrollment[]>(`/API/function/enrollments${qs}`);
}

export async function enrollStudent(data: { studentId: string; courseId: string; term?: string }): Promise<Enrollment> {
  return request<Enrollment>("/API/function/enrollments", { method: "POST", body: JSON.stringify(data) });
}

export async function unenrollStudent(id: string): Promise<Json> {
  return request<Json>(`/API/function/enrollments/${id}`, { method: "DELETE" });
}

// Grades
export type GradeRecord = { id: string; studentId: string; courseId: string; grade: string };

export async function listGrades(params?: { studentId?: string; courseId?: string }): Promise<GradeRecord[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  return request<GradeRecord[]>(`/API/function/grades${qs}`);
}

export async function assignGrade(data: { studentId: string; courseId: string; grade: string }): Promise<GradeRecord> {
  return request<GradeRecord>("/API/function/grades", { method: "POST", body: JSON.stringify(data) });
}

// Profile (placeholder)
export async function getProfile(): Promise<Json> {
  return request<Json>("/API/function/profile", { method: "GET" });
}

export async function updateProfile(data: Partial<{ firstName: string; lastName: string; email: string; mobile?: string }>): Promise<Json> {
  return request<Json>("/API/function/profile", { method: "PUT", body: JSON.stringify(data) });
}

// Reports (placeholder)
export async function generateReport(data: { kind: string; filters?: Record<string, unknown> }): Promise<Json> {
  return request<Json>("/API/function/reports", { method: "POST", body: JSON.stringify(data) });
}

export async function getAdminSummary(): Promise<Json> {
  return request<Json>("/API/function/admin/summary", { method: "GET" });
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
  // profile
  getProfile,
  updateProfile,
  // reports
  generateReport,
  // admin
  getAdminSummary,
};

export default api;