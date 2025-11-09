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
- 安装 `Node.js >= 18` 与 `npm`（或 `yarn/pnpm/bun`）。

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
- 默认使用内部 API 路由前缀：`/API/function/*`。
- 若需接入外部后端，请在 `frontend/.env.local` 设置：
  - `NEXT_PUBLIC_USE_TEST_API=1`
  - `NEXT_PUBLIC_API_URL=http://localhost:3335`（替换为你的后端地址）
- 登录本地调试（可选）：在 `.env.local` 设置 `AUTH_DEBUG=1`，即可使用 `frontend/test_acount` 中的本地账号文件；也可通过在登录接口 URL 上添加 `?debug=1` 开启调试。
- Cookie 配置见 `lib/config.ts`：生产环境建议开启 `secure: true`，并按需设置 `domain`。

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

