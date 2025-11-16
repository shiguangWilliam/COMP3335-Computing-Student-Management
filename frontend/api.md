# 安全设计与内部 API 通道说明（api.md）

本文只描述本项目的安全策略和 `/API/*` 内部通道设计，不再逐条列业务接口。核心目标：

- 浏览器到 Next.js 前端之间：机密数据始终通过混合加密通道传输，防止窃听与篡改。
- Next.js 前端到 Java 后端之间：通过 HMAC + nonce + time window 防止伪造与重放。
- 后端内部：基于 session 的 RBAC、URI 路由表控制访问，再结合全程参数化 SQL 防止 SQL 注入。

---

## 一、前端混合加密通道（浏览器 ⇄ Next.js）

### 1.1 RSA + AES + HMAC 信封

浏览器端不会直接把明文业务 JSON 发送到 `/API/*`，而是经过以下步骤：

1. 浏览器调用 `GET /API/public-key`（Next 路由 `frontend/app/API/public-key/route.ts`），获取前端服务器的 RSA 公钥 `publicKeyPem`。  
2. 前端 JS（`frontend/lib/secureApi.ts`）：
   - 使用 WebCrypto 生成随机 `AES-256-GCM` 密钥和 12 字节 IV；
   - 用 AES‑GCM 加密业务 JSON（包括 `method` / `query` / `body` / `timestamp` / `nonce` 等）；
   - 用服务器的 RSA 公钥（RSA‑OAEP + SHA‑256）加密 AES 密钥；
   - 追加一个 `HMAC‑SHA256` 签名（key = AES 密钥，data = 明文 JSON）作为可选完整性校验；
   - 构造加密信封：
     ```json
     {
       "encryptedKeyBase64": "...",   // RSA(OAEP, AES-Key)
       "ivBase64": "...",             // AES-GCM IV
       "ciphertextBase64": "...",     // 密文 (不含 tag)
       "tagBase64": "...",            // GCM tag
       "sigBase64": "..."             // 可选 HMAC(AES-Key, 明文)
     }
     ```
3. 浏览器将此信封作为 JSON `POST` 到对应的 Next.js API 路由，例如：
   - `POST /API/login`
   - `POST /API/grades`
   - `POST /API/disciplinary-records`
   - 等等。

Next 端对应处理逻辑在：

- `frontend/lib/cryptoServer.ts:decryptHybridJson`：  
  - 使用服务器 RSA 私钥解密 AES 密钥；  
  - 使用 AES‑GCM 解密业务 JSON；  
  - 若提供 `sigBase64`，使用 AES 密钥进行 HMAC 验证，防止中间人篡改信封内容。

### 1.2 加密响应（可选）

如有需要，前端还支持“前端回包再加密”的模式：

- 浏览器在发起请求时可附带 `clientPublicKeyPem`（包含在被 AES 加密的明文 JSON 内）。  
- Next 的中继层（`frontend/lib/secureProxy.ts:relaySecure`）在拿到后端 JSON 响应后：
  - 生成一把新的 AES 密钥和 IV；
  - 使用客户端公钥 RSA‑OAEP 加密该 AES 密钥；
  - 使用 AES‑GCM 加密响应 JSON，并生成 GCM tag；
  - 按同样格式构造一个响应信封 `{ encryptedKeyBase64, ivBase64, ciphertextBase64, tagBase64, sigBase64 }` 返回浏览器。  
- 浏览器使用本地保存的 RSA 私钥解密响应信封，拿到 JSON 数据。

在你当前实现中，普通 API（成绩、纪律等）可以只使用“请求加密 + 响应明文 JSON”的模式，而对特别敏感的接口可以启用“请求 + 响应都加密”的模式。

---

## 二、Session 设计与 sid 信息隐藏

### 2.1 会话标识：sid Cookie

登录时（`AuthController.login`）：

- 后端根据账号密码校验通过后，创建 `Session` 对象（`SessionStore.create(claims)`），内含：
  - `userId`
  - `email`
  - `role`（student / guardian / ARO / DRO / DBA）
  - `expiresAt` 等信息
- 为该会话生成一个不可预测的随机会话 ID（sid），并写入 Cookie：

  ```http
  Set-Cookie: sid=<随机SID>; Path=/; HttpOnly; SameSite=Lax; Max-Age=<ttl>
  ```

安全性质：

- `sid` 本身不包含任何明文用户信息或角色信息，仅是一个随机标识；  
- 用户的角色、邮箱等只存储在服务端 SessionStore / 数据库中，通过 `sid` 查表获取；  
- 浏览器或攻击者即使拿到 sid 值，也无法单独从该值分析出用户身份或权限信息（防止会话信息泄露）。

### 2.2 会话检查：SessionFilter

后端的 `SessionFilter`（`src/app/SessionFilter.java`）在 HMAC 层之后执行：

- 使用 `URIRouteTable.isPublic(method, uri)` 判断是否公共路由：
  - `/API/login`, `/API/logout`, `/API/public-key` 等公共路由跳过 session 检查。
- 非公共路由：
  - 从 Cookie 中读取 `sid`，如果缺失或为空 → `401 unauthorized: missing sid`；
  - 使用 `SessionStore.get(sid)` 查找会话，如果不存在或已过期 → `401 unauthorized`；
  - 检查 `session.isExpired()`，过期则拒绝；
  - 验证通过后，将 `Session` 对象通过 `request.setAttribute("session", session)` 注入，后续 Controller 通过 `request.getAttribute("session")` 拿到当前用户信息。

这样可以保证：业务代码只信任服务端 Session 中的信息，而不是任何来自客户端的“角色字段”。

---

## 三、后端三层网关：HMAC + Cookie + 路由控制

Java 后端入口处按顺序叠加了三层安全网关：

1. **HMAC 签名校验层（HmacAuthFilter）**  
2. **Session / Cookie 校验层（SessionFilter）**  
3. **基于 URI 的角色路由控制（URIRouteTable）**

### 3.1 HMAC 层：请求完整性 + Anti-Replay

HMAC 签名由 Next.js 中继层计算（`frontend/lib/secureProxy.ts:relaySecure`）：

- 共享密钥：`GATEWAY_SHARED_SECRET`（存放在前后端的环境变量中）。
- 规范化字符串（canonical string）格式：

  ```text
  canonical = [
    HTTP_METHOD,              // GET / POST / PUT / DELETE
    PATH_WITH_QUERY,          // e.g. /API/grades?studentId=...
    BODY_JSON_STRING_OR_EMPTY,// 请求体 JSON 字符串，GET 时为空字符串
    TIMESTAMP_MS,             // 发送时的毫秒时间戳
    NONCE                     // 随机字符串
  ].join("|")
  ```

- HMAC 计算：

  ```text
  signature = Base64( HMAC-SHA256( canonical, GATEWAY_SHARED_SECRET ) )
  ```

- 中继请求时附带头：
  - `X-Gateway-Signature-Alg: HMAC-SHA256`
  - `X-Gateway-Signature: <Base64(signature)>`
  - `X-Gateway-Timestamp: <timestamp>`
  - `X-Gateway-Nonce: <nonce>`

后端 `HmacAuthFilter`（`src/app/HmacAuthFilter.java`）的核心校验逻辑：

- 跳过 `GET /API/public-key`（无需 HMAC）。  
- 检查上述 4 个头是否齐全，算法是否为 `HMAC-SHA256`。  
- 时间窗口校验：
  - 将 `X-Gateway-Timestamp` 转为 long，与当前时间对比；
  - 超出允许窗口（例如 ±5 分钟）则拒绝，防止长时间重放。  
- Nonce 去重防重放：
  - 使用 Caffeine Cache 维护一个短期的 nonce 集合（TTL 5 分钟）；
  - 若同一个 nonce 再次出现，则视为重放攻击，直接拒绝。  
- 重构 canonical 字符串，重新计算 HMAC，并与传入签名做常数时间比较：
  - 若不同，返回 HTTP 401 并记录审计日志。

这样可以保证：

- 只有由受信任的 Next 前端、且使用正确共享密钥与时间窗口的请求才会被后端接受；
- 即使攻击者窃听到加密后的请求包，也无法在有效窗口外重放成功。

### 3.2 Session / Cookie 校验层：身份与会话

如上文第二节，`SessionFilter` 确保所有非公共接口都必须带有有效 sid Cookie，并对应一个未过期的 Session 对象：

- 防止绕过登录直接访问内部 API；
- 防止使用过期 / 伪造 sid。

### 3.3 路由控制层：基于 URI + HTTP 方法的 RBAC

`URIRouteTable`（`src/app/URIRouteTable.java`）维护了一张简单的访问控制表：

- key：`METHOD|/API/path`，例如：
  - `"GET|/API/profile"`
  - `"POST|/API/grades"`
  - `"GET|/API/disciplinary-records"`
- 值：允许访问该路由的角色数组，例如：
  - `GET /API/profile` → `student, guardian, ARO, DRO`
  - `POST /API/grades` → `ARO`
  - `GET /API/disciplinary-records` → `DRO`

同时还维护了 `publicRoutes` 集合，用于标记无需登录的路由：

- `POST /API/login`
- `POST /API/logout`
- `GET /API/public-key`
  等。

网关使用流程（逻辑层面）：

1. HMAC 验证通过后，SessionFilter 注入 `session`。  
2. 业务代码（或专门的授权过滤器）调用 `URIRouteTable.rolesFor(method, path)` 获取允许的角色列表。  
3. 如果当前会话角色不在该列表中，则拒绝访问（403），并记录审计日志。

这样形成一个简单但清晰的“按路由 + 方法 + 角色”的 RBAC 网关。

---

## 四、防重放机制：timestamp + nonce + 短期缓存

防重放逻辑主要集中在 HMAC 层：

- **时间窗口**：`X-Gateway-Timestamp` 与当前时间差超出设定窗口时（例如 5 分钟）请求无效。  
- **Nonce 缓存**：使用 Caffeine Cache 存储最近使用过的 nonce（TTL 与时间窗口一致），任何重复的 nonce 都会立即被拒绝。

结合混合加密通道的 `timestamp` / `nonce` 字段，前后端在逻辑上都保持了请求的时效性与唯一性，防止录播重放攻击。

---

## 五、防 SQL 注入：参数化 SQL

所有数据库访问都通过 `src/service/DBConnect.java` 进行：

- `executeQuery(String sql, String[] params)` 与 `executeUpdate(String sql, String[] params)` 均使用 `PreparedStatement`：

  ```java
  try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
      for (int i = 0; i < params.length; i++) {
          pstmt.setString(i + 1, params[i]);
      }
      // 执行查询或更新
  }
  ```

特征：

- SQL 模板与参数严格分离：`sql` 中只包含 `?` 占位符，实际值通过 `setString` 绑定；  
- 即使攻击者在前端输入中注入 `' OR 1=1 --` 这类 payload，也只会被当作普通字符串插入字段，不会改变 SQL 结构；  
- 所有控制器（登录、profile 更新、成绩管理、纪律记录等）都复用了这一套参数化访问模式。

---

## 六、小结：整体安全链路

从浏览器到数据库的一条成功请求链路，必须同时通过：

1. **浏览器 → Next**：混合加密信封（RSA + AES‑GCM + HMAC）。  
2. **Next → Java**：HMAC + timestamp + nonce 防伪造、防重放。  
3. **Java 会话层**：sid Cookie + SessionStore 验证身份与会话有效性。  
4. **Java 路由层**：URIRouteTable 按 URI + 方法 + 角色做访问控制。  
5. **数据库访问层**：统一参数化 SQL，抵御 SQL 注入。

在此基础上，再结合审计日志（多数敏感操作都会写 `AuditUtils.pack(...)` 日志行），可以比较完整地满足 Project.pdf 中关于“数据加密、安全访问控制、防 SQL 注入、日志记录”的安全要求。 

---

## TODO / 后续改进计划

为进一步对齐 Project.pdf 的细节要求，并在报告中有更强的说服力，建议在后续开发 / 部署中完成以下 TODO：

1. **URI 路由表与角色映射确认**  
   - 系统性梳理 `URIRouteTable` 中每个 `METHOD|/API/path` 的角色列表，与实际 Controller 中的 `session.getRole()` 检查逻辑逐条对照，确保不存在“表放开但代码未检查”或反之的情况。  
   - 再次核对 Next 中间件 `frontend/proxy.ts` 的页面访问限制，保证前端页面层的角色限制与后端路由控制一致。

2. **部署层启用 HTTPS / 反向代理**  
   - 在实际部署时，通过 Nginx / Apache / Cloud 代理为 Next 和 Java 服务提供 HTTPS 入口，防止中间人窃听与篡改（即便有应用层加密，也建议 TLS 作为基础防护）。  
   - 文档中说明：浏览器只通过 HTTPS 访问前端域名，反向代理只将 HTTPS 请求转发给 Next / Java 内部端口，并限制直接 HTTP 暴露。

3. **数据库中敏感列的加密（TDE 或 AES\_ENCRYPT）**  
   - 针对 `*_encrypted` 表中的敏感列（如 `password_hash`、`identification_number`、`address`、`grade`、`comments` 等），在数据库层开启实际加密方案：  
     - 方案 A：使用 Percona TDE 对这些表所在的 tablespace 进行透明加密，密钥由 Percona/OS 层管理；  
     - 方案 B：在插入/更新时使用 MySQL 的 AES\_ENCRYPT 等函数对字段加密，AES 密钥放在配置文件或安全硬盘，而不是数据库内。  
   - 在 SQL 脚本和报告中明确：哪些字段被加密、选用的方案、密钥存放位置及其备份/轮换策略。

4. **密码哈希加盐与 KDF 强化**  
   - 在已有 SHA3‑256 Hash 的基础上进一步增强：  
     - 为每个用户生成高熵随机 salt（例如 16–32 字节），与 `password_hash` 一起存放在 `*_encrypted` 表中；  
     - 使用 `hash = SHA3-256(salt || password)` 或更好的方案（如 PBKDF2+SHA3、bcrypt、Argon2 等）替换单轮哈希，使暴力破解成本显著提高。  
   - salt 本身不是秘密，但将其放在启用 TDE 或行级加密的表中，可以减少泄露风险；在报告中说明这一点。

5. **安全配置与实现的一致性自检**  
   - 对每条关键安全链路（登录、成绩管理、纪律管理、报表等）做一次端到端自测，确认：  
     - HMAC 头在 Next → Java 全路径上始终存在且校验通过；  
     - 非 public 的 `/API/*` 没有 sid 时必然被拒绝；  
     - URIRouteTable 中未授权的角色无法通过任何路径调用对应接口。  
   - 若未来新增 API，需要同步更新：Next 前端（路由 + 中间件）、URIRouteTable、SessionFilter/Controller 内的角色判断。

6. **报告中的安全架构说明与示意图**  
   - 在报告中补充一小节《Security Design》，配一张简单的时序图或架构图，展示：  
     - Browser → Next（混合加密信封）；  
     - Next → Java（HMAC + sid）；  
     - Java → DB（PreparedStatement + 数据库存储加密）。  
   - 用简短文字对照 Project.pdf 的“敏感数据加密 / 访问控制 / SQL 注入防护 / 日志”四个维度，说明当前实现与 TODO 的覆盖情况。

