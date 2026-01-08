# 数据持久化问题修复

## 问题描述

1. **Dashboard显示测试数据** - 统计数字是硬编码的，不是实时数据
2. **Audit页面显示mock数据** - 显示的是假数据，不是真实操作记录
3. **创建用户后刷新消失** - 数据没有真正保存到存储

## 根本原因

所有 `-simple` API（`users-simple`, `projects-simple`, `vms-simple`, `audit-simple`）都在使用 `mockData`，而不是真实的存储系统（KV或文件存储）。

## 已修复的文件

### 1. Dashboard页面 (`src/app/dashboard/page.tsx`)
**修改前：** 硬编码的统计数据
```typescript
const stats = [
  { title: "Total VMs", value: "24", ... },
  { title: "Projects", value: "8", ... },
  ...
]
```

**修改后：** 从API实时获取
```typescript
useEffect(() => {
  const fetchDashboardData = async () => {
    const vmsRes = await fetch('/api/vms')
    const projectsRes = await fetch('/api/projects-simple')
    const usersRes = await fetch('/api/users-simple')
    // 计算实时统计数据
  }
}, [session])
```

### 2. Users API (`src/app/api/users-simple/route.ts`)
**修改前：** 使用 `mockData.getUsers()` 和 `mockData.createUser()`

**修改后：** 使用真实存储
```typescript
// GET - 获取所有用户
const users = await storage.findAllUsers()

// POST - 创建新用户
const hashedPassword = await bcrypt.hash(password, 10)
const newUser = await storage.createUser({
  email, name, password: hashedPassword, role
})
```

### 3. Projects API (`src/app/api/projects-simple/route.ts`)
**修改前：** 使用 `mockData.getProjects()` 和 `mockData.createProject()`

**修改后：** 使用真实存储
```typescript
// GET - 获取所有项目
const projects = await storage.findAllProjects()

// POST - 创建新项目
const newProject = await storage.createProject({ name, description })
```

### 4. VMs API (`src/app/api/vms-simple/route.ts`)
**修改前：** 使用 `mockData.getVMs()` 和 `mockData.createVM()`

**修改后：** 使用真实存储
```typescript
// GET - 获取所有VM
let vms = await storage.findAllVMs()

// POST - 创建新VM
const newVM = await storage.createVMRecord({
  email, vmAccount, vmInternalIP, vmDomain,
  currentExpiryDate, projectId, createdBy: currentUser.id
})
```

### 5. Audit API (`src/app/api/audit-simple/route.ts`)
**修改前：** 返回硬编码的mock数据

**修改后：** 从存储读取真实审计日志
```typescript
const limit = limitParam ? parseInt(limitParam, 10) : 100
const logs = await storage.findAuditLogs(limit)
```

### 6. Storage接口更新
添加了缺失的方法：
- `storage.ts`: 添加 `findAllUsers()` 到接口
- `file-storage.ts`: 实现 `findAllUsers()` 方法
- `file-storage.ts`: 更新 `findAuditLogs()` 支持limit参数

## 现在的行为

### 在本地开发环境（文件存储）
- 数据保存在 `data/storage.json` 文件中
- 创建的用户、项目、VM会持久化到文件
- 刷新页面后数据仍然存在

### 在Vercel生产环境（KV存储）
**前提条件：** 必须先修复KV环境变量（参考 `FIX_ADMIN_INIT.md`）

修复KV连接后：
- 所有数据保存到Vercel KV数据库
- Dashboard显示真实的统计数据
- Audit页面显示真实的操作记录
- 创建的用户、项目、VM会永久保存
- 刷新页面后数据不会消失

## 重要提示

⚠️ **Vercel部署的应用目前仍在使用文件存储**，因为KV环境变量名称不正确。

必须按照 `FIX_ADMIN_INIT.md` 的步骤修复KV连接：
1. 重命名环境变量（删除 `vm_management_` 前缀）
2. 重新部署应用
3. 验证存储类型为 `vercel-kv`

修复后，所有功能将正常工作：
- ✅ Dashboard显示实时数据
- ✅ Audit显示真实操作记录
- ✅ 创建的数据会持久化
- ✅ 刷新页面数据不会消失

## 验证步骤

### 1. 检查存储类型
```
GET https://vmmanagement.vercel.app/api/storage-test
```

应该返回：
```json
{
  "storageType": "vercel-kv",  // 不是 "file"
  "tests": {
    "connection": "OK",
    "readWrite": "OK - No admin yet"
  }
}
```

### 2. 测试创建用户
1. 登录管理员账户
2. 创建一个新用户
3. 刷新页面
4. 新用户应该仍然存在

### 3. 检查Dashboard
1. 打开Dashboard
2. 统计数字应该显示真实数据（不是24, 8, 12）
3. 如果没有数据，应该显示0

### 4. 检查Audit日志
1. 打开Audit Logs页面
2. 应该显示真实的操作记录
3. 如果没有操作，应该显示"No audit records found"

## 技术细节

### 存储切换逻辑
```typescript
// src/lib/storage.ts
const isKVAvailable = () => {
  return process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
}

const getStorage = async () => {
  if (isKVAvailable()) {
    return kvStorage  // Vercel KV
  } else {
    return fileStorage  // 本地文件
  }
}
```

### 数据流
```
用户操作 → API路由 → storage.ts → KV/文件存储
                                    ↓
                            数据持久化保存
```

## 下一步

1. **修复KV连接** - 按照 `FIX_ADMIN_INIT.md` 操作
2. **初始化管理员** - POST到 `/api/admin/init`
3. **测试所有功能** - 创建用户、项目、VM
4. **验证数据持久化** - 刷新页面确认数据存在

## 提交记录

- Commit 1: `cba35e3` - Dashboard实时数据
- Commit 2: `7e3166e` - 所有API使用真实存储
