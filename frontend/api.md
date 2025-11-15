# 内部 API 与加密传输协作说明（api.md）

本文档说明当前前端的单层内部 API（`/API/*`）与加密传输（RSA+AES+HMAC）如何工作，以及后端需要配合的具体事项。

## 总览
- 前端对所有内部接口统一采用混合加密：`AES-256-GCM` 加密业务明文；`RSA-OAEP` 加密 AES 密钥；额外使用 `HMAC-SHA256` 对明文计算签名增强完整性。
- 客户端先调用 `GET /API/public-key` 获取服务器公钥（PEM），随后向单层端点 `POST /API/<name>` 提交加密信封。
- 前端单层端点解密后，通过安全中继把明文请求转发到后端：`{NEXT_PUBLIC_API_URL}/API/<name>`。
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
  - `url = base + "/API" + <name> + (query)`
  - `method = 明文.method`
  - `body = 明文.body`（仅限 `POST`/`PUT`/`DELETE`）
- 前端会把后端的 `Set-Cookie` 原样透传给浏览器，并保留响应的 `content-type` 与状态码。

## 后端需要配合的事项（重点）
 - 接口实现（统一为 /API/*）：在后端实现以下接口并返回 `application/json`：
  - `POST /API/register`
  - `POST /API/login`
  - `POST /API/logout`
  - `GET /API/profile`、`PUT /API/profile`
  - `GET /API/students`、`POST /API/students`、`PUT /API/students`、`DELETE /API/students`
  - `GET /API/courses`、`POST /API/courses`、`PUT /API/courses`、`DELETE /API/courses`
  - `GET /API/enrollments`、`POST /API/enrollments`、`DELETE /API/enrollments`
  - `GET /API/grades`、`POST /API/grades`
  - `POST /API/reports`
  - `GET /API/admin/summary`
 - 认证 Cookie（JWT，由后端签发与校验）：
   - 名称：`auth`（前端 `COOKIE_NAME_AUTH`）。
   - 值：`<jwt>`（三段式 `header.payload.signature`，`payload` 建议包含 `email`、`role`、`name`、`exp` 等声明；`exp` 为秒）。
   - 选项建议：`httpOnly: true`、`sameSite: "lax"`、`secure: 按生产环境开启`、`path: "/"`、`domain: 前端页面域（或留空）`、`maxAge: 86400`。
   - 前端网关不解析也不校验 JWT，仅透传 Cookie 到后端；路由中间件仅用于导航展示可在不校验签名的前提下读取 `payload` 字段（非安全边界），实际权限控制由后端完成。
   - 登出时后端返回同名 Cookie，`maxAge=0` 清除。
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

## 后端需要做的事一览（落地细则）

1) 网关 HMAC 校验（首道防线，必做）（完成）
- 与前端共享同一 `GATEWAY_SHARED_SECRET`（强随机，至少 32 字节）。
- 校验请求头：
  - `X-Gateway-Signature-Alg: HMAC-SHA256`
  - `X-Gateway-Signature: <base64(hmac)>`
  - `X-Gateway-Timestamp: <ms>`（建议允许 ±300 秒时钟偏差）
  - `X-Gateway-Nonce: <随机字符串>`（建议做短期去重以抗重放）
- 规范化串（canonical）计算方式与前端一致：
  - `canonical = [method, pathWithQuery, bodyStringOrEmpty, String(timestamp), nonce].join("|")`
  - 例如登录：`"POST|/API/login|{...}|1690000000000|abc123"`
- 验证失败（缺任一头、算法不匹配、时间超窗、nonce 重复、HMAC 不一致）返回 `401/403`，并勿继续业务处理。

2) 认证与会话（JWT + Cookie）
- 签发 JWT：
  - 算法：`HS256`（共享密钥）或 `RS256`（私钥签名，公钥验签）。
  - `payload` 建议字段：`email`、`role`、`name`、`exp`（UNIX 秒）。
- 设置 Cookie：名称 `auth`，选项必须包含：
  - `HttpOnly=true`
  - `SameSite=Lax`（如需跨站嵌入才用 `None`，且必须同时 `Secure=true` 并使用 HTTPS）
  - `Secure`：生产环境开启；仅 HTTP 的开发环境可暂时关闭
  - `Path=/`；`Domain` 为空或指定前端页面域/根域
  - `Max-Age=86400`（按需调整）
- 登出：返回同名 Cookie，`Max-Age=0`（或 `Expires` 置过去时间）清除。
- 建议实现刷新令牌/会话轮换：缩短 `auth` 有效期，使用独立 `refresh` 令牌（可选，前端当前未依赖）。

3) CSRF 与方法约束
- 所有有状态操作只接受 `POST/PUT/DELETE`；`GET` 必须无副作用。
- 在 `SameSite=None` 或开放跨域场景下，增加：
  - 双提交或同步令牌的 CSRF 方案（`csrfToken`）
  - 校验 `Origin/Referer` 必须为可信前端域

4) 内容与协议约束
- 仅接受 `Content-Type: application/json` 的业务请求（拒绝 `text/html`/表单提交）。
- 统一返回 `application/json`，错误形如 `{ message, code? }`。
- 响应中如需设置多个 Cookie，请分别发送多个 `Set-Cookie` 头；并确保每个都带 `SameSite`/`Path`/`Secure` 等属性。

5) 监听与网络边界
- 后端服务监听 `127.0.0.1:3335` 或仅内网地址；不要对公网直接开放。
- 若置于反向代理（Nginx/Caddy）：
  - 透传自定义头：`X-Gateway-*`
  - 保留 `Set-Cookie` 原样；正确设置 `X-Forwarded-For`/`X-Forwarded-Proto`

6) 示例（伪代码：验证 HMAC，再读 JWT）
```
// canonical = method + "|" + pathWithQuery + "|" + (bodyStr or "") + "|" + timestamp + "|" + nonce
const secret = process.env.GATEWAY_SHARED_SECRET;
assert(req.headers['X-Gateway-Signature-Alg'] === 'HMAC-SHA256');
assert(Math.abs(nowMs - Number(req.headers['X-Gateway-Timestamp'])) <= 300_000);
assert(!nonceStore.has(req.headers['X-Gateway-Nonce'])); // 简易去重
const h = hmacSha256(secret, canonical).toBase64();
if (h !== req.headers['X-Gateway-Signature']) return 403;

// 通过后，读取 Cookie 并校验 JWT
const jwt = req.cookies['auth'];
const claims = verifyJwt(jwt, jwtKey);
// 继续业务逻辑...
```

7) 常见问题
- 浏览器不直接访问后端，因此后端无需开启 CORS（除非你允许浏览器直连后端，这在当前架构中不建议）。
- `SameSite=None` 必须配合 HTTPS 与 `Secure=true`，否则浏览器会拒收 Cookie。
- `Domain` 配置错误会导致 Cookie 写到错误域，浏览器不带回；建议留空由浏览器按当前域处理。
- 仅 HTTP 的开发环境无法保护 `Set-Cookie` 免受窃听，应尽快为前端启用 HTTPS/TLS。

## 单层端点与后端映射表
 - `POST /API/register` → 后端 `POST /API/register`
 - `POST /API/login` → 后端 `POST /API/login` √
 - `POST /API/logout` → 后端 `POST /API/logout`√
 - `GET /API/profile` → 后端 `GET /API/profile`√
 - `PUT /API/profile` → 后端 `PUT /API/profile`
 - `GET /API/students` → 后端 `GET /API/students`
 - `POST /API/students` → 后端 `POST /API/students`
 - `PUT /API/students` → 后端 `PUT /API/students`（`id` 随 body 提交）
 - `DELETE /API/students?id=...` → 后端 `DELETE /API/students?id=...`
 - `GET /API/courses` → 后端 `GET /API/courses`
 - `POST /API/courses` → 后端 `POST /API/courses`
 - `PUT /API/courses` → 后端 `PUT /API/courses`（`id` 随 body 提交）
 - `DELETE /API/courses?id=...` → 后端 `DELETE /API/courses?id=...`
 - `GET /API/enrollments` → 后端 `GET /API/enrollments`
 - `POST /API/enrollments` → 后端 `POST /API/enrollments`
 - `DELETE /API/enrollments?id=...` → 后端 `DELETE /API/enrollments?id=...`
 - `GET /API/grades` → 后端 `GET /API/grades`
 - `POST /API/grades` → 后端 `POST /API/grades`
 - `POST /API/reports` → 后端 `POST /API/reports`
 - `GET /API/admin-summary` → 后端 `GET /API/admin/summary`
 - `GET /API/disciplinary-records` → 后端 `GET /API/disciplinary-records`
 - `POST /API/disciplinary-records` → 后端 `POST /API/disciplinary-records`
 - `PUT /API/disciplinary-records` → 后端 `PUT /API/disciplinary-records`（`id` 随 body 提交）
 - `DELETE /API/disciplinary-records?id=...` → 后端 `DELETE /API/disciplinary-records?id=...`

## 前端封装参考
- 所有内部调用均通过 `frontend/lib/api.ts`，它会把 `path` 以加密方式投递到对应的单层端点。
- 统一入口 `secureRequest(path, { method, body })` 会组装加密信封并在服务端解密、转发。
- 公钥获取：`GET /API/public-key`（由前端路由提供；也可以改为从后端自有接口获取，再注入到前端）。

## API 角色许可与使用细则
- `POST /API/login`：公开；所有角色可登录
- `POST /API/logout`：公开；所有角色可调用；仅清理会话
- `GET /API/public-key`：公开；仅用于加密协作
- `GET /API/profile`：已登录用户可读；返回自身信息（只读）
- `PUT /API/profile`：已登录用户可读可改；仅能修改自身信息
- `GET/POST/PUT/DELETE /API/students`：`ARO`、`DRO` 可读可改；学生管理
- `GET/POST/PUT/DELETE /API/courses`：`ARO`、`DRO` 可读可改；课程管理
- `GET/POST/DELETE /API/enrollments`：`ARO`、`DRO` 可读可改；选课管理
- `GET /API/grades`：`student`、`guardian`、`ARO` 可读；成绩查询
- `POST /API/grades`：`ARO` 可读可改；成绩录入
- `POST /API/reports`：所有角色可读；生成报表（只读接口）
- `GET /API/admin-summary`：`ARO`、`DRO` 可读；管理摘要（只读）
- `GET/POST/PUT/DELETE /API/disciplinary-records`：`DRO` 可读可改；纪律记录管理

## 变更历史（与旧版差异）
- 路由前缀从旧版的 catch-all `/API/secure/*` 与 `/API/function/*` 改为单层 `/API/*`（接收加密）；后端同步采用 `/API/*` 前缀。
- 增加 `HMAC-SHA256` 完整性校验，服务端会在解密后校验签名与 GCM 标签。
- 公钥接口改为 `GET /API/public-key`，并支持通过环境变量注入静态密钥对。