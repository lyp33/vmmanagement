# 管理员账户初始化指南

## 问题说明

部署到 Vercel 后，系统没有默认的管理员账户可以登录。需要先创建管理员账户才能使用系统。

## 解决方案

### 方法1：通过 API 初始化（推荐）

部署完成后，访问以下 API 端点创建默认管理员账户：

```bash
# 检查是否已有管理员账户
curl https://your-app.vercel.app/api/admin/init

# 创建默认管理员账户
curl -X POST https://your-app.vercel.app/api/admin/init
```

**默认管理员凭据：**
- Email: `admin@vmmanagement.com`
- Password: `Admin@123456`

**重要提示：** 首次登录后请立即修改密码！

### 方法2：通过浏览器访问

1. 打开浏览器访问：
   ```
   https://your-app.vercel.app/api/admin/init
   ```

2. 查看响应，确认是否需要创建管理员

3. 使用 POST 请求创建管理员（可以使用浏览器扩展如 Postman 或 REST Client）

### 方法3：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 调用 API
vercel env pull
curl -X POST https://your-app.vercel.app/api/admin/init
```

## API 端点说明

### GET /api/admin/init

检查管理员账户是否存在

**响应示例：**
```json
{
  "adminExists": false,
  "totalUsers": 0,
  "message": "No admin account found. Call POST /api/admin/init to create one."
}
```

### POST /api/admin/init

创建默认管理员账户

**成功响应：**
```json
{
  "success": true,
  "message": "Default admin account created successfully",
  "admin": {
    "email": "admin@vmmanagement.com",
    "name": "System Administrator",
    "role": "ADMIN"
  },
  "credentials": {
    "email": "admin@vmmanagement.com",
    "password": "Admin@123456",
    "note": "Please change this password immediately after first login"
  }
}
```

**如果管理员已存在：**
```json
{
  "error": "Admin account already exists",
  "message": "An administrator account has already been created..."
}
```

## 安全注意事项

### 1. 立即修改密码

首次登录后，请立即修改默认密码：

1. 登录系统
2. 进入 Settings（设置）
3. 修改密码为强密码

### 2. 创建其他管理员

建议创建多个管理员账户以备份：

1. 以管理员身份登录
2. 进入 Users（用户管理）
3. 创建新用户并设置为 ADMIN 角色

### 3. 限制 API 访问

生产环境建议：

1. 在创建管理员后，可以考虑禁用此 API 端点
2. 或添加额外的安全验证（如 API Key）

## 首次登录流程

1. **访问应用**
   ```
   https://your-app.vercel.app
   ```

2. **自动跳转到登录页面**
   - 系统会自动重定向到 `/auth/signin`

3. **使用默认凭据登录**
   - Email: `admin@vmmanagement.com`
   - Password: `Admin@123456`

4. **修改密码**
   - 登录后立即进入 Settings
   - 修改为强密码

5. **开始使用系统**
   - 创建项目
   - 添加用户
   - 管理 VM

## 故障排查

### 问题：无法创建管理员账户

**可能原因：**
1. Vercel KV 未正确配置
2. 环境变量缺失
3. 网络问题

**解决方法：**
```bash
# 1. 检查 KV 存储
curl https://your-app.vercel.app/api/storage-test

# 2. 查看 Vercel 日志
vercel logs your-project-name

# 3. 检查环境变量
# 在 Vercel Dashboard → Settings → Environment Variables
```

### 问题：管理员已存在但忘记密码

**解决方法：**

1. 通过 Vercel KV Dashboard 直接操作：
   - 访问 Vercel Dashboard
   - 进入 Storage → KV
   - 找到用户数据并重置

2. 或创建新的管理员账户（需要先删除现有管理员）

### 问题：登录后无法访问功能

**检查项：**
1. 确认用户角色为 ADMIN
2. 检查浏览器控制台错误
3. 查看 Vercel 日志

## 部署后检查清单

- [ ] 访问应用 URL
- [ ] 确认自动跳转到登录页面
- [ ] 调用 GET /api/admin/init 检查状态
- [ ] 调用 POST /api/admin/init 创建管理员
- [ ] 使用默认凭据登录
- [ ] 修改默认密码
- [ ] 创建测试项目
- [ ] 创建测试用户
- [ ] 测试 VM 管理功能
- [ ] 测试邮件通知功能

## 相关文档

- [POST_DEPLOYMENT_CHECKLIST.md](./POST_DEPLOYMENT_CHECKLIST.md) - 部署后验证清单
- [USER_MANUAL.md](./USER_MANUAL.md) - 用户手册
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) - 管理员指南
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Vercel 部署文档

## 技术实现

### 代码修改

1. **首页重定向** (`src/app/page.tsx`)
   - 已登录：跳转到 `/dashboard`
   - 未登录：跳转到 `/auth/signin`

2. **登录页面** (`src/app/auth/signin/page.tsx`)
   - 移除测试账户显示
   - 保持简洁的登录界面

3. **管理员初始化 API** (`src/app/api/admin/init/route.ts`)
   - GET: 检查管理员是否存在
   - POST: 创建默认管理员账户
   - 安全检查：防止重复创建

### 默认凭据

```typescript
{
  email: 'admin@vmmanagement.com',
  name: 'System Administrator',
  password: 'Admin@123456',
  role: 'ADMIN'
}
```

### 安全特性

1. **密码加密**：使用 bcrypt 加密存储
2. **防重复创建**：检查是否已有管理员
3. **强密码提示**：提醒用户修改默认密码
4. **角色验证**：确保只有 ADMIN 角色才有管理权限

## 快速开始

```bash
# 1. 部署应用到 Vercel
git push

# 2. 等待部署完成
# 访问 https://vercel.com/dashboard 查看状态

# 3. 创建管理员账户
curl -X POST https://your-app.vercel.app/api/admin/init

# 4. 登录系统
# 访问 https://your-app.vercel.app
# 使用 admin@vmmanagement.com / Admin@123456

# 5. 修改密码
# 进入 Settings → Change Password
```

完成！现在你可以开始使用 VM Expiry Management System 了。
