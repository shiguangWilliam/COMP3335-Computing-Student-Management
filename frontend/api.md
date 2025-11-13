# 内部 API 与加密传输协作说明（api.md）

本文档说明当前前端的单层内部 API（`/API/*`）与加密传输（RSA+AES+HMAC）如何工作，以及后端需要配合的具体事项。

## 总览
- 前端对所有内部接口统一采用混合加密：`AES-256-GCM` 加密业务明文；`RSA-OAEP` 加密 AES 密钥；额外使用 `HMAC-SHA256` 对明文计算签名增强完整性。
- 客户端先调用 `GET /API/public-key` 获取服务器公钥（PEM），随后向单层端点 `POST /API/<name>` 提交加密信封。
- 前端单层端点解密后，通过安全中继把明文请求转发到后端：`{NEXT_PUBLIC_API_URL}/API/function/<name>`。
- 后端无需处理加密解密，只需实现原先的业务接口；认证 Cookie 通过前端中继透传给浏览器。

## 加密信封（客户端 → 前端）
- 外层结构（字段 Base64 编码）：
  - `encryptedKeyBase64`: 使用 RSA-OAEP 加密后的 32 字节 AES 密钥。
  - `ivBase64`: AES-GCM 12 字节 IV。
  - `ciphertextBase64`: 明文加密后的密文（不含 tag）。
  - `tagBase64`: AES-GCM 16 字节鉴别标签。
  - `sigBase64?`: 可选，`HMAC-SHA256`(key=原始 AES 密钥, data=明文 JSON)。
- 明文 JSON（被 AES 加密的内容）：
  - `method`: 真实 HTTP 方法（`GET`/`POST`/`PUT`/`DELETE`）。
  - `query?`: 查询参数对象（转发时拼接为 `?k=v`）。
  - `body?`: 请求体对象（非 GET 时转发为 JSON）。
  - `timestamp`: 客户端时间戳（毫秒）。
  - `nonce`: 随机字符串（防重放，前端可据此扩展风控）。

## 前端中继（前端 → 后端）
- 前端在对应的单层端点（如 `POST /API/login`）解密信封，得到上述明文 JSON；随后将请求转发到：
  - `base = NEXT_PUBLIC_API_URL || "http://127.0.0.1:3335"`
  - `url = base + "/API/function" + <name> + (query)`
  - `method = 明文.method`
  - `body = 明文.body`（仅限 `POST`/`PUT`/`DELETE`）
- 前端会把后端的 `Set-Cookie` 原样透传给浏览器，并保留响应的 `content-type` 与状态码。

## 后端需要配合的事项（重点）
- 接口实现（保持旧前缀）：在后端实现以下接口并返回 `application/json`：
  - `POST /API/function/register`
  - `POST /API/function/login`
  - `POST /API/function/logout`
  - `GET /API/function/profile`、`PUT /API/function/profile`
  - `GET /API/function/students`、`POST /API/function/students`、`PUT /API/function/students`、`DELETE /API/function/students`
  - `GET /API/function/courses`、`POST /API/function/courses`、`PUT /API/function/courses`、`DELETE /API/function/courses`
  - `GET /API/function/enrollments`、`POST /API/function/enrollments`、`DELETE /API/function/enrollments`
  - `GET /API/function/grades`、`POST /API/function/grades`
  - `POST /API/function/reports`
  - `GET /API/function/admin/summary`
- 认证 Cookie（与前端中间件兼容）：
  - 名称：`auth`（前端 `COOKIE_NAME_AUTH`）。
  - 值：`encodeURIComponent(JSON.stringify({ email, role, name, exp }))`。
  - 选项建议：`httpOnly: true`、`sameSite: "lax"`、`secure: 按生产环境开启`、`path: "/"`、`domain: 前端页面域（或留空）`、`maxAge: 86400`。
  - 登出时返回同名 Cookie，`maxAge=0` 清除。
- 公钥管理（用于前端解密中继）：
  - 生产环境请通过环境变量向前端服务注入 RSA 密钥对：
    - `SERVER_RSA_PUBLIC_PEM`：PEM 格式，`-----BEGIN PUBLIC KEY-----`。
    - `SERVER_RSA_PRIVATE_PEM`：PEM 格式，`-----BEGIN PRIVATE KEY-----`。
  - 未提供时，前端会在启动时生成临时密钥对（仅前端服务重启会更换）。
  - 若计划轮换密钥，请确保同一时刻前端公开的公钥与用于解密的私钥匹配，避免解密失败。
- 错误约定：
  - 建议后端以 JSON 返回错误信息（`{ message, code? }`）。
  - 未实现接口可返回 `{ code: "NOT_IMPLEMENTED" }` 搭配 `501/404`；前端会以可识别的「未实现」提示处理。
- 安全与部署：
  - `NEXT_PUBLIC_API_URL` 指向后端地址（例如 `http://localhost:3335`）。前端与后端之间的通信应使用内网或受信任的 TLS。
  - 浏览器侧只与前端同源交互，避免了跨域；但后端设置的 Cookie `domain` 必须适用于前端页面域，避免浏览器拒收。
  - 公钥首次获取需在 HTTPS 下进行，以降低首次信任阶段的中间人风险；可结合证书固定或预置公钥进一步增强。

## 单层端点与后端映射表
- `POST /API/register` → 后端 `POST /API/function/register`
- `POST /API/login` → 后端 `POST /API/function/login`
- `POST /API/logout` → 后端 `POST /API/function/logout`
- `GET /API/profile` → 后端 `GET /API/function/profile`
- `PUT /API/profile` → 后端 `PUT /API/function/profile`
- `GET /API/students` → 后端 `GET /API/function/students`
- `POST /API/students` → 后端 `POST /API/function/students`
- `PUT /API/students` → 后端 `PUT /API/function/students`（`id` 随 body 提交）
- `DELETE /API/students?id=...` → 后端 `DELETE /API/function/students?id=...`
- `GET /API/courses` → 后端 `GET /API/function/courses`
- `POST /API/courses` → 后端 `POST /API/function/courses`
- `PUT /API/courses` → 后端 `PUT /API/function/courses`（`id` 随 body 提交）
- `DELETE /API/courses?id=...` → 后端 `DELETE /API/function/courses?id=...`
- `GET /API/enrollments` → 后端 `GET /API/function/enrollments`
- `POST /API/enrollments` → 后端 `POST /API/function/enrollments`
- `DELETE /API/enrollments?id=...` → 后端 `DELETE /API/function/enrollments?id=...`
- `GET /API/grades` → 后端 `GET /API/function/grades`
- `POST /API/grades` → 后端 `POST /API/function/grades`
- `POST /API/reports` → 后端 `POST /API/function/reports`
- `GET /API/admin-summary` → 后端 `GET /API/function/admin/summary`

## 前端封装参考
- 所有内部调用均通过 `frontend/lib/api.ts`，它会把 `path` 以加密方式投递到对应的单层端点。
- 统一入口 `secureRequest(path, { method, body })` 会组装加密信封并在服务端解密、转发。
- 公钥获取：`GET /API/public-key`（由前端路由提供；也可以改为从后端自有接口获取，再注入到前端）。

## 变更历史（与旧版差异）
- 路由前缀从旧版的 catch-all `/API/secure/*` 与 `/API/function/*` 改为单层 `/API/*`（接收加密）；对后端仍保持 `/API/function/*` 不变。
- 增加 `HMAC-SHA256` 完整性校验，服务端会在解密后校验签名与 GCM 标签。
- 公钥接口改为 `GET /API/public-key`，并支持通过环境变量注入静态密钥对。