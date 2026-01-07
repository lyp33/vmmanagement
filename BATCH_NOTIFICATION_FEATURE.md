# 批量通知功能 (Batch Notification Feature)

## 概述 (Overview)

批量通知功能实现了智能的VM到期提醒邮件发送机制，按项目分组发送通知，确保相关人员及时收到准确的信息。

The batch notification feature implements an intelligent VM expiry reminder email system that groups notifications by project, ensuring relevant personnel receive accurate and timely information.

## 功能特性 (Features)

### 1. 按项目分组 (Group by Project)
- 系统自动检测即将到期的VM（7天内）
- 将VM按所属项目进行分组
- 每个项目的用户只收到该项目的VM列表

### 2. 差异化通知 (Differentiated Notifications)

#### 项目用户 (Project Users)
- 接收所分配项目的VM到期列表
- 邮件标题：`VM Expiry Alert: X VMs expiring in 7 days`
- 只包含用户有权限的项目信息

#### 管理员 (Administrators)
- 接收所有项目的完整VM到期列表
- 邮件标题：`VM Expiry Alert: X VMs expiring in 7 days (All Projects)`
- 包含所有即将到期的VM，按项目分组显示

### 3. 邮件内容 (Email Content)

每封邮件包含：
- 汇总信息：总VM数量、影响的项目数量
- 项目分组：每个项目的VM详细列表
- VM详细信息：
  - VM账号 (VM Account)
  - 域名 (Domain)
  - 内部IP (Internal IP)
  - 联系邮箱 (Contact Email)
  - 到期日期 (Expiry Date)
- 建议操作：续期、备份、迁移等

## 数据库结构 (Database Schema)

### BatchNotificationLog 表

```sql
CREATE TABLE "batch_notification_logs" (
    "id" TEXT PRIMARY KEY,
    "recipientEmail" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,  -- "ALL_PROJECTS" for admin
    "status" TEXT DEFAULT 'PENDING',
    "vmCount" INTEGER DEFAULT 0,
    "sentAt" DATETIME,
    "errorMessage" TEXT,
    "retryCount" INTEGER DEFAULT 0,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API 端点 (API Endpoints)

### 1. 定时任务检查 (Cron Job Check)
```
POST /api/cron/check-expiry
```
- 每天自动运行
- 检测即将到期的VM
- 发送批量通知

### 2. 测试端点 (Test Endpoint)
```
GET /api/notifications/batch-test
```
- 手动触发批量通知测试
- 返回详细的执行结果

## 工作流程 (Workflow)

1. **检测到期VM** (Detect Expiring VMs)
   - 查询7天后到期的所有VM
   - 加载VM的项目和用户关联信息

2. **按项目分组** (Group by Project)
   - 将VM按projectId分组
   - 收集每个项目的用户列表

3. **发送项目通知** (Send Project Notifications)
   - 遍历每个项目
   - 给项目用户发送该项目的VM列表
   - 记录发送状态

4. **发送管理员通知** (Send Admin Notifications)
   - 查询所有管理员用户
   - 发送包含所有项目的完整列表
   - 记录发送状态

5. **防重复发送** (Prevent Duplicates)
   - 检查当天是否已发送
   - 避免重复通知

6. **重试机制** (Retry Mechanism)
   - 失败的邮件自动重试（最多3次）
   - 每次重试间隔5秒

## 配置要求 (Configuration Requirements)

### 环境变量 (Environment Variables)

```env
# Resend API Key for email sending
RESEND_API_KEY=your_resend_api_key

# Optional: Cron job secret for security
CRON_SECRET=your_cron_secret
```

### Vercel Cron 配置 (Vercel Cron Configuration)

在 `vercel.json` 中配置：

```json
{
  "crons": [{
    "path": "/api/cron/check-expiry",
    "schedule": "0 9 * * *"
  }]
}
```

## 使用示例 (Usage Examples)

### 手动测试 (Manual Test)

```bash
# 测试批量通知功能
curl http://localhost:3000/api/notifications/batch-test

# 或使用浏览器访问
http://localhost:3000/api/notifications/batch-test
```

### 响应示例 (Response Example)

```json
{
  "success": true,
  "timestamp": "2026-01-08T10:00:00.000Z",
  "result": {
    "totalVMs": 50,
    "expiringVMs": 5,
    "notificationsSent": 8,
    "notificationsFailed": 0,
    "userNotifications": 6,
    "adminNotifications": 2,
    "errors": []
  }
}
```

## 邮件模板 (Email Template)

### 项目用户邮件 (Project User Email)

```
Subject: VM Expiry Alert: 3 VMs expiring in 7 days

Hello [User Name],

⚠️ Action Required: 3 VM(s) will expire in 7 days.

Summary:
- Total VMs expiring: 3
- Projects affected: 1
- Expiry date: 7 days from now

PROJECT: Project Alpha
3 VM(s) expiring in this project:

| VM Account | Domain | Internal IP | Contact Email | Expiry Date |
|------------|--------|-------------|---------------|-------------|
| vm-001     | app.com| 10.0.1.10   | user@app.com  | Jan 15, 2026|
| vm-002     | api.com| 10.0.1.11   | user@api.com  | Jan 15, 2026|
| vm-003     | db.com | 10.0.1.12   | user@db.com   | Jan 15, 2026|

Recommended Actions:
- Extend the VM expiry date
- Backup important data before expiry
- Transfer resources to another VM
```

### 管理员邮件 (Admin Email)

```
Subject: VM Expiry Alert: 5 VMs expiring in 7 days (All Projects)

Hello [Admin Name],

Note: As an administrator, you are receiving the complete list 
of all expiring VMs across all projects.

⚠️ Action Required: 5 VM(s) will expire in 7 days.

Summary:
- Total VMs expiring: 5
- Projects affected: 2
- Expiry date: 7 days from now

PROJECT: Project Alpha
3 VM(s) expiring...

PROJECT: Project Beta
2 VM(s) expiring...
```

## 监控和日志 (Monitoring and Logging)

### 审计日志 (Audit Logs)

系统会记录以下操作：
- `EXPIRY_CHECK`: 每次到期检查
- `NOTIFICATION_SENT`: 成功发送通知
- `NOTIFICATION_FAILED`: 发送失败

### 通知日志 (Notification Logs)

`batch_notification_logs` 表记录：
- 接收人邮箱
- 项目ID
- 发送状态
- VM数量
- 错误信息
- 重试次数

## 故障排查 (Troubleshooting)

### 邮件未发送 (Emails Not Sent)

1. 检查 `RESEND_API_KEY` 是否配置
2. 查看 `batch_notification_logs` 表的错误信息
3. 检查用户是否分配到项目
4. 确认VM的到期日期是否正确

### 重复发送 (Duplicate Emails)

- 系统会自动检查当天是否已发送
- 如果需要重新发送，删除当天的日志记录

### 管理员未收到邮件 (Admins Not Receiving)

- 确认用户的 `role` 字段为 `ADMIN`
- 检查管理员的邮箱地址是否正确

## 最佳实践 (Best Practices)

1. **定期检查日志**
   - 监控 `batch_notification_logs` 表
   - 关注失败的通知

2. **测试邮件配置**
   - 使用测试端点验证功能
   - 确保邮件模板正确显示

3. **用户分配**
   - 确保所有项目都分配了用户
   - 至少配置一个管理员账号

4. **时区设置**
   - 注意Vercel Cron的时区（UTC）
   - 调整发送时间以适应用户时区

## 未来改进 (Future Improvements)

- [ ] 支持自定义通知时间（3天、5天、7天）
- [ ] 支持多语言邮件模板
- [ ] 添加邮件发送统计仪表板
- [ ] 支持Slack/Teams等其他通知渠道
- [ ] 允许用户自定义通知偏好
