# API

## POST /API/students
- Roles: `ARO`, `DRO`
- Content-Type: `application/json`
- Request body:
```
{
  "firstName": "Alice",
  "lastName": "Chan",
  "email": "alice@example.com",
  "mobile": "91234567",
  "gender": "M|F",
  "identificationNumber": "<string<=32>",
  "address": "<string<=255>",
  "enrollmentYear": 2024
}
```
- Responses:
  - 201: `{ ok: true, id: "<uuid>", message: "student created" }`
  - 400: `{ ok: false, message: "invalid fields" | "invalid phone" | "invalid address" | "invalid gender" | "invalid identification number" | "invalid enrollment year" }`
  - 409: `{ ok: false, message: "email exists" | "identification exists" }`
  - 500: `{ ok: false, message: "create failed" }`

## POST /API/guardians
- Roles: `ARO`, `DRO`
- Content-Type: `application/json`
- Request body:
```
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
- Behavior:
  - 创建监护人；如提供 `studentId` 和 `relation`，同时将该监护人与学生建立关联。
- Responses:
  - 201: `{ ok: true, id: "<uuid>", message: "guardian created" }`
  - 400: `{ ok: false, message: "invalid fields" | "invalid mobile" | "invalid relation" }`
  - 409: `{ ok: false, message: "email exists" }`
  - 500: `{ ok: false, message: "create failed" }`

## POST /API/register
- 公共路由已关闭
- Responses:
  - 501: `{ code: "NOT_IMPLEMENTED", message: "register not available" }`