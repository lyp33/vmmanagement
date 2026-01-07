# ✅ Vercel 部署问题已修复

## 问题描述

部署到 Vercel 时出现错误：
```
Error: The datasource.url property is required in your Prisma config file when using prisma migrate deploy.
Error: Command "npm run vercel-build" exited with 1
```

## 原因

`vercel-build` 脚本包含了 Prisma 数据库迁移命令，但我们的应用使用的是：
- **本地开发**：文件存储
- **Vercel 生产**：Vercel KV (Redis)

不需要 Prisma 数据库迁移。

## 解决方案

已修改 `package.json` 中的构建脚本：

**修改前：**
```json
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

**修改后：**
```json
"vercel-build": "next build"
```

## 现在可以部署了！

### 方法 1：Vercel Dashboard 重新部署

1. 进入 Vercel Dashboard
2. 找到你的项目
3. 点击 **"Redeploy"**
4. 等待构建完成

### 方法 2：推送新的提交

代码已经推送到 GitHub，Vercel 会自动重新部署。

## 部署后的步骤

### 1. 创建 Vercel KV 数据库（可选但推荐）

如果你想要永久存储数据：

1. 进入 Vercel Dashboard → 你的项目
2. 点击 **"Storage"** 标签
3. 点击 **"Create Database"** → 选择 **"KV"**
4. 命名：`vm-expiry-kv`
5. 选择区域（与应用相同）
6. 点击 **"Create"**

Vercel 会自动添加环境变量：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### 2. 添加必需的环境变量

在 Vercel Dashboard → Settings → Environment Variables 添加：

```env
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=<运行: openssl rand -base64 32>
```

生成 NEXTAUTH_SECRET：
```bash
openssl rand -base64 32
```

或使用 Node.js：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 重新部署（如果添加了环境变量）

添加环境变量后，需要重新部署：
- Vercel Dashboard → Deployments → Redeploy

### 4. 初始化数据库

访问：
```
https://your-project.vercel.app/api/init
```

应该看到：
```json
{
  "message": "Database initialized successfully",
  "storageType": "kv",  // 如果创建了 KV，否则是 "file"
  "defaultAdmin": {
    "email": "admin@123.com",
    "password": "123456789"
  }
}
```

### 5. 登录

访问：`https://your-project.vercel.app/auth/signin`

使用默认管理员账户：
- **Email:** `admin@123.com`
- **Password:** `123456789`

## 存储说明

### 没有创建 KV（临时存储）

- ✅ 应用可以正常运行
- ❌ 数据会在以下情况清空：
  - 重新部署
  - 闲置 15-30 分钟后（冷启动）
  - Vercel 重启服务器
- ⚠️ 仅适合演示和测试

### 创建了 KV（永久存储）

- ✅ 应用可以正常运行
- ✅ 数据永久保存
- ✅ 不会因为重启或冷启动丢失
- ✅ 适合生产使用

## 验证部署

### 检查存储类型

```bash
curl https://your-project.vercel.app/api/storage-test
```

应该返回：
```json
{
  "storageType": "kv",  // 或 "file"
  "tests": {
    "connection": "OK",
    "readWrite": "OK"
  }
}
```

### 检查健康状态

```bash
curl https://your-project.vercel.app/api/health
```

应该返回：
```json
{
  "status": "healthy",
  "timestamp": "2026-01-07T...",
  "uptime": 123.45
}
```

## 常见问题

### Q: 部署成功但无法登录？

**A:** 确保已经：
1. 访问了 `/api/init` 初始化数据库
2. 设置了 `NEXTAUTH_SECRET` 环境变量
3. `NEXTAUTH_URL` 设置正确

### Q: 数据会丢失吗？

**A:** 
- **没有 KV**：会丢失（临时存储）
- **有 KV**：不会丢失（永久存储）

### Q: 如何迁移到 KV？

**A:** 
1. 在 Vercel 创建 KV 数据库
2. 重新部署
3. 访问 `/api/init` 重新初始化

## 成功标志

✅ 部署成功  
✅ 可以访问应用  
✅ 可以登录  
✅ 可以创建和查看数据  
✅ `/api/storage-test` 返回 OK

---

**修复时间：** 2026-01-07  
**状态：** ✅ 已修复并推送到 GitHub  
**下一步：** 在 Vercel 重新部署
