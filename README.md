# COMP3335 计算机学生管理系统 - Windows 部署指南

本文档提供 COMP3335 计算机学生管理系统在 **Windows 平台**的完整部署流程。

**部署架构说明：**
- ✅ **前后端部署在同一主机**
- ✅ **通过内网 HTTP 通信** (localhost/127.0.0.1)
- ✅ **用户通过访问 `http://ip:3000` 访问系统**

---

## 📋 目录

1. [系统架构概览](#系统架构概览)
2. [环境要求](#环境要求)
3. [快速开始](#快速开始)
4. [详细部署步骤](#详细部署步骤)
   - [步骤 1：数据库部署](#步骤-1数据库部署)
   - [步骤 2：后端部署](#步骤-2后端部署)
   - [步骤 3：前端部署](#步骤-3前端部署)
5. [安全架构说明](#安全架构说明)
6. [常见问题排查](#常见问题排查)
7. [测试账号](#测试账号)

---

## 系统架构概览

**单主机同域部署架构：**

```
用户浏览器 (http://server-ip:3000)
         ↓
   [Next.js 前端服务器] (端口 3000)
         ↓ [内网 HTTP - 127.0.0.1]
   [Spring Boot 后端] (端口 3335)
         ↓ [内网 MySQL]
   [Percona 数据库] (端口 3306)
```

**关键特性：**
- ✅ **同域部署**：用户只访问 `:3000`，所有 API 请求都是相对路径 `/API/*`，无跨域问题
- ✅ **内网通信**：Next.js 网关层通过 `http://127.0.0.1:3335` 转发请求到后端
- ✅ **安全隔离**：后端 3335 端口**不对外开放**，仅接受来自 Next.js 网关的 HMAC 签名请求
- ✅ **Cookie 自动携带**：浏览器与 Next.js 同域，Session Cookie 自动携带，无需额外配置

**安全层级：**
- **浏览器 ↔ Next.js**：RSA-OAEP + AES-256-GCM 混合加密
- **Next.js ↔ Spring Boot**：HMAC-SHA256 + timestamp + nonce 网关认证
- **后端访问控制**：Session + RBAC + URI 路由表
- **数据库安全**：参数化 SQL + Percona TDE 加密表

---

## 环境要求

### 必备软件

| 组件 | 版本要求 | 用途 |
|------|---------|------|
| **JDK** | 21+ | 运行 Spring Boot 后端 |
| **Node.js** | 18+ (推荐 20+) | 运行 Next.js 前端 |
| **Docker Desktop** | 最新版 | 运行 Percona MySQL 数据库容器 |
| **Git** | 最新版 | 版本控制（可选） |

### 操作系统要求

- ✅ **Windows 10/11** (64-bit)
- ✅ PowerShell 5.1+ (系统自带)

### 安装链接

- **JDK 21**：https://adoptium.net/zh-CN/temurin/releases/?version=21
- **Node.js**：https://nodejs.org/zh-cn/download/
- **Docker Desktop**：https://www.docker.com/products/docker-desktop/

---

## 快速开始

以下步骤适用于 **Windows 单机部署**，3 分钟内完成启动：

### 1️⃣ 启动数据库（Docker）

>请在运行前确认你已安装Docker Desktop
```powershell
# 在项目根目录打开 PowerShell
cd C:\...\COMP3335-Computing-Student-Management

# 自动启动 Percona 数据库（包含初始化脚本）
.\scripts\setup-percona.ps1
```

> **注意**：首次运行会自动下载镜像并初始化数据库，耗时约 2-5 分钟。

### 2️⃣ 启动后端（Spring Boot）

```powershell
# 在项目根目录
.\mvnw spring-boot:run
```

✅ 看到 `Started Application in X seconds` 表示后端启动成功（**内网端口 3335**）

### 3️⃣ 启动前端（Next.js）

```powershell
# 切换到前端目录
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

✅ 看到 `Ready on http://localhost:3000` 表示前端启动成功

### 4️⃣ 写入测试数据（可选）

```powershell
# 在项目根目录
.\mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder
```

这将写入默认测试账号（student/guardian/ARO/DRO/DBA）及示例课程、成绩、纪律记录。

### 5️⃣ 访问系统

- **本机访问**：`http://localhost:3000`
- **同网段其他设备访问**：`http://<主机IP>:3000`（需配置 Windows 防火墙规则）

---
## 快速启动 ##
    进入项目根目录，运行以下指令
    ```
    ./scripts/start-all.ps1
    ```
    可快速启动
## 详细部署步骤

### 步骤 1：数据库部署

#### 使用自动化脚本（推荐）

1. **确保 Docker Desktop 已启动**  
   任务栏看到 Docker 图标即可。

2. **运行 PowerShell 脚本**
   ```powershell
   # 在项目根目录
   .\scripts\setup-percona.ps1
   
   # 重置数据库（清空所有数据）
   .\scripts\setup-percona.ps1 -ResetData
   ```
   如果报错
   ```
   因为在此系统上禁止运行脚本
   ```
   尝试运行一下指令以临时允许当前会话执行脚本
   ```
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
   或者运行以下指令以进行永久修改（需要管理员）
   ```
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **验证数据库状态**
   ```powershell
   docker ps --filter "name=comp3335-db"
   ```
   应显示容器状态为 `Up`。

#### 手动启动（脚本失败时）

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

#### 验证数据库连接

```powershell
docker exec -it comp3335-db mysql -uroot -p!testCOMP3335 -e "SHOW DATABASES;"
```

**数据库连接信息：**
- 主机：`localhost`
- 端口：`3306`
- 数据库：`COMP3335`
- 用户名：`root`
- 密码：`!testCOMP3335`

---

### 步骤 2：后端部署

#### 前置检查

1. **确认 JDK 版本**
   ```powershell
   java -version  # 应显示 21 或更高版本
   ```

2. **配置数据库连接**  
   编辑 `src/main/resources/application.properties`：
   ```properties
   server.port=3335
   
   # 数据库配置（内网连接）
   spring.datasource.url=jdbc:mysql://localhost:3306/COMP3335?useSSL=false&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=!testCOMP3335
   
   # 删除此行（首次配置后）
   # spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
   ```

3. **配置 HMAC 共享密钥**  
   编辑 `src/main/resources/application.yml`：
   ```yaml
   app:
     gateway:
       shared-secret: b6e618d7fb5b8bc0e9fe1b804d7eb722a35e5159bc2efb68e5f1419e3f56fc90
   ```
   改成你自己的密钥

#### 启动后端服务

```powershell
# 开发模式
.\mvnw spring-boot:run

# 生产模式（打包运行）
.\mvnw -U clean package
java -jar target\comp3335-0.0.1-SNAPSHOT.jar
```

#### 验证后端启动

访问健康检查接口：
```powershell
curl http://localhost:3335/API/public-key
```

应返回 RSA 公钥 JSON。

#### 常见问题

| 问题 | 解决方案 |
|------|----------|
| `JAVA_HOME not found` | 设置环境变量 `JAVA_HOME=C:\Program Files\Java\jdk-21` |
| 端口 3335 被占用 | 修改 `application.properties` 中的 `server.port` |
| 数据库连接失败 | 检查 Docker 容器是否运行：`docker ps` |
| HMAC 验证失败 | 确认前后端 `GATEWAY_SHARED_SECRET` 一致 |

---

### 步骤 3：前端部署

#### 安装 Node.js

下载并安装：https://nodejs.org/zh-cn/download/
推荐下载.msi安装包

验证安装：
```powershell
node -v   # 应显示 v18+ 或 v20+
npm -v    # 应显示 npm 版本号
```

#### 配置环境变量

创建 `frontend/.env.local`：
```env
# 内网后端地址（Next.js 网关转发目标）
NEXT_PUBLIC_API_URL=http://127.0.0.1:3335

# HMAC 共享密钥（必须与后端 application.yml 一致）
GATEWAY_SHARED_SECRET=b6e618d7fb5b8bc0e9fe1b804d7eb722a35e5159bc2efb68e5f1419e3f56fc90

# 开发模式配置
AUTH_DEBUG=1          # 启用本地测试账号
COOKIE_SECURE=0       # HTTP 环境下关闭（生产必须开启）
```

> **重要**：`NEXT_PUBLIC_API_URL` 必须设置为 `http://127.0.0.1:3335`，确保 Next.js 通过内网连接后端。

#### 安装依赖

```powershell
cd frontend
npm install
```



#### 启动前端服务

```powershell
# 开发模式
npm run dev

# 生产模式
npm run build
npm run start
```

#### 验证前端启动

打开浏览器访问：
- **本机**：`http://localhost:3000`
- **局域网**：`http://<Windows主机IP>:3000`

#### 允许局域网访问（可选）

如需从其他设备访问，需配置 Windows 防火墙：

```powershell
# 允许入站连接到 3000 端口
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

---

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
