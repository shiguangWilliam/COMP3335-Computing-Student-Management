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
