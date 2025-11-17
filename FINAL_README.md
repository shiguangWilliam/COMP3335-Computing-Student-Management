# COMP3335 计算机学生管理系统 - 完整部署指南

本文档提供 COMP3335 计算机学生管理系统的完整部署流程，包括数据库、后端（Spring Boot）和前端（Next.js）的配置与启动步骤。

---

## 📋 目录

1. [系统架构概览](#系统架构概览)
2. [环境要求](#环境要求)
3. [快速开始（本地开发）](#快速开始本地开发)
4. [详细部署步骤](#详细部署步骤)
   - [步骤 1：数据库部署](#步骤-1数据库部署)
   - [步骤 2：后端部署](#步骤-2后端部署)
   - [步骤 3：前端部署](#步骤-3前端部署)
5. [生产环境部署](#生产环境部署)
6. [安全架构说明](#安全架构说明)
7. [常见问题排查](#常见问题排查)
8. [测试账号](#测试账号)

---

## 系统架构概览

本系统采用三层架构：

```
浏览器 <--[RSA+AES混合加密]--> Next.js前端 <--[HMAC签名]--> Spring Boot后端 <--> MySQL数据库
   ↓                                ↓                           ↓                    ↓
端口:*                          端口:3000                    端口:3335           端口:3306
```

**安全特性：**
- **浏览器 ↔ Next.js**：RSA-OAEP + AES-256-GCM 混合加密，防止窃听和篡改
- **Next.js ↔ Java 后端**：HMAC-SHA256 + timestamp + nonce 防伪造和重放攻击
- **后端访问控制**：基于 Session 的 RBAC（Role-Based Access Control）+ URI 路由表
- **数据库安全**：参数化 SQL 防注入 + Percona 加密表存储敏感数据

---

## 环境要求

### 必备软件

| 组件 | 版本要求 | 用途 |
|------|---------|------|
| **JDK** | 21+ | 运行 Spring Boot 后端 |
| **Node.js** | 18+ (推荐 20+) | 运行 Next.js 前端 |
| **Docker Desktop** | 最新版 | 运行 Percona MySQL 数据库容器 |
| **Git** | 最新版 | 版本控制（可选） |

### 操作系统支持

- ✅ **Windows 10/11**（主要支持平台，内置 PowerShell 脚本）
- ✅ **Linux**（Ubuntu/Debian/CentOS/RHEL，参考前端 README 的 Linux 安装指南）
- ✅ **macOS**（基本兼容，需手动调整路径分隔符）

---

## 快速开始（本地开发）

以下步骤适用于 **Windows 本地开发环境**，3 分钟内完成启动：

### 1️⃣ 启动数据库（Docker）

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

✅ 看到 `Started Application in X seconds` 表示后端启动成功（默认端口 `3335`）

### 3️⃣ 启动前端（Next.js）

```powershell
# 切换到前端目录
cd frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

✅ 打开浏览器访问 `http://localhost:3000` 进入系统

### 4️⃣ 写入测试数据（可选）

```powershell
# 在项目根目录
.\mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder
```

这将写入默认测试账号（student/guardian/ARO/DRO/DBA）及示例课程、成绩、纪律记录。

---

## 详细部署步骤

### 步骤 1：数据库部署

#### Windows + Docker（推荐）

1. **安装 Docker Desktop**  
   下载并安装：https://www.docker.com/products/docker-desktop/

2. **运行自动化脚本**
   ```powershell
   # 在项目根目录
   .\scripts\setup-percona.ps1
   
   # 重置数据库（清空所有数据）
   .\scripts\setup-percona.ps1 -ResetData
   ```

3. **手动启动（可选）**  
   如果脚本失败，可手动执行：
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

4. **验证数据库**
   ```powershell
   docker ps --filter "name=comp3335-db"
   docker exec -it comp3335-db mysql -uroot -p!testCOMP3335 -e "SHOW DATABASES;"
   ```

#### Linux（命令行）

参考 `scripts/setup-percona.sh`（需要手动调整权限）：

```bash
chmod +x scripts/setup-percona.sh
./scripts/setup-percona.sh
```

**数据库连接信息：**
- 主机：`localhost`
- 端口：`3306`
- 数据库：`COMP3335`
- 用户名：`root`
- 密码：`!testCOMP3335`

---

### 步骤 2：后端部署

#### 开发模式

1. **确认 JDK 版本**
   ```powershell
   java -version  # 应显示 21 或更高版本
   ```

2. **配置数据库连接**  
   编辑 `src/main/resources/application.properties`：
   ```properties
   server.port=3335
   
   # 数据库配置
   spring.datasource.url=jdbc:mysql://localhost:3306/COMP3335?useSSL=false&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=!testCOMP3335
   
   # 删除此行（首次配置后）
   # spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
   ```

3. **启动开发服务器**
   ```powershell
   .\mvnw spring-boot:run
   ```

#### 生产模式（打包运行）

```powershell
# 清理并打包
.\mvnw -U clean package

# 运行 JAR
java -jar target\comp3335-0.0.1-SNAPSHOT.jar
```

#### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 依赖下载慢 | 配置阿里云 Maven 镜像（见根目录 `README.md`） |
| `JAVA_HOME not found` | 设置环境变量 `JAVA_HOME=C:\Program Files\Java\jdk-21` |
| 端口 3335 被占用 | 修改 `application.properties` 中的 `server.port` |
| 数据库连接失败 | 检查 Docker 容器是否运行：`docker ps` |

---

### 步骤 3：前端部署

#### 开发模式

1. **安装 Node.js**  
   Windows：下载 `.msi` 安装包  
   Linux：使用 `nvm`（参考 `frontend/README.md` 的详细步骤）

2. **安装依赖**
   ```powershell
   cd frontend
   npm install
   ```

3. **配置环境变量**  
   创建 `frontend/.env.local`：
   ```env
   # 本地开发推荐配置
   AUTH_DEBUG=1                  # 启用本地测试账号
   COOKIE_SECURE=0              # HTTP 环境下关闭（生产必须开启）
   
   # 可选：连接外部后端（不推荐本地开发使用）
   # NEXT_PUBLIC_USE_TEST_API=1
   # NEXT_PUBLIC_API_URL=http://localhost:3335
   
   # 必填：HMAC 共享密钥（与后端保持一致）
   GATEWAY_SHARED_SECRET=your-secret-key-here
   ```

4. **启动开发服务器**
   ```powershell
   npm run dev
   # 或指定端口
   npm run dev -- -p 3001
   ```

5. **访问系统**  
   打开浏览器：`http://localhost:3000`

#### 生产模式

```powershell
# 构建静态资源
npm run build

# 启动生产服务器
npm run start -- -p 3000
```

#### Linux 生产部署（systemd）

创建 `/etc/systemd/system/next-frontend.service`：

```ini
[Unit]
Description=Next.js Frontend Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/COMP3335-Computing-Student-Management/frontend
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
Environment=NEXT_PUBLIC_API_URL=http://127.0.0.1:3335
Environment=GATEWAY_SHARED_SECRET=your-secret-key-here

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now next-frontend
systemctl status next-frontend
```

---

## 生产环境部署

### 安全加固建议

1. **启用 HTTPS**  
   - 使用 Nginx/Apache 作为反向代理
   - 配置 TLS 1.2+ 证书
   - 启用 HSTS（HTTP Strict Transport Security）

2. **环境变量配置**
   ```env
   # 前端 .env.local
   COOKIE_SECURE=1                          # 强制 HTTPS Cookie
   COOKIE_DOMAIN=yourdomain.com            # 跨子域共享 Session
   GATEWAY_SHARED_SECRET=<强随机密钥>       # 后端 HMAC 签名密钥
   SERVER_RSA_PUBLIC_PEM=<固定公钥PEM>     # RSA 密钥对（持久化）
   SERVER_RSA_PRIVATE_PEM=<固定私钥PEM>
   ```

3. **后端配置**
   - 在 `application.properties` 中设置生产数据库凭证
   - 使用环境变量或配置中心管理敏感信息
   - 配置 `GATEWAY_SHARED_SECRET` 与前端保持一致

4. **数据库安全**
   - 修改默认密码 `!testCOMP3335`
   - 限制远程访问（仅允许后端 IP）
   - 启用 Percona TDE（Transparent Data Encryption）

5. **网络架构**
   ```
   互联网
     ↓
   [Nginx/反向代理] (HTTPS)
     ↓          ↓
   Next.js   Spring Boot
     ↓          ↓
        MySQL
   ```

### Nginx 配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API（可选，直接暴露）
    location /api/ {
        proxy_pass http://127.0.0.1:3335/API/;
    }
}
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
5. 发送加密信封到 Next.js

#### 2. Next.js ↔ Spring Boot（HMAC 签名）

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

### 前端相关

| 问题 | 解决方案 |
|------|----------|
| `npm install` 失败 | 切换淘宝镜像：`npm config set registry https://registry.npmmirror.com` |
| 端口冲突 | 使用 `-p` 指定端口：`npm run dev -- -p 3001` |
| Cookie 无法写入 | 本地开发设置 `COOKIE_SECURE=0`（生产必须为 1） |
| 登录失败 | 启用调试模式：`.env.local` 设置 `AUTH_DEBUG=1` |

### 集成测试

```powershell
# 1. 启动数据库
.\scripts\setup-percona.ps1

# 2. 写入测试数据
.\mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder

# 3. 启动后端
.\mvnw spring-boot:run

# 4. 启动前端（新终端）
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
| `student@comp3335.test` | `Student@123` | student | 学生账号（带成绩和纪律记录） |
| `guardian@comp3335.test` | `Guardian@123` | guardian | 监护人账号（关联学生账号） |
| `aro@comp3335.test` | `ARO@123` | ARO | 学术注册官（管理成绩） |
| `dro@comp3335.test` | `DRO@123` | DRO | 纪律注册官（管理纪律记录） |
| `dba@comp3335.test` | `DBA@123` | DBA | 数据库管理员 |

### 前端调试账号（AUTH_DEBUG=1）

编辑 `frontend/test_acount` 文件（格式：`email,password,role,name`）：

```
student@test.local,Test@12345,student,Student Test
aro@test.local,Aro@12345,ARO,ARO Admin
guardian@test.local,Guardian@12345,guardian,Guardian User
dro@test.local,Dro@12345,DRO,DRO Officer
dba@test.local,Dba@12345,DBA,DBA Admin
```

> **注意**：生产环境必须删除此文件或设置 `AUTH_DEBUG=0`

---

## 项目文档索引

| 文档 | 路径 | 内容 |
|------|------|------|
| **后端指南** | `README.md` | Spring Boot 启动、数据库配置、Maven 使用 |
| **前端指南** | `frontend/README.md` | Next.js 开发、环境变量、Linux 部署 |
| **API 规范** | `API.md` | 所有 HTTP 接口的请求/响应格式 |
| **安全设计** | `frontend/api.md` | 加密方案、HMAC 签名、RBAC 详解 |
| **本文档** | `FINAL_README.md` | **完整部署流程与问题排查** |

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

## 开发团队建议

1. **版本控制**  
   - 所有敏感文件已加入 `.gitignore`（`.env.local`, `*.pem`, `test_acount`）
   - 提交前检查：`git status`

2. **协作开发**  
   - 后端：IntelliJ IDEA Community（免费）
   - 前端：VS Code + ESLint + Prettier
   - 数据库：DBeaver 或 MySQL Workbench

3. **代码规范**  
   - 后端：遵循 Spring Boot 官方最佳实践
   - 前端：使用 ESLint 配置（`frontend/eslint.config.mjs`）
   - 提交信息：使用 Conventional Commits 格式

4. **性能优化**  
   - 前端：启用 Next.js 生产构建 `npm run build`
   - 后端：使用 `mvnw package` 打包为可执行 JAR
   - 数据库：为常用查询添加索引

---

## 联系与支持

- **课程代码**：COMP3335
- **项目名称**：Computing Student Management System
- **仓库地址**：（根据实际情况填写 GitHub/GitLab 链接）

如有问题，请优先参考各子文档的"常见问题"章节，或在项目 Issue 中提问。

---

**最后更新时间**：2025-01-17  
**文档版本**：v1.0
