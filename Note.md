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
