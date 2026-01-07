# 批量通知功能使用指南

## 功能说明

批量通知功能已成功实现，主要特性包括：

### ✅ 已实现的功能

1. **按项目分组发送邮件**
   - 系统自动检测即将到期的VM（7天内）
   - 将VM按所属项目进行分组
   - 每个项目的用户只收到该项目的VM列表

2. **差异化通知**
   - **项目用户**：收到所分配项目的VM列表
   - **管理员**：收到所有项目的完整VM列表

3. **防重复发送**
   - 系统自动检查当天是否已发送通知
   - 避免重复发送邮件

4. **重试机制**
   - 失败的邮件自动重试（最多3次）
   - 每次重试间隔5秒

## 代码修改说明

### 1. 邮件服务 (src/lib/email.ts)

新增接口和方法：
```typescript
// 新增的数据接口
interface VMSummary {
  vmAccount: string;
  vmDomain: string;
  vmInternalIP: string;
  currentExpiryDate: Date;
  email: string;
}

interface ProjectVMGroup {
  projectName: string;
  vms: VMSummary[];
}

interface BatchExpiryEmailData {
  recipientEmail: string;
  recipientName?: string;
  isAdmin: boolean;
  projectGroups: ProjectVMGroup[];
}

// 新增的方法
async sendBatchExpiryNotification(data: BatchExpiryEmailData)
```

### 2. 通知服务 (src/lib/notification.ts)

重构了 `checkExpiringVMs()` 方法：
- 按项目分组VM
- 给项目用户发送项目特定的通知
- 给管理员发送完整列表
- 记录批量通知日志

新增方法：
```typescript
private groupVMsByProject(vms: any[])
private sendBatchNotification(data: BatchExpiryEmailData)
private sendEmailWithRetryBatch(emailData: BatchExpiryEmailData, retryCount = 0)
private logBatchNotification(...)
private checkBatchNotificationSent(recipientEmail: string, projectId: string)
```

### 3. 数据库Schema (prisma/schema.prisma)

新增表：
```prisma
model BatchNotificationLog {
  id             String             @id @default(cuid())
  recipientEmail String
  projectId      String             // "ALL_PROJECTS" for admin
  status         NotificationStatus @default(PENDING)
  vmCount        Int                @default(0)
  sentAt         DateTime?
  errorMessage   String?
  retryCount     Int                @default(0)
  createdAt      DateTime           @default(now())
}
```

### 4. 测试API (src/app/api/notifications/batch-test/route.ts)

新增测试端点用于手动触发批量通知。

## 使用方法

### 方法1：通过定时任务自动运行

系统会每天自动运行（通过Vercel Cron配置）：

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/check-expiry",
    "schedule": "0 9 * * *"  // 每天UTC 9:00运行
  }]
}
```

### 方法2：手动触发测试

访问测试端点：
```bash
# 开发环境
http://localhost:3000/api/notifications/batch-test

# 生产环境
https://your-domain.com/api/notifications/batch-test
```

### 方法3：通过API调用

```bash
# POST请求到cron端点
curl -X POST http://localhost:3000/api/cron/check-expiry \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 邮件示例

### 项目用户收到的邮件

```
主题: VM Expiry Alert: 3 VMs expiring in 7 days

Hello John Doe,

⚠️ Action Required: 3 VM(s) will expire in 7 days.

Summary:
- Total VMs expiring: 3
- Projects affected: 1
- Expiry date: 7 days from now

You are receiving this notification because you are assigned to the following project(s).

📁 Project Alpha
3 VM(s) expiring in this project:

| VM Account | Domain    | Internal IP | Contact Email  | Expiry Date      |
|------------|-----------|-------------|----------------|------------------|
| vm-001     | app.com   | 10.0.1.10   | user@app.com   | Jan 15, 2026 9:00|
| vm-002     | api.com   | 10.0.1.11   | user@api.com   | Jan 15, 2026 9:00|
| vm-003     | db.com    | 10.0.1.12   | user@db.com    | Jan 15, 2026 9:00|

📋 Recommended Actions
- Extend the VM expiry date
- Backup important data before expiry
- Transfer resources to another VM
- Decommission VMs that are no longer needed
```

### 管理员收到的邮件

```
主题: VM Expiry Alert: 5 VMs expiring in 7 days (All Projects)

Hello Admin,

Note: As an administrator, you are receiving the complete list 
of all expiring VMs across all projects.

⚠️ Action Required: 5 VM(s) will expire in 7 days.

Summary:
- Total VMs expiring: 5
- Projects affected: 2
- Expiry date: 7 days from now

📁 Project Alpha
3 VM(s) expiring in this project:
[VM列表...]

📁 Project Beta
2 VM(s) expiring in this project:
[VM列表...]

📋 Recommended Actions
[建议操作...]
```

## 数据库迁移

运行以下命令应用数据库更改：

```bash
# 开发环境
cd vm-expiry-management
npx prisma db push

# 或者使用迁移
npx prisma migrate deploy
```

迁移文件位置：
```
prisma/migrations/20260108000000_add_batch_notifications/migration.sql
```

## 测试数据准备

要测试批量通知功能，需要准备以下数据：

### 1. 创建测试项目
```sql
INSERT INTO projects (id, name, description, createdAt, updatedAt)
VALUES ('test-project-1', 'Test Project Alpha', 'Test project for notifications', datetime('now'), datetime('now'));
```

### 2. 创建测试用户
```sql
-- 普通用户
INSERT INTO users (id, email, name, role, createdAt, updatedAt)
VALUES ('test-user-1', 'user@test.com', 'Test User', 'USER', datetime('now'), datetime('now'));

-- 管理员
INSERT INTO users (id, email, name, role, createdAt, updatedAt)
VALUES ('test-admin-1', 'admin@test.com', 'Test Admin', 'ADMIN', datetime('now'), datetime('now'));
```

### 3. 分配用户到项目
```sql
INSERT INTO project_assignments (id, userId, projectId, assignedAt)
VALUES ('test-assign-1', 'test-user-1', 'test-project-1', datetime('now'));
```

### 4. 创建即将到期的VM
```sql
-- 创建7天后到期的VM
INSERT INTO vm_records (
  id, email, vmAccount, vmInternalIP, vmDomain, 
  currentExpiryDate, projectId, createdBy, createdAt, updatedAt
)
VALUES (
  'test-vm-1',
  'vm-owner@test.com',
  'test-vm-001',
  '10.0.1.100',
  'test.example.com',
  datetime('now', '+7 days'),
  'test-project-1',
  'test-user-1',
  datetime('now'),
  datetime('now')
);
```

## 监控和调试

### 查看批量通知日志

```sql
-- 查看最近的批量通知
SELECT * FROM batch_notification_logs 
ORDER BY createdAt DESC 
LIMIT 10;

-- 查看失败的通知
SELECT * FROM batch_notification_logs 
WHERE status = 'FAILED'
ORDER BY createdAt DESC;

-- 统计通知发送情况
SELECT 
  status,
  COUNT(*) as count,
  SUM(vmCount) as total_vms
FROM batch_notification_logs
GROUP BY status;
```

### 查看审计日志

```sql
-- 查看到期检查记录
SELECT * FROM audit_logs 
WHERE operation = 'EXPIRY_CHECK'
ORDER BY timestamp DESC
LIMIT 5;
```

## 环境变量配置

确保以下环境变量已配置：

```env
# 数据库连接
DATABASE_URL="file:./dev.db"

# Resend邮件服务API密钥
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# Cron任务密钥（可选，用于安全验证）
CRON_SECRET="your-secret-key"
```

## 常见问题

### Q: 邮件没有发送？
A: 检查以下几点：
1. `RESEND_API_KEY` 是否正确配置
2. 查看 `batch_notification_logs` 表的错误信息
3. 确认用户已分配到项目
4. 确认VM的到期日期是7天后

### Q: 收到重复邮件？
A: 系统会自动防止当天重复发送。如果收到重复邮件，检查：
1. 是否手动多次触发了测试端点
2. 数据库中的 `batch_notification_logs` 记录

### Q: 管理员没有收到邮件？
A: 确认：
1. 用户的 `role` 字段是否为 `ADMIN`
2. 管理员的邮箱地址是否正确
3. 查看 `batch_notification_logs` 中是否有该管理员的记录

### Q: 如何修改邮件模板？
A: 编辑 `src/lib/email.ts` 中的以下方法：
- `generateBatchExpiryEmailTemplate()` - HTML模板
- `generateBatchExpiryEmailText()` - 纯文本模板

## 下一步

1. **配置Resend API密钥**
   - 注册 https://resend.com
   - 获取API密钥
   - 添加到 `.env.local`

2. **测试功能**
   - 创建测试数据
   - 访问测试端点
   - 检查邮件发送情况

3. **部署到生产环境**
   - 配置Vercel Cron
   - 设置环境变量
   - 监控日志

## 相关文档

- [BATCH_NOTIFICATION_FEATURE.md](./BATCH_NOTIFICATION_FEATURE.md) - 详细功能说明
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [USER_MANUAL.md](./USER_MANUAL.md) - 用户手册
