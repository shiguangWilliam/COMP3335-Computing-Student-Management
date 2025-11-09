# ComputingU SMS 内部 API 文档（api.md）

本文件记录前端项目的内部 API（基于 Next.js `app` 路由，前缀为 `/API/function`），包含接口名称、功能说明与提交参数格式。除特别说明外，所有提交均使用 `Content-Type: application/json`，接口返回为 `application/json`。

## 通用约定
- 前缀：`/API/function`
- 请求头：`Content-Type: application/json`
- 认证：登录成功后由服务端设置认证 Cookie；部分接口（如 `GET /profile`）在未登录时返回 401。
- 路径参数：文档中以 `{id}`、`{role}` 等表示；在调用时用实际值替换。
- 查询参数：在 GET 列表接口中通过 `?key=value` 形式拼接，可选项未提供时省略。

---

## Auth 身份认证

### POST `/API/function/register`
- 功能：注册新用户。
- 提交参数（JSON）：
  - `firstName`: string
  - `lastName`: string
  - `email`: string
  - `password`: string
  - `mobile`: string

### POST `/API/function/login`
- 功能：用户登录，服务端设置认证 Cookie。
- 提交参数（JSON）：
  - `email`: string
  - `password`: string

### POST `/API/function/login/{role}`（下拉栏废案，搁置）
- 功能：以指定角色登录（`student` | `ARO` | `guardian` | `DRO`）。
- 路径参数：
  - `role`: string（四选一：`student`/`ARO`/`guardian`/`DRO`）
- 提交参数（JSON）：
  - `email`: string
  - `password`: string

### POST `/API/function/logout`
- 功能：退出登录，清除认证 Cookie。
- 提交参数：无（空请求体）。

---

## Profile 用户资料

### GET `/API/function/profile`
- 功能：获取当前登录用户的基本资料（从认证 Cookie 读取）。
- 查询参数：无。

### PUT `/API/function/profile`
- 功能：更新当前登录用户的基本资料。
- 提交参数（JSON，均为可选）：
  - `firstName?`: string
  - `lastName?`: string
  - `email?`: string
  - `mobile?`: string

---

## Students 学生管理

### GET `/API/function/students`
- 功能：查询学生列表。
- 查询参数（可选）：
  - `q?`: string（按关键字模糊匹配姓名/邮箱等）
  - `email?`: string（按邮箱精确匹配）
  - `id?`: string（按 ID 精确匹配）

### POST `/API/function/students`
- 功能：创建学生。
- 提交参数（JSON）：
  - `firstName`: string
  - `lastName`: string
  - `email`: string
  - `mobile?`: string

### PUT `/API/function/students/{id}`
- 功能：更新指定学生。
- 路径参数：
  - `id`: string（学生 ID）
- 提交参数（JSON，任意字段可选）：
  - `firstName?`: string
  - `lastName?`: string
  - `email?`: string
  - `mobile?`: string

### DELETE `/API/function/students/{id}`
- 功能：删除指定学生。
- 路径参数：
  - `id`: string（学生 ID）

---

## Courses 课程目录

### GET `/API/function/courses`
- 功能：查询课程列表。
- 查询参数（可选）：
  - `q?`: string（按名称/代码关键字匹配）
  - `code?`: string（按课程代码精确匹配）

### POST `/API/function/courses`
- 功能：创建课程。
- 提交参数（JSON）：
  - `code`: string
  - `name`: string
  - `credits?`: number

### PUT `/API/function/courses/{id}`
- 功能：更新指定课程。
- 路径参数：
  - `id`: string（课程 ID）
- 提交参数（JSON，任意字段可选）：
  - `code?`: string
  - `name?`: string
  - `credits?`: number

### DELETE `/API/function/courses/{id}`
- 功能：删除指定课程。
- 路径参数：
  - `id`: string（课程 ID）

---

## Enrollments 选课管理

### GET `/API/function/enrollments`
- 功能：查询选课记录列表。
- 查询参数（可选）：
  - `studentId?`: string
  - `courseId?`: string

### POST `/API/function/enrollments`
- 功能：为学生选课。
- 提交参数（JSON）：
  - `studentId`: string
  - `courseId`: string
  - `term?`: string（学期，如 `2024-Fall`）

### DELETE `/API/function/enrollments/{id}`
- 功能：取消指定选课记录。
- 路径参数：
  - `id`: string（选课记录 ID）

---

## Grades 成绩管理

### GET `/API/function/grades`
- 功能：查询成绩记录列表。
- 查询参数（可选）：
  - `studentId?`: string
  - `courseId?`: string

### POST `/API/function/grades`
- 功能：录入/更新成绩记录（按学生 + 课程进行 upsert）。
- 提交参数（JSON）：
  - `studentId`: string
  - `courseId`: string
  - `grade`: string（如 `A`/`B+`/`C` 等）

---

## Reports 报表与管理摘要

### POST `/API/function/reports`
- 功能：生成报表（按种类与过滤条件）。
- 提交参数（JSON）：
  - `kind`: string（报表类型标识）
  - `filters?`: object（过滤条件，键值自由定义）

### GET `/API/function/admin/summary`
- 功能：获取管理摘要数据（统计总览）。
- 查询参数：无。

---

## 备注
- 上述接口路径与参数格式与 `frontend/lib/api.ts` 保持一致，便于前端统一封装调用。
- 实际响应模型与状态码由后端实现决定；当前前端在遇到 `501` 或 `404` 时会抛出 `NOT_IMPLEMENTED` 错误以便 UI 识别。
- 若未来后端迁移为外部网关（非 `/API/function` 前缀），可通过环境变量 `NEXT_PUBLIC_API_URL` 指向后端服务；前端封装会自动拼接外部基础 URL。