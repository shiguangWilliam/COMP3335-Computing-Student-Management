# 后端（Spring Boot + Maven）傻瓜式使用指南

适用于 Windows，已内置 Maven Wrapper（无需安装 Maven）。只看“一分钟启动”即可跑起来。

## 一分钟启动
- 在项目根目录打开终端：`C:\...\COMP3335-Computing-Student-Management`
- 启动开发服务器：`.\mvnw spring-boot:run`
- 打开浏览器：`http://localhost:3335/`（没有接口时看到 404 也表示服务已启动）

## 打包运行
- 构建可运行 Jar：`.
mvnw -U clean package`
- 运行 Jar：`java -jar target\comp3335-0.0.1-SNAPSHOT.jar`

## 必备环境
- 安装 JDK 21（OpenJDK/Adoptium/Oracle 均可）
- 验证：`java -version` 应显示 `21`（或兼容版本）
- 无需安装 Maven，直接使用仓库中的 `mvnw` 即可

## 配置说明
- 端口：在 `src/main/resources/application.properties` 中设置
  - `server.port=3335`
- 数据库（MySQL）：准备好后添加以下配置并删除临时禁用行
  - 添加：
    - `spring.datasource.url=jdbc:mysql://<host>:<port>/<db>?useSSL=false&serverTimezone=UTC`
    - `spring.datasource.username=<your_user>`
    - `spring.datasource.password=<your_password>`
  - 删除：`spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration`

## 目录结构（核心）
- `src/main/java/Application.java`（启动类）
- `src/main/java/http/`（控制器/路由）
- `src/main/java/service/`（服务层）
- `src/main/java/repository/`（数据访问层，后续可加）
- `src/main/java/users/`（领域模型/实体）
- `src/main/java/utils/`（工具类）
- `src/main/resources/application.properties`（配置）

## 在 IntelliJ IDEA（社区版）中使用
- 直接用 `Open` 打开项目目录，IDE 会识别 `pom.xml`
- 在右侧 Maven 面板点击刷新（Load Maven Changes）
- Project Structure → SDK 选择 `JDK 21`
- 运行：找到 `Application` 的运行配置或使用 Maven 面板的 `spring-boot:run`

## 常见问题（快速排查）
- 依赖下载慢或失败：新增用户级 `settings.xml` 启用国内镜像
  - 路径：`%USERPROFILE%\.m2\settings.xml`
  - 内容示例：
    ```xml
    <settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">
      <mirrors>
        <mirror>
          <id>aliyun</id>
          <name>Aliyun Maven</name>
          <url>https://maven.aliyun.com/repository/public</url>
          <mirrorOf>*</mirrorOf>
        </mirror>
      </mirrors>
    </settings>
    ```
- 提示 `JAVA_HOME not found`：系统环境变量设置 `JAVA_HOME` 指向 JDK 安装目录（例如 `C:\Program Files\Java\jdk-21`），并把 `%JAVA_HOME%\bin` 加入 `PATH`
- 端口被占用：修改 `application.properties` 中的 `server.port`
- 本地 `lib/mysql-connector-j-*.jar` 冲突：不要手动引入本地 Jar；使用 `pom.xml` 的 Maven 依赖即可（必要时在 IDE 中移除 `.idea/libraries/lib.xml` 的本地库引用）

## 有用命令
- 查看 Maven Wrapper 版本：`.
mvnw -v`
- 只编译不运行：`.
mvnw clean compile`
- 查看依赖树：`.
mvnw dependency:tree`

## 说明
- 项目已配置 Spring Boot 主类为 `Application`，`spring-boot-maven-plugin` 会在打包时自动生成可运行的 Jar。
- 首次开发阶段如果还未配置数据库，已临时禁用了数据源自动配置，等你补齐数据库配置后删掉对应行即可。

## 数据库部署（Windows + Docker）

下面步骤可直接在 PowerShell 中复制粘贴，最终会启动一个启用 Keyring 的 Percona Server 并自动执行 `init_database.sql`。

1. **准备工具**
   - 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - 打开 PowerShell，切换到项目根目录：`cd D:\Homework\COMP3335\Project`
2. **创建持久化目录与配置**
   ```powershell
   if(!(Test-Path docker)){New-Item -ItemType Directory docker | Out-Null}
   if(!(Test-Path docker\data)){New-Item -ItemType Directory docker\data | Out-Null}
   if(!(Test-Path docker\keyring)){New-Item -ItemType Directory docker\keyring | Out-Null}
   if(!(Test-Path docker\my.cnf)){
@"
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/keyring/keyring
"@ | Set-Content -Encoding UTF8 docker\my.cnf
   }
   ```
   > 如果 `docker\my.cnf` 已存在，请确认内容同上
3. **启动容器（第一次会自动初始化数据库）**
   ```powershell
   docker run `
     --name comp3335-db `
     -p 3306:3306 `
     -p 33060:33060 `
     -e MYSQL_ROOT_PASSWORD=!testCOMP3335 `
     -e MYSQL_DATABASE=COMP3335 `
     -v ${PWD}\docker\data:/var/lib/mysql `
     -v ${PWD}\docker\keyring:/keyring `
     -v ${PWD}\init_database.sql:/docker-entrypoint-initdb.d/init_database.sql `
     percona/percona-server:latest `
     --early-plugin-load=keyring_file.so `
     --keyring_file_data=/keyring/keyring
   ```
   - 初次运行日志出现 `MySQL init process done` 即表示成功
   - 若需重置数据库：`docker rm -f comp3335-db`，然后清空 `docker\data`、`docker\keyring` 再重新运行上述命令
   - **自动脚本**：运行 `.\scripts\setup-percona.ps1`（加 `-ResetData` 参数可在重启前清空数据）
4. **验证状态**
   ```powershell
   docker ps --filter "name=comp3335-db"
   docker exec -it comp3335-db mysql -uroot -p!testCOMP3335 -e "SHOW DATABASES;"
   ```
5. **后端连接**
   - JDBC：`jdbc:mysql://localhost:3306/COMP3335`
   - 用户：`root`
   - 密码：`!testCOMP3335`
   - 如需使用 Spring DataSource，参考前文“配置说明”中的 `spring.datasource.*`
6. **常见问题**
   - `Encryption can't find master key`：确保 `--early-plugin-load` 与 `--keyring_file_data` 参数存在，且 `docker\keyring` 目录已挂载
   - 端口冲突：将 `-p 3306:3306` 改为其他端口（例如 `-p 3307:3306`），并同步修改应用配置

## 写入默认测试账号

项目提供 `scripts.TestAccountSeeder` 用于把默认账号（student / guardian / ARO / DRO / DBA）写入数据库：

```powershell
mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder
```

- 多次运行会跳过已存在的邮箱
- Guardian 账号会自动与 student 账号建立监护关系
 - 会一并创建示例课程（CS101/MATH201/SEC301）及对应成绩、纪律记录
- 如需彻底重置，可配合 `scripts/setup-percona.ps1 -ResetData`

# API 文档

本文件描述 `src/http` 提供的 `/API/*` 端点、传输加固方式以及与 `frontend` 目录中 Next.js 客户端的实际约定。安全信封与更细的实现细节也可以参考 `frontend/api.md`。

## 1. 安全信道与鉴权机制

### 1.1 HMAC 网关校验（`src/app/HmacAuthFilter.java`）

- 所有非公开接口都必须附带以下请求头：
  - `X-Gateway-Signature-Alg: HMAC-SHA256`
  - `X-Gateway-Signature`: 对规范化字符串的 HMAC-SHA256，Base64 编码。
  - `X-Gateway-Timestamp`: 毫秒级时间戳，允许 ±300 秒窗口。
  - `X-Gateway-Nonce`: 5 分钟内唯一的随机字符串；服务端用 Caffeine cache 拒绝重放。
- 规范化字符串为：`METHOD|/API/path[?query]|bodyJson|timestamp|nonce`。
- 校验失败直接返回 401/403，并不会进入后续控制器。

### 1.2 RSA + AES 混合信封（`frontend/lib/secureApi.ts` + `src/http/PublicKeyController.java`）

1. 客户端首先 `GET /API/public-key` 拿到服务端 RSA-OAEP 公钥（目前硬编码）。
2. 每次 API 调用时生成随机 AES-256-GCM 密钥 + 12 byte IV，对 `{ method, query, body, timestamp, nonce }` 序列化结果加密。
3. AES 密钥再用 RSA 公钥封装，附加可选 `sigBase64 = HMAC(AES key, 明文 JSON)`，一并 POST 到对应 `/API/*`。
4. 服务器在网关层解密明文再转交实际控制器；响应可选择明文或再次用客户端公钥加密。

> 目前客户端只对请求体进行强制加密；返回值默认明文 JSON。`frontend/lib/secureProxy.ts` 保留了双向加密的可选实现。

### 1.3 Session Cookie 与 RBAC（`src/app/SessionFilter.java`, `RoleAuthFilter.java`, `URIRouteTable.java`）

- `POST /API/login` 成功后，通过 `Set-Cookie: sid=<uuid>; Path=/; HttpOnly; SameSite=Lax` 建立会话，所有受保护接口都依赖该 cookie。
- `SessionFilter` 会拒绝缺少或过期的 `sid`，并把 `Session` 对象挂在 `request` 上。
- `RoleAuthFilter` 根据 `URIRouteTable` 里的 `(method,path)->roles` 映射做 RBAC 判断；未登记的路由会被直接 403 拒绝，即便控制器存在。
- `POST /API/logout` 或密码修改会显式作废 `sid`。

## 2. 接口状态速览

### 2.1 主表（Project.pdf 要求的最小实现）

| Endpoint | 控制器 | 当前状态 / 备注 |
| --- | --- | --- |
| `GET /API/public-key` | `src/http/PublicKeyController.java` | 返回硬编码 RSA 公钥 PEM。 |
| `POST /API/login` | `AuthController` | 校验邮箱+SHA3-256 哈希；可选 `role`。 |
| `POST /API/logout` | `LogoutController` | 释放 `sid`，下发过期 cookie。 |
| `GET /API/profile` | `ProfileController` | 根据会话角色返回白名单字段。 |
| `PUT /API/profile` | `ProfileController` | 仅允许角色各自的有限字段；字段校验严格。 |
| `PUT /API/modified_Passowrd` | `ProfileController` | 校验旧密码后写入 `password_hash` 并强制登出。 |
| `GET /API/students` | `StudentController` | 允许 ARO/DRO 查看所有或按 email 精确查询。 |
| `GET /API/grades` | `GradeController` | 需要 **同时** 提供 `studentId` 和 `courseId`；返回 `{ ok,data:[...] }`。 |
| `POST /API/grades` | `GradeController` | 期望 `grade` 为数值，无法接受 “A-” 等字母评分。 |
| `DELETE /API/grades` | `GradeController` | 依据 `gradeId` 删除。 |
| `GET /API/disciplinary-records` | `DisciplinaryController` | 只有方法骨架，尚未查询 / 返回任何数据。 |
| `POST/PUT/DELETE /API/disciplinary-records` | —— | 完全未实现，但前端 `frontend/lib/api.ts` 仍会调用。 |
| `GET/POST /API/reports` | `ReportController` | 针对 student/guardian；依赖 `tables.Grades/Disciplinary`，目前因表名错误而抛异常。 |


### 2.2 可选表（模拟 DBA / 系统管理员职责，可按需要启用）

| Endpoint | 控制器 / 状态 | 说明 |
| --- | --- | --- |
| `POST /API/students` | `StudentController`（被 `URIRouteTable` 拦截） | 控制器存在但路由未放行，若需开放需补 RBAC。 |
| `PUT /API/students` | `StudentController` | 直接返回 501 `NOT_IMPLEMENTED`。 |
| `POST /API/guardians` | `GuardianController`（被 `URIRouteTable` 拦截） | 缺少 Session/RBAC 校验且路由未放行。 |
| `GET /API/guardians` | —— | 无实现；仅在路由表登记。 |
| `/API/dba/students`, `/API/dba/guardians` | —— | 仅存在于前端的占位路由，后端完全没有实现。 |
| `POST /API/register` | `RegisterController` | 恒定 501，响应 `{ "ok": false, "message": "No implement" }`。 |

## 3. 接口细节

### 3.1 公共/会话接口

#### `GET /API/public-key`
- 角色：公开。
- 响应：`{ "publicKeyPem": "-----BEGIN PUBLIC KEY-----..." }`。
- 用途：混合加密信封的服务器端公钥来源。

#### `POST /API/login`
- 角色：公开。
- 请求 JSON：`{ "email": "<必填>", "password": "<必填>", "role": "student|guardian|ARO|DRO" }`，其中 `role` 仅用于 UI 选择用户名，后端仍会根据邮箱所在表决定最终角色。
- 行为：按 `students_encrypted / guardians_encrypted / staffs_encrypted` 顺序查找邮箱+`password_hash`；成功后写入 `SessionStore`，返回 `{ "ok": true, "message": "login accepted, session created" }` 并设置 `sid`。
- 失败：邮箱格式非法 400，凭证不匹配 401，日志会记录掩码邮箱。

#### `POST /API/logout`
- 角色：任何已登录角色。
- 行为：读取 Cookie 中的 `sid`，调用 `SessionStore.invalidate`，然后写回过期 cookie。响应 `{ "ok": true, "message": "logged out" }`。

#### `GET /API/profile` / `PUT /API/profile`
- 角色：`student | guardian | ARO | DRO`。
- GET：`ProfileController` 会调用对应 `users.*` 类查询基本信息 + 加密信息，然后删除敏感字段；不同角色只看到各自白名单字段（例如 guardian 只能看姓名、邮箱、手机）。
- PUT：允许更新 `firstName/lastName/email/mobile/address`（以及 staff 的 `department`），每个字段都先用 `utils.ParamValid` 校验；写入时由 `users.User.updateInfo` 自动拆分到普通/加密表。

#### `PUT /API/modified_Passowrd`
- 角色：`student | guardian | ARO | DRO`。
- 请求：`{ "oldPassword": "...", "newPassword": "..." }`，新密码必须符合 `ParamValid.isValidPassword`。
- 行为：二次校验旧密码后把 `password_hash` 更新为 SHA3-256，新密码成功后立刻失效当前会话并清理 cookie。

### 3.2 学生 / 监护人管理

#### `GET /API/students`
- 角色：`ARO`, `DRO`。
- 查询参数：可选 `email`（必须为合法邮箱），不传则返回全部学生。
- 响应：数组形式 `[ { "id", "firstName", "lastName", "email", "mobile", "gender", "identificationNumber", "address", "enrollmentYear" }, ... ]`。

#### `POST /API/students`
- 角色：理论上 `ARO`, `DRO`；**但由于 `URIRouteTable` 未登记 POST `/API/students`，请求在到达控制器前就被 403 拒绝**。
- 逻辑（若绕过过滤器）：校验所有字段、检查邮箱/证件唯一性，写入 `students` + `students_encrypted`，密码会被 SHA3-256。

#### `PUT /API/students`
- 角色：同上，当前实现直接返回 501 `{ "ok": false, "message": "NOT_IMPLEMENTED" }`。

#### `POST /API/guardians`
- 控制器缺乏 Session 校验 & 角色判断，且由于 `URIRouteTable` 同样没有 POST `/API/guardians`，目前任何请求都会在过滤器层被拒绝。需要在路由表登记并补上 RBAC/会话逻辑后才能投入使用。
- 预期 payload：`{ firstName, lastName, email, password, mobile?, studentId?, relation? }`，成功后写入 `guardians` 与 `guardians_encrypted`，可选地回填 `students_encrypted.guardian_id`。

#### `GET /API/guardians`
- 无控制器实现；`URIRouteTable` 的 GET 配置目前只是占位。

### 3.3 成绩管理（`src/http/GradeController.java`）

- `GET /API/grades`：
  - 角色：`ARO`。
  - Query：必须同时提供 `studentId` 与 `courseId`，缺任一字段即 400。
  - 响应：`{ "ok": true, "data": [ { "id","student_id","course_id","term","grade","comments" } ] }`。注意未包含 `course_name`，也没有分页。
- `POST /API/grades`：
  - 角色：`ARO`。
  - 请求：`{ "studentId", "courseId", "grade", "term"?, "comments"? }`，其中 `grade` 被解析为 `Float`，若传入 `"A-"` 会触发 `NumberFormatException` 并返回 500。
  - 行为：若尚无记录则写入 `grades` + `grades_encrypted`，否则只更新加密表中的 `grade/comments`。
- `DELETE /API/grades`：
  - 角色：`ARO`。
  - 请求体：`{ "gradeId": "<id>" }`。
  - 行为：确保记录存在后先删加密表，再删主表。

### 3.4 纪律记录管理

- `GET /API/disciplinary-records`：`DisciplinaryController` 只创建了方法签名（需要 `studentId` + `date`），既没有 SQL 查询也没有返回体，调用会得到空响应或 500。前端 `frontend/lib/api.ts:listDisciplinaryRecords` 会把筛选条件放在查询串里，例如 `?studentId=<uuid>&staffId=<uuid>&date=2025-04-01`。
- `POST /API/disciplinary-records`：前端 `createDisciplinaryRecord` 在请求体中发送 `{"studentId":"<uuid>","date":"YYYY-MM-DD","description":"<可选>"}`，`staffId` 预期由后端根据当前 DRO 会话自动填充，但控制器尚未实现逻辑。
- `PUT /API/disciplinary-records`：前端 `updateDisciplinaryRecord` 发送 `{"id":"<record-id>","date":"YYYY-MM-DD","description":"<可选>"}`，后端同样没有实现。
- `DELETE /API/disciplinary-records`：前端 `deleteDisciplinaryRecord` 通过 `DELETE /API/disciplinary-records?id=<record-id>` 指定要删除的记录，目前没有对应处理。
- 底层表访问器 `src/tables/Disciplinary.java` 目前还错误地读取了 `grade_encrypted` 表，导致 `ReportController` / `users.Guardian` / `users.Student` 在查询纪律记录时也会失败。

### 3.5 成绩 + 纪律汇总（`src/http/ReportController.java`）

- 路由：`GET /API/reports` 与 `POST /API/reports` 共用同一个方法。
- 角色：`student` 仅查看本人；`guardian` 先找出名下所有学生再汇总。
- 响应：`{ "ok": true, "data": [ { "grade": [...], "disciplinary": [...] }, ... ] }`，其中每条记录都会删除 `student_id` 以减小暴露面。
- 现状：因为 `tables.Grades` 查询 `grade_encrypted`（缺少 `s`）以及 `tables.Disciplinary` 读取错误表，接口会抛 SQL 异常，无法满足 Project.pdf “学生/监护人可查看成绩与处分” 的要求。

### 3.6 注册占位接口

- `POST /API/register`：直接返回 `501`（`{ "ok": false, "message": "No implement" }`），提示必须由管理员在数据库中预置账号。

### 3.7 仅存在于前端的占位路径

`frontend/lib/api.ts` 仍然暴露了一些 “DBA” 用接口（例如 `dbaCreateStudent -> /API/dba/students`, `dbaCreateGuardian -> /API/dba/guardians`），以及对 `PUT/DELETE /API/disciplinary-records` 的调用。这些路由在后端均不存在或未开放，调用会得到 `NOT_IMPLEMENTED` 或 404。开发/测试时需要保持前端的 `NotImplemented` 占位组件，以免误以为功能可用。

---

以上约定同步反映了当前 `frontend` 与 `src` 代码库的实际行为，后续若新增路由或放开被 `URIRouteTable` 禁止的接口，需要相应更新本说明以及 `frontend/api.md`。 



## 安全架构说明

### 三层防护体系

#### 1. 浏览器 ↔ Next.js（混合加密）

- **RSA-OAEP**：使用服务器公钥加密 AES 密钥
- **AES-256-GCM**：加密业务 JSON（method/query/body/timestamp/nonce）
- **HMAC-SHA256**：可选完整性校验（防篡改）

**流程：**
1. 客户端调用 `GET /API/public-key` 获取服务器 RSA 公钥
2. 生成随机 AES 密钥 + IV
3. 用 AES 加密请求数据
4. 用 RSA 加密 AES 密钥
5. 发送加密信封到 Next.js `/API/*` 路由

#### 2. Next.js ↔ Spring Boot（HMAC 签名）

**位置：**`frontend/lib/secureProxy.ts`

- **共享密钥**：前后端通过 `GATEWAY_SHARED_SECRET` 环境变量配置
- **规范化字符串**：`METHOD|PATH|BODY|TIMESTAMP|NONCE`
- **时间窗口**：±5 分钟有效期（防重放）
- **Nonce 缓存**：5 分钟内去重（Caffeine Cache）

**请求头：**
```
X-Gateway-Signature-Alg: HMAC-SHA256
X-Gateway-Signature: <Base64签名>
X-Gateway-Timestamp: <毫秒时间戳>
X-Gateway-Nonce: <随机字符串>
```

**内网通信保障：**
```typescript
const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3335";
const url = `${base}/API${targetTail}${qs ? `?${qs}` : ""}`;
```

#### 3. 后端内部（RBAC + 防 SQL 注入）

- **SessionFilter**：验证 `sid` Cookie 的有效性
- **RoleAuthFilter**：基于 `URIRouteTable` 的路由级权限控制
- **参数化 SQL**：所有数据库操作使用 `PreparedStatement`

**角色权限示例：**
| 路由 | 允许角色 |
|------|---------|
| `GET /API/profile` | student, guardian, ARO, DRO |
| `POST /API/grades` | ARO |
| `GET /API/disciplinary-records` | DRO |

---

## 常见问题排查

### 数据库相关

| 问题 | 排查步骤 |
|------|---------|
| 容器无法启动 | `docker logs comp3335-db` 查看错误日志 |
| 端口 3306 被占用 | 修改 `-p` 参数为 `-p 3307:3306` |
| `Encryption can't find master key` | 确认 `docker\keyring` 目录已挂载且配置正确 |
| 数据丢失 | 检查 `docker\data` 目录权限（Windows：允许完全控制） |

### 后端相关

| 问题 | 解决方案 |
|------|----------|
| Maven 依赖下载失败 | 配置阿里云镜像（`%USERPROFILE%\.m2\settings.xml`） |
| 编译错误 | 检查 JDK 版本：`java -version` |
| 接口返回 500 | 查看终端日志，检查数据库表名是否正确 |
| HMAC 验证失败 | 确认前后端 `GATEWAY_SHARED_SECRET` 一致 |
| 后端无法连接数据库 | 确认 Docker 容器运行：`docker ps` |

### 前端相关

| 问题 | 解决方案 |
|------|----------|
| `npm install` 失败 | 切换淘宝镜像：`npm config set registry https://registry.npmmirror.com` |
| 端口冲突 | 使用 `-p` 指定端口：`npm run dev -- -p 3001` |
| Cookie 无法写入 | 本地开发设置 `COOKIE_SECURE=0` |
| 登录失败 | 启用调试模式：`.env.local` 设置 `AUTH_DEBUG=1` |
| 无法连接后端 | 检查 `.env.local` 中 `NEXT_PUBLIC_API_URL` 是否正确 |

### 内网通信验证

```powershell
# 验证后端可访问
curl http://127.0.0.1:3335/API/public-key

# 验证前端可访问
curl http://localhost:3000

# 验证 Next.js 网关转发
# 在浏览器打开开发者工具 -> Network，登录时查看请求
# 应该看到：POST http://localhost:3000/API/login (200 OK)
```

### 集成测试流程

```powershell
# 1. 启动数据库
.\scripts\setup-percona.ps1

# 2. 写入测试数据
.\mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder

# 3. 启动后端（新建终端）
.\mvnw spring-boot:run

# 4. 启动前端（新建终端）
cd frontend
npm run dev

# 5. 浏览器访问
# http://localhost:3000/login
# 使用测试账号登录（见下方测试账号列表）
```

---

## 测试账号

### 数据库测试账号（TestAccountSeeder 写入）

运行 `.\mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder` 后自动创建：

| 邮箱 | 密码 | 角色 | 说明 |
|------|------|------|------|
| `student@test.local` | `Test@12345` | student | 学生账号（带成绩和纪律记录） |
| `guardian@test.local` | `Guardian@12345` | guardian | 监护人账号（关联学生账号） |
| `aro@test.local` | `ARO@1245` | ARO | 学术注册官（管理成绩） |
| `dro@test.local` | `DRO@12345` | DRO | 纪律注册官（管理纪律记录） |


---

## 部署检查清单

部署完成后，请确认以下事项：

### ✅ 数据库
- [ ] Docker 容器运行正常：`docker ps`
- [ ] 可连接到数据库：`docker exec -it comp3335-db mysql -uroot -p!testCOMP3335`
- [ ] 数据库表已创建：`SHOW TABLES FROM COMP3335;`

### ✅ 后端
- [ ] JDK 21+ 已安装：`java -version`
- [ ] 后端服务启动成功：看到 `Started Application` 日志
- [ ] 公钥接口可访问：`curl http://localhost:3335/API/public-key`
- [ ] `application.yml` 中 `shared-secret` 已配置

### ✅ 前端
- [ ] Node.js 18+ 已安装：`node -v`
- [ ] 依赖安装成功：`npm install` 无错误
- [ ] `.env.local` 已正确配置（包含 `NEXT_PUBLIC_API_URL` 和 `GATEWAY_SHARED_SECRET`）
- [ ] 前端服务启动成功：看到 `Ready on http://localhost:3000`
- [ ] 可访问登录页面：`http://localhost:3000/login`

### ✅ 内网通信
- [ ] Next.js 可访问后端：查看终端日志无 `ECONNREFUSED` 错误
- [ ] HMAC 签名验证通过：后端日志无 `HMAC validation failed` 错误
- [ ] 登录功能正常：可使用测试账号成功登录

### ✅ 安全配置
- [ ] 后端 3335 端口**未对外开放**（仅 Next.js 内网访问）
- [ ] 前端 3000 端口已开放（用户访问入口）
- [ ] 生产环境设置 `COOKIE_SECURE=1`
- [ ] 生产环境禁用 `AUTH_DEBUG`

---

## 项目文档索引

| 文档 | 路径 | 内容 |
|------|------|------|
| **后端指南** | `README.md` | Spring Boot 启动、数据库配置、Maven 使用 |
| **前端指南** | `frontend/README.md` | Next.js 开发、环境变量配置 |
| **API 规范** | `API.md` | 所有 HTTP 接口的请求/响应格式 |
| **安全设计** | `frontend/api.md` | 加密方案、HMAC 签名、RBAC 详解 |
| **本文档** | `FINAL_README.md` | **Windows 单机部署流程** |

---

## 技术栈总结

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端** | Next.js | 15+ |
| | React | 19+ |
| | TypeScript | 5+ |
| | Tailwind CSS | 3+ |
| **后端** | Spring Boot | 3.x |
| | Java | 21 |
| | Maven Wrapper | 内置 |
| **数据库** | Percona Server | 最新版（MySQL 兼容） |
| | Docker | 最新版 |
| **安全** | RSA-OAEP, AES-256-GCM | WebCrypto API |
| | HMAC-SHA256 | Java Crypto |
| | Session RBAC | 自定义实现 |

---

## 联系与支持

- **课程代码**：COMP3335
- **项目名称**：Computing Student Management System
- **部署方式**：Windows 单主机，前后端内网 HTTP 通信

如有问题，请优先参考各子文档的"常见问题"章节。

---

**最后更新时间**：2025-01-17  
**文档版本**：v2.0 (Windows Only)

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

# 使用说明（中文）

## 快速上手
- 在 `frontend/` 目录执行：`npm install`
- 开发启动：`npm run dev`（如端口占用可用 `npm run dev -- -p 3001`）
- 打开浏览器访问：`http://localhost:3000`（或你指定的端口）
- 可选外部后端配置：在 `frontend/.env.local` 写入：
  ```
  NEXT_PUBLIC_USE_TEST_API=1
  NEXT_PUBLIC_API_URL=http://localhost:3335
  AUTH_DEBUG=1
  ```
  - `NEXT_PUBLIC_USE_TEST_API=1`：强制前端请求外部后端地址
  - `NEXT_PUBLIC_API_URL`：外部后端基础 URL
  - `AUTH_DEBUG=1`：登录启用本地测试账号（读取 `frontend/test_acount`）
- 生产构建与启动：`npm run build` → `npm run start -- -p 3002`
- 入口页面参考：`/login`、`/register`、`/students`、`/courses`、`/enrollments`、`/grades`、`/reports`、`/profile`
- 避免提交敏感文件：`*.env*`（含 `.env.local`）已在 `.gitignore` 中忽略

## 环境要求
- 安装 `Node.js >= 20` 与 `npm`（或 `yarn/pnpm/bun`）。

## 在 Linux 下安装 Node.js 并初始化项目前端（傻瓜式教程）

下面步骤尽量面向零基础，复制粘贴即可运行。如使用 Ubuntu/Debian、CentOS/RHEL/AlmaLinux 等主流发行版均可。

1) 安装基础工具（根据你的发行版选择一条）
- Ubuntu/Debian：
  - `sudo apt update && sudo apt install -y curl build-essential`
- CentOS/RHEL/AlmaLinux：
  - `sudo yum install -y curl gcc-c++ make`
- Fedora：
  - `sudo dnf install -y curl gcc-c++ make`

2) 安装 nvm（Node 版本管理器）
- `curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`
- 让当前终端生效（任选其一，若第一个失败就执行第二个）：
  - `source ~/.bashrc`
  - `source ~/.profile`
- 验证：
  - `command -v nvm`（能输出 `nvm` 表示安装成功）

3) 安装 Node.js 18（项目要求）
- `nvm install 18`
- `nvm use 18`
- `nvm alias default 18`
- 验证版本：
  - `node -v`（期望 >= 18.x）
  - `npm -v`

4) 获取并进入项目目录
- 若你已把项目放到服务器上：
  - `cd /path/to/COMP3335-Computing-Student-Management/frontend`
- 若需要从仓库拉取（替换为你的仓库地址）：
  - `git clone <你的仓库地址>`
  - `cd COMP3335-Computing-Student-Management/frontend`

5) 初始化依赖并启动开发模式
- 安装依赖：
  - `npm install`
- 可选：创建环境变量文件（本地开发用，不提交到 Git）：
  - ```
    cat > .env.local << 'EOF'
    NEXT_PUBLIC_API_URL=http://127.0.0.1:3335
    # 开发可选：启用本地测试账号
    AUTH_DEBUG=1
    # 非 HTTPS 环境下关闭 Secure，避免浏览器拒收 Cookie（生产请开启）
    COOKIE_SECURE=0
    EOF
    ```
- 启动开发服务：
  - `npm run dev`
- 在浏览器访问：
  - `http://<你的服务器IP或域名>:3000`

6) 生产模式（简单托管）
- 构建与启动：
  - `npm ci`（或 `npm install`）
  - `npm run build`
  - `npm run start -- -p 3000`
- 建议放在 Nginx/Apache 反向代理后面并启用 HTTPS 与 HSTS；确保后端 `Set-Cookie` 的 `domain` 与前端域匹配，否则浏览器可能拒收 Cookie。

7) 可选：使用 systemd 托管前端服务（开机自启）
- 创建文件 `/etc/systemd/system/next-frontend.service`（需要 root 权限），内容示例：
  - ```
    [Unit]
    Description=Next.js Frontend Service
    After=network.target

    [Service]
    Type=simple
    WorkingDirectory=/path/to/COMP3335-Computing-Student-Management/frontend
    ExecStart=/usr/bin/npm run start -- -p 3000
    Restart=always
    Environment=NEXT_PUBLIC_API_URL=http://127.0.0.1:3335
    # 生产环境可注入 RSA 密钥（PEM），否则前端会生成临时密钥对：
    # Environment=SERVER_RSA_PUBLIC_PEM=-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----
    # Environment=SERVER_RSA_PRIVATE_PEM=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----

    [Install]
    WantedBy=multi-user.target
    ```
- 生效并启动：
  - `sudo systemctl daemon-reload`
  - `sudo systemctl enable --now next-frontend`
- 查看状态与日志：
  - `systemctl status next-frontend`
  - `journalctl -u next-frontend -f`

8) 常见问题（快速自检）
- 端口占用：使用 `npm run dev -- -p 3001` 或 `npm run start -- -p 3002` 更换端口。
- Node 未找到：重新执行 `source ~/.bashrc` 或 `source ~/.profile` 后再试；确保 `nvm use 18` 生效。
- 浏览器无法登录：在非 HTTPS 场景下将 `.env.local` 中 `COOKIE_SECURE=0`；生产务必开启 HTTPS 并设置合适的 `domain`。
- 后端不通或报 `NOT_IMPLEMENTED`：检查 `NEXT_PUBLIC_API_URL` 是否正确，或确认后端已实现 `/API/*` 接口。

## 安装依赖
- 在 `frontend/` 目录下执行：
  - `npm install`

## 开发模式启动
- 执行：`npm run dev`
- 默认端口为 `http://localhost:3000`；若端口占用，可指定端口：
  - `npm run dev -- -p 3001`

## 生产模式构建与启动
- 构建：`npm run build`
- 启动：`npm run start`
- 自定义端口示例：`npm run start -- -p 3002`

## 后端 API 配置
- 默认使用内部 API 路由前缀：`/API/*`。
- 若需接入外部后端，请在 `frontend/.env.local` 设置：
  - `NEXT_PUBLIC_USE_TEST_API=1`
  - `NEXT_PUBLIC_API_URL=http://localhost:3335`（替换为你的后端地址）
- 登录本地调试（可选）：在 `.env.local` 设置 `AUTH_DEBUG=1`，即可使用 `frontend/test_acount` 中的本地账号文件；也可通过在登录接口 URL 上添加 `?debug=1` 开启调试。
- Cookie 配置见 `lib/config.ts`：生产环境建议开启 `secure: true`，并按需设置 `domain`。

## 本地开发 .env.local 模板（推荐）
- 文件路径：`frontend/.env.local`（不会提交到 Git）。
- 复制以下模板并按需调整：
  ```
  # 本地开发推荐模板（复制到 frontend/.env.local）

  # 启用本地调试账号（读取 frontend/test_acount）
  AUTH_DEBUG=1

  # 在非 HTTPS 的本地开发环境关闭 Secure；生产请开启或保留默认
  COOKIE_SECURE=0

  # 可选：强制使用外部后端（本地开发建议注释掉，避免跨域 Cookie 问题）
  # NEXT_PUBLIC_USE_TEST_API=1
  # NEXT_PUBLIC_API_URL=http://127.0.0.1:3335

  # 可选：Cookie 跨子域设置（默认不设置）
  # COOKIE_DOMAIN=example.com

  # 可选：提供服务器 RSA 密钥对（PEM）。不设置时使用内置/临时密钥
  # SERVER_RSA_PUBLIC_PEM=-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----
  # SERVER_RSA_PRIVATE_PEM=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
  
  # 网关到后端的 HMAC 共享密钥（必填，前端转发时用于签名）
  # GATEWAY_SHARED_SECRET=please-change-this-secret
  ```
- 变量说明：
  - `AUTH_DEBUG`：开启本地调试账号；也可在接口上加 `?debug=1`。
  - `COOKIE_SECURE`：本地 HTTP 环境下设为 `0`，生产需开启（或留默认）。
  - `NEXT_PUBLIC_USE_TEST_API`/`NEXT_PUBLIC_API_URL`：连接外部后端。若设置为外部域，`Set-Cookie` 可能写到外域导致会话失效；本地建议注释掉，让中继回落到当前站点。
  - `COOKIE_DOMAIN`：生产跨子域场景使用；本地通常不要设置。
  - `SERVER_RSA_PUBLIC_PEM`/`SERVER_RSA_PRIVATE_PEM`：可注入固定密钥，便于生产部署与密钥轮换。
  - `GATEWAY_SHARED_SECRET`：网关 HMAC 共享密钥；前端在转发到后端时会按 `method|path|body|timestamp|nonce` 计算 `HMAC-SHA256` 并加到请求头中，后端需用同一密钥进行校验。

### 本地测试账号文件格式（配合 AUTH_DEBUG）
- 文件：`frontend/test_acount`
- 每行：`email,password,role,name`
- 示例：
  ```
  student@example.com,pass123,student,Alice
  aro@example.com,pass123,ARO,Bob
  guardian@example.com,pass123,guardian,Grace
  dro@example.com,pass123,DRO,David
  ```

## 页面与模块
- `/login` 登录：邮箱校验、眼睛图标切换密码显示。
- `/register` 注册：实时校验与红框高亮，密码默认明文显示，可复选框切换。
- `/students` 学生管理：搜索、创建、编辑、删除（实时校验与红框高亮）。
- `/courses`、`/enrollments`、`/grades`、`/reports`、`/profile`：目前为骨架 UI，需接入后端完善数据交互。
- 当后端接口未实现时，页面会显示占位提示（`NotImplemented`）。

## .gitignore 注意事项
- 已忽略目录：`node_modules/`、`.next/`、`out/`、`build/`、`coverage/`、`.vercel/`。
- 已忽略文件：`*.tsbuildinfo`、`next-env.d.ts`、`*.pem`、各类调试日志（`npm-debug.log*` 等）。
- 环境变量：`*.env*` 已被忽略，请勿将 `.env.local`（含敏感配置）提交到 Git。
- `frontend/test_acount` 仅用于本地账号调试，生产环境建议移除或加入忽略。
- 若需取消忽略某类文件，请谨慎评估安全风险（Cookie、证书、密钥等不应提交）。

## 常见问题
- 端口占用：使用 `-p` 指定端口，例如 `npm run dev -- -p 3001` 或 `npm run start -- -p 3002`。
- 接口未实现：出现 `NOT_IMPLEMENTED` 提示表示后端尚未提供该接口；可切换到外部后端或补齐内部 API 路由。

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Learn More

lib/config.ts 包含了项目的配置信息，例如 Cookie 名称、过期时间、Cookie 选项等。
.env.local 包含了项目的环境变量配置，调试模式开关

## TODO（可选QAQ）

应用CSRF token保护
应用https+HTTPS Strict Transport Security (HSTS),TLS 1.2及以上
应用CORS策略

## Test Account
```
{
  "accounts": [
    { "email": "student@test.local", "role": "student", "password": "Test@12345", "name": "Student Test" },
    { "email": "aro@test.local", "role": "ARO", "password": "Aro@12345", "name": "ARO Admin" },
    { "email": "guardian@test.local", "role": "guardian", "password": "Guardian@12345", "name": "Guardian User" },
    { "email": "dro@test.local", "role": "DRO", "password": "Dro@12345", "name": "DRO Officer" },
    { "email": "dba@test.local", "role": "DBA", "password": "Dba@12345", "name": "DBA Admin" }
    ]
}
```
