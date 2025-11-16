# API 概览

本文件描述对外暴露、和页面真正配合使用的业务 API。  
安全网关、HMAC 等内部机制见 `frontend/api.md`。

角色缩写：`student`（学生）、`guardian`（监护人）、`ARO`、`DRO`、`DBA`。

---

## 1. 认证 / 会话

### POST /API/login
- Roles: public（不需要现有会话）  
- Content-Type: `application/json`
- Request body:
```json
{
  "email": "user@example.com",
  "password": "<string>",
  "role": "student|guardian|ARO|DRO"   // 可选，帮助前端选择账号类型
}
```
- Behavior:
  - 校验邮箱格式；
  - 在 `students_encrypted / guardians_encrypted / staffs_encrypted` 中查找匹配账号；
  - 成功时创建服务器端 Session，并下发 `sid` Cookie（`HttpOnly; SameSite=Lax`）。
- Responses（body 为 JSON）:
  - 200: `{ "ok": true, "message": "login accepted, session created" }`
  - 400: `{ "ok": false, "message": "invalid email" }`
  - 401: `{ "ok": false, "message": "invalid credentials" }`

### POST /API/logout
- Roles: 已登录任意角色
- Behavior:
  - 使当前 `sid` 会话失效，并通过 `Set-Cookie` 将 `sid` 过期。
- Responses:
  - 200: `{ "ok": true, "message": "logged out" }`

### GET /API/profile
- Roles: `student`, `guardian`, `ARO`, `DRO`
- Behavior:
  - 根据当前 `sid` 解析 Session，加载对应用户基本信息；
  - 返回的字段会根据角色做最小暴露（例如学生不会看到加密字段）。
- Responses（示例结构，实际字段略有差异）:
```json
{
  "first_name": "Alice",
  "last_name": "Chan",
  "email": "alice@example.com",
  "gender": "F",
  "phone": "91234567",
  "address": "…",
  "enrollment_year": 2024
}
```

---

## 2. 成绩管理 /API/grades（ARO）

### GET /API/grades
- Roles: `ARO`
- Query parameters（**必须同时提供**）:
  - `studentId`：学生 ID（UUID）
  - `courseId`：课程 ID（UUID）
- Behavior:
  - 仅在 ARO 身份下，根据给定 `studentId + courseId` 查询该学生在该课程的成绩记录；
  - 不提供全表浏览接口，避免一次性导出全部成绩。
- Responses（示例）:
```json
{
  "ok": true,
  "data": [
    {
      "id": "<grade-id>",
      "student_id": "<student-id>",
      "course_id": "<course-id>",
      "course_name": "COMP3335",
      "term": "2024-S1",
      "grade": "A-",
      "comments": "…"
    }
  ]
}
```

### POST /API/grades
- Roles: `ARO`
- Content-Type: `application/json`
- Request body（计划设计，和前端 `/grades` 页面配合）:
```json
{
  "studentId": "<uuid>",
  "courseId": "<uuid>",
  "grade": "A|B+|...",
  "comments": "<optional string>"
}
```
- Behavior:
  - 为某个学生在某门课上创建或更新一条成绩记录；
  - 写入 `grades` 与 `grade_encrypted` 两张表（明文字段 + 加密字段）。
- Responses（示例）:
  - 200/201: `{ "ok": true, "id": "<grade-id>", "message": "grade saved" }`
  - 400: `{ "ok": false, "message": "invalid fields" }`
  - 403: `{ "ok": false, "message": "forbidden" }`

### DELETE /API/grades
- Roles: `ARO`
- Content-Type: `application/json`
- Request body:
```json
{
  "gradeId": "<grade-record-id>"
}
```
-- Behavior:
  - ARO 根据传入的 `gradeId` 删除对应的成绩记录。
  - 删除前先在 `grades` 表中检查该记录是否存在，仅在存在时执行删除。
  - 删除时需同步删除 `grades_encrypted` 中同一 `id` 的加密记录。
- Responses 示例:
  - 200: `{ "ok": true, "message": "Grade Record Deleted Successfully" }`
  - 404: `{ "ok": false, "message": "Grade Record Not Found" }`
  - 403: `{ "ok": false, "message": "forbidden" }`


---

## 3. 纪律记录 /API/disciplinary-records（DRO）

（控制器仍在实现中，这里是目标接口设计。）

通用记录结构示例：
```json
{
  "id": "<uuid>",
  "studentId": "<uuid>",
  "staffId": "<uuid>",          // 记录操作者（DRO）
  "date": "2024-04-01",
  "description": "late submission",
  "penalty": "warning"
}
```

### GET /API/disciplinary-records
- Roles: `DRO`
- Query parameters（可选组合）:
  - `studentId`：按学生过滤
  - `staffId`：按处理人过滤
  - `date`：按日期过滤（例如 `2024-04-01`）
- Behavior:
  - 返回匹配条件的纪律记录列表。

### POST /API/disciplinary-records
- Roles: `DRO`
- Content-Type: `application/json`
- Request body:
```json
{
  "studentId": "<uuid>",
  "date": "2024-04-01",
  "description": "…",
  "penalty": "…"
}
```
- Behavior:
  - 创建新的纪律记录，`staffId` 由当前会话用户填充。

### PUT /API/disciplinary-records
- Roles: `DRO`
- Content-Type: `application/json`
- Request body:
```json
{
  "id": "<uuid>",
  "description": "…",
  "penalty": "…"
}
```
- Behavior:
  - 按 `id` 更新已有记录的描述 / 处罚内容等字段。

### DELETE /API/disciplinary-records
- Roles: `DRO`
- Query parameters:
  - `id`: 要删除的纪律记录 ID
- Behavior:
  - 按主键删除记录。

---

## 4. 成绩 + 纪律报告 /API/reports（student / guardian）

### GET /API/reports
- Roles: `student`, `guardian`
- Behavior:
  - `student`：返回当前学生自己的所有课程成绩 + 纪律记录；
  - `guardian`：根据 `guardian_id` 关联的所有学生，返回每个学生的成绩 + 纪律记录；
  - 结果中会去掉 `student_id` 等不必要字段，避免暴露多余信息。
- Responses（示例结构）:
```json
{
  "ok": true,
  "data": [
    {
      "grade": [ /* list of grade objects, without student_id */ ],
      "disciplinary": [ /* list of disciplinary objects, without student_id */ ]
    }
  ]
}
```

（`POST /API/reports` 目前与 GET 行为一致，仅为兼容性保留。）

---

## 5. 学生 / 监护人初始化接口（可按需要使用）

这些接口主要用于初始化测试数据或 DBA 工具；前端主流程不依赖它们。

### POST /API/students
- Roles: `ARO`, `DRO` 或 `DBA`（根据最终 RBAC 配置）
- Content-Type: `application/json`
- Request body:
```json
{
  "firstName": "Alice",
  "lastName": "Chan",
  "email": "alice@example.com",
  "mobile": "91234567",
  "gender": "M|F",
  "identificationNumber": "<string<=32>",
  "address": "<string<=255>",
  "enrollmentYear": 2024,
  "password": "<string>"           // 如果用于创建登录账户
}
```
- 典型响应：
  - 201: `{ "ok": true, "id": "<uuid>", "message": "student created" }`
  - 4xx/5xx: `{ "ok": false, "message": "…" }`

### POST /API/guardians
- Roles: `ARO`, `DRO` 或 `DBA`
- Content-Type: `application/json`
- Request body:
```json
{
  "firstName": "Bob",
  "lastName": "Lee",
  "email": "bob@example.com",
  "password": "<string>",
  "mobile": "91230000",
  "studentId": "<optional uuid>",
  "relation": "father|mother|other"
}
```
- 典型响应：
  - 201: `{ "ok": true, "id": "<uuid>", "message": "guardian created" }`

### POST /API/register
- 本项目最终设计中注册入口关闭。
- Responses:
  - 501: `{ "code": "NOT_IMPLEMENTED", "message": "register not available" }`
