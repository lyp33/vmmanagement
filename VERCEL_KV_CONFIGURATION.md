# Vercel KV 配置指南

## 📋 前提条件

- 已将项目部署到 Vercel
- 有 Vercel 账号访问权限
- 项目已成功部署

## 🚀 配置步骤

### 步骤 1: 访问 Vercel Dashboard

1. 登录 Vercel: https://vercel.com/dashboard
2. 选择你的项目（vm-expiry-management）
3. 点击项目进入项目详情页

### 步骤 2: 创建 KV 数据库

#### 方法 A: 通过 Storage 标签（推荐）

1. 在项目页面，点击顶部的 **"Storage"** 标签
2. 点击 **"Create Database"** 按钮
3. 选择 **"KV"** (Key-Value Store)
4. 填写数据库信息：
   - **Database Name**: `vm-management-kv` (或任意名称)
   - **Region**: 选择离你最近的区域（如 `Washington, D.C., USA (iad1)`）
5. 点击 **"Create"** 按钮

#### 方法 B: 通过 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 登录
vercel login

# 进入项目目录
cd vm-expiry-management

# 创建 KV 数据库
vercel kv create vm-management-kv
```

### 步骤 3: 连接 KV 到项目

创建 KV 数据库后，需要将其连接到你的项目：

1. 在 Storage 页面，找到刚创建的 KV 数据库
2. 点击数据库名称进入详情页
3. 点击 **"Connect Project"** 按钮
4. 选择你的项目（vm-expiry-management）
5. 选择环境：
   - ✅ **Production** (必选)
   - ✅ **Preview** (可选，推荐)
   - ✅ **Development** (可选)
6. 点击 **"Connect"** 按钮

### 步骤 4: 验证环境变量

连接后，Vercel 会自动添加以下环境变量到你的项目：

```env
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

**验证步骤：**

1. 在项目页面，点击 **"Settings"** 标签
2. 点击左侧的 **"Environment Variables"**
3. 确认看到以上 4 个 KV 相关的环境变量
4. 确保它们在 **Production** 环境中已启用

### 步骤 5: 重新部署项目

环境变量添加后，需要重新部署才能生效：

#### 方法 A: 通过 Dashboard

1. 在项目页面，点击 **"Deployments"** 标签
2. 找到最新的部署
3. 点击右侧的 **"..."** 菜单
4. 选择 **"Redeploy"**
5. 确认重新部署

#### 方法 B: 通过 Git 推送

```bash
# 创建一个空提交触发部署
git commit --allow-empty -m "chore: trigger redeploy for KV setup"
git push
```

#### 方法 C: 通过 Vercel CLI

```bash
vercel --prod
```

### 步骤 6: 测试 KV 连接

部署完成后，测试 KV 是否正常工作：

```bash
# 测试 KV 存储
curl https://your-app.vercel.app/api/storage-test
```

**预期响应：**
```json
{
  "success": true,
  "storage": "vercel-kv",
  "operations": {
    "write": "success",
    "read": "success",
    "delete": "success"
  },
  "timestamp": "2026-01-08T..."
}
```

### 步骤 7: 初始化管理员账户

KV 配置成功后，创建管理员账户：

```bash
# 创建默认管理员
curl -X POST https://your-app.vercel.app/api/admin/init
```

**预期响应：**
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

## 📊 KV 数据库管理

### 查看数据

1. 在 Vercel Dashboard，进入 **Storage** 标签
2. 点击你的 KV 数据库
3. 点击 **"Data"** 标签
4. 可以查看、搜索、编辑数据

### 使用 Vercel CLI 管理

```bash
# 列出所有 keys
vercel kv lrange users 0 -1

# 获取特定 key 的值
vercel kv get user:email:admin@vmmanagement.com

# 设置值
vercel kv set test-key "test-value"

# 删除 key
vercel kv del test-key

# 查看数据库信息
vercel kv info
```

## 🔍 故障排查

### 问题 1: 找不到 Storage 标签

**原因：** 可能是账号权限问题或项目类型不支持

**解决方法：**
1. 确认你是项目的 Owner 或有足够权限
2. 尝试刷新页面
3. 使用 Vercel CLI 创建：`vercel kv create`

### 问题 2: 环境变量未自动添加

**解决方法：**
1. 手动连接 KV 到项目（步骤 3）
2. 或手动添加环境变量：
   - 进入 Settings → Environment Variables
   - 从 KV 详情页复制变量值
   - 手动添加到项目

### 问题 3: KV 连接失败

**检查步骤：**

```bash
# 1. 检查环境变量
curl https://your-app.vercel.app/api/health

# 2. 查看部署日志
vercel logs your-project-name --follow

# 3. 测试 KV 连接
curl https://your-app.vercel.app/api/storage-test
```

**常见错误：**

- `KV_URL is not defined`: 环境变量未配置
- `Connection refused`: KV 数据库未创建或未连接
- `Unauthorized`: Token 错误或过期

### 问题 4: 数据未持久化

**可能原因：**
1. 使用了错误的存储实现
2. KV 连接未正确配置

**验证方法：**
```bash
# 检查存储类型
curl https://your-app.vercel.app/api/health

# 应该返回 "storage": "vercel-kv"
```

## 💰 KV 定价和限制

### 免费计划 (Hobby)

- **存储**: 256 MB
- **请求**: 30,000 次/月
- **带宽**: 100 MB/月
- **数据库数量**: 1 个

### Pro 计划

- **存储**: 512 MB (可扩展)
- **请求**: 500,000 次/月
- **带宽**: 1 GB/月
- **数据库数量**: 无限制

### 监控使用量

1. 进入 Storage → 你的 KV 数据库
2. 查看 **"Usage"** 标签
3. 监控：
   - 存储使用量
   - 请求次数
   - 带宽使用

## 🔐 安全最佳实践

### 1. 保护环境变量

- ✅ 不要将 KV Token 提交到 Git
- ✅ 使用 Vercel 的环境变量管理
- ✅ 定期轮换 Token（如果需要）

### 2. 访问控制

- ✅ 使用 Read-Only Token 进行只读操作
- ✅ 限制 API 端点的访问权限
- ✅ 实现速率限制

### 3. 数据备份

```bash
# 导出所有数据（需要自己实现）
curl https://your-app.vercel.app/api/export-simple > backup.json

# 或使用 Vercel CLI
vercel kv lrange users 0 -1 > users-backup.json
```

## 📝 完整配置检查清单

- [ ] 创建 Vercel KV 数据库
- [ ] 连接 KV 到项目
- [ ] 验证环境变量已添加
- [ ] 重新部署项目
- [ ] 测试 KV 连接 (`/api/storage-test`)
- [ ] 测试健康检查 (`/api/health`)
- [ ] 初始化管理员账户 (`/api/admin/init`)
- [ ] 登录系统验证功能
- [ ] 创建测试数据
- [ ] 验证数据持久化
- [ ] 设置使用量监控

## 🎯 快速配置命令

```bash
# 1. 创建 KV 数据库
vercel kv create vm-management-kv

# 2. 连接到项目（在 Dashboard 操作）

# 3. 重新部署
git commit --allow-empty -m "chore: setup KV"
git push

# 4. 等待部署完成，然后测试
curl https://your-app.vercel.app/api/storage-test

# 5. 初始化管理员
curl -X POST https://your-app.vercel.app/api/admin/init

# 6. 访问应用
open https://your-app.vercel.app
```

## 📚 相关文档

- [Vercel KV 官方文档](https://vercel.com/docs/storage/vercel-kv)
- [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) - 详细设置指南
- [ADMIN_INITIALIZATION.md](./ADMIN_INITIALIZATION.md) - 管理员初始化
- [POST_DEPLOYMENT_CHECKLIST.md](./POST_DEPLOYMENT_CHECKLIST.md) - 部署检查清单

## 🆘 需要帮助？

如果遇到问题：

1. **查看 Vercel 日志**
   ```bash
   vercel logs your-project-name --follow
   ```

2. **检查 KV 状态**
   - Dashboard → Storage → 你的 KV 数据库
   - 查看 Status 和 Usage

3. **测试端点**
   ```bash
   curl https://your-app.vercel.app/api/health
   curl https://your-app.vercel.app/api/storage-test
   ```

4. **联系支持**
   - Vercel Support: https://vercel.com/support
   - 查看社区论坛

---

配置完成后，你的 VM Expiry Management System 就可以正常使用了！🎉
