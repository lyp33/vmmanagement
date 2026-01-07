# 批量通知功能实现完成

## ✅ 实现概述

批量通知功能已成功实现，使用Vercel KV存储替代Prisma数据库。系统现在可以智能地按项目分组发送VM到期提醒邮件。

## 核心功能

### 1. 按项目分组通知
- 自动检测7天内到期的VM
- 按项目对VM进行分组
- 项目用户只收到所属项目的VM列表
- 管理员收到所有项目的完整列表

### 2. 差异化邮件内容

#### 项目用户邮件
```
主题: VM Expiry Alert: X VMs expiring in 7 days

内容:
- 汇总信息（VM数量、项目数量）
- 所属项目的VM详细列表
- 建议操作
```

#### 管理员邮件
```
主题: VM Expiry Alert: X VMs expiring in 7 days (All Projects)

内容:
- 完整汇总信息
- 所有项目的VM列表（按项目分组）
- 管理员标识说明
- 建议操作
```

### 3. 防重复机制
- 使用KV存储记录每日发送状态
- 按收件人+项目+日期建立索引
- 自动过期清理（7天）

### 4. 重试机制
- 失败邮件自动重试（最多3次）
- 每次重试间隔5秒
- 记录重试次数和错误信息

## 技术实现

### 修改的文件

#### 1. src/lib/email.ts
新增接口和方法：
```typescript
// 新增数据接口
interface VMSummary
interface ProjectVMGroup
interface BatchExpiryEmailData

// 新增方法
async sendBatchExpiryNotification(data: BatchExpiryEmailData)
private generateBatchExpiryEmailTemplate(data: BatchExpiryEmailData)
private generateBatchExpiryEmailText(data: BatchExpiryEmailData)
```

#### 2. src/lib/notification.ts
完全重构为使用KV存储：
```typescript
// 主要修改
- 移除所有Prisma引用
- 使用kvStorage替代数据库查询
- 实现按项目分组逻辑
- 新增批量通知方法

// 新增/修改的方法
async checkExpiringVMs() - 重构为按项目分组
private getProjectUsers(projectId: string)
private groupVMsByProject(vms: any[])
private sendBatchNotification(data: BatchExpiryEmailData)
private sendEmailWithRetryBatch(emailData: BatchExpiryEmailData)
private logBatchNotification(...)
private checkBatchNotificationSent(...)
```

#### 3. src/app/api/notifications/batch-test/route.ts
新增测试端点：
```typescript
GET /api/notifications/batch-test
```

### KV存储结构

#### 批量通知日志
```typescript
// List: batch_notification_logs
{
  id: string
  recipientEmail: string
  projectId: string  // "ALL_PROJECTS" for admins
  status: 'PENDING' | 'SENT' | 'FAILED'
  vmCount: number
  sentAt: string | null
  messageId?: string
  errorMessage?: string
  retryCount: number
  createdAt: string
}

// Quick lookup key (expires in 7 days)
batch_notif:{email}:{projectId}:{YYYY-MM-DD}
```

#### 单个通知日志
```typescript
// Quick lookup key (expires in 7 days)
notif:{vmId}:{YYYY-MM-DD}
```

## 工作流程

```
1. Cron Job触发 (每天UTC 9:00)
   ↓
2. 查询所有VM
   ↓
3. 筛选7天后到期的VM
   ↓
4. 加载项目和用户信息
   ↓
5. 按项目分组VM
   ↓
6. 发送项目用户通知
   │ ├─ 检查今日是否已发送
   │ ├─ 构建项目特定邮件
   │ ├─ 发送邮件（带重试）
   │ └─ 记录发送状态
   ↓
7. 发送管理员通知
   │ ├─ 检查今日是否已发送
   │ ├─ 构建完整列表邮件
   │ ├─ 发送邮件（带重试）
   │ └─ 记录发送状态
   ↓
8. 记录审计日志
   ↓
9. 返回执行结果
```

## API端点

### 1. 定时任务端点
```bash
POST /api/cron/check-expiry
Authorization: Bearer {CRON_SECRET}

# 响应
{
  "success": true,
  "timestamp": "2026-01-08T10:00:00.000Z",
  "expiryCheck": {
    "totalVMs": 50,
    "expiringVMs": 5,
    "notificationsSent": 8,
    "notificationsFailed": 0,
    "userNotifications": 6,
    "adminNotifications": 2,
    "errors": []
  },
  "retryResults": {
    "retriedCount": 0,
    "successCount": 0,
    "errors": []
  }
}
```

### 2. 测试端点
```bash
GET /api/notifications/batch-test

# 响应
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

## 配置要求

### 环境变量
```env
# Resend邮件服务
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Cron任务密钥（可选）
CRON_SECRET=your-secret-key

# Vercel KV（自动配置）
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

### Vercel Cron配置
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/check-expiry",
    "schedule": "0 9 * * *"
  }]
}
```

## 使用方法

### 自动运行（推荐）
系统每天自动运行，无需手动操作。

### 手动测试
```bash
# 开发环境
curl http://localhost:3000/api/notifications/batch-test

# 生产环境
curl https://your-domain.com/api/notifications/batch-test
```

### 手动触发Cron
```bash
curl -X POST https://your-domain.com/api/cron/check-expiry \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 邮件模板示例

### HTML邮件特性
- 响应式设计
- 清晰的表格布局
- 颜色编码的警告信息
- 项目分组展示
- 建议操作列表

### 纯文本邮件
- 完整的信息内容
- 易于阅读的格式
- 适用于不支持HTML的邮件客户端

## 监控和调试

### 查看批量通知日志
```bash
# 使用Vercel KV CLI
vercel kv lrange batch_notification_logs 0 10

# 或通过API
GET /api/notifications/logs
```

### 查看审计日志
```bash
GET /api/audit?operation=EXPIRY_CHECK
```

### 统计信息
```bash
GET /api/notifications/stats
```

## 测试数据准备

### 创建测试VM（7天后到期）
```typescript
// 通过API创建
POST /api/vms-simple
{
  "email": "test@example.com",
  "vmAccount": "test-vm-001",
  "vmInternalIP": "10.0.1.100",
  "vmDomain": "test.example.com",
  "currentExpiryDate": "2026-01-15T00:00:00.000Z", // 7天后
  "projectId": "project-id",
  "createdBy": "user-id"
}
```

### 分配用户到项目
```typescript
POST /api/projects-simple/{projectId}/assign
{
  "userId": "user-id"
}
```

### 创建管理员用户
```typescript
POST /api/users-simple
{
  "email": "admin@example.com",
  "name": "Admin User",
  "password": "password123",
  "role": "ADMIN"
}
```

## 故障排查

### 问题：邮件未发送
**检查项：**
1. RESEND_API_KEY是否配置正确
2. 查看batch_notification_logs中的错误信息
3. 确认用户已分配到项目
4. 验证VM的到期日期是否为7天后

**解决方法：**
```bash
# 检查环境变量
vercel env ls

# 查看日志
vercel logs

# 手动测试邮件配置
GET /api/notifications/test
```

### 问题：收到重复邮件
**原因：**
- 手动多次触发测试端点
- KV存储的查找键过期

**解决方法：**
- 系统会自动防止当天重复发送
- 如需重新发送，等待第二天或清除KV中的查找键

### 问题：管理员未收到邮件
**检查项：**
1. 用户role字段是否为'ADMIN'
2. 管理员邮箱地址是否正确
3. 查看batch_notification_logs

**解决方法：**
```bash
# 检查用户角色
GET /api/users-simple

# 更新用户角色
PUT /api/users-simple/{userId}
{
  "role": "ADMIN"
}
```

## 性能优化

### 已实现的优化
1. **批量查询**：一次性获取所有VM和用户
2. **并行处理**：使用Promise.all并行加载项目信息
3. **索引查找**：使用KV的快速查找键避免全表扫描
4. **自动过期**：7天后自动清理旧日志
5. **日志限制**：只保留最近5000条日志

### 未来优化建议
1. 实现邮件队列系统
2. 添加发送速率限制
3. 支持批量邮件发送API
4. 实现邮件模板缓存

## 安全考虑

### 已实现的安全措施
1. **Cron密钥验证**：可选的Bearer token验证
2. **邮件地址验证**：确保邮件地址格式正确
3. **错误处理**：不暴露敏感信息
4. **日志脱敏**：不记录密码等敏感数据

### 建议的安全措施
1. 配置CRON_SECRET环境变量
2. 使用HTTPS传输
3. 定期审查邮件发送日志
4. 限制API访问权限

## 相关文档

- [BATCH_NOTIFICATION_FEATURE.md](./BATCH_NOTIFICATION_FEATURE.md) - 功能详细说明
- [BATCH_NOTIFICATION_USAGE.md](./BATCH_NOTIFICATION_USAGE.md) - 使用指南
- [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) - KV存储配置
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

## 总结

✅ **已完成：**
- 完全移除Prisma依赖
- 使用Vercel KV存储
- 实现按项目分组通知
- 差异化用户和管理员邮件
- 防重复发送机制
- 自动重试机制
- 完整的错误处理
- 审计日志记录

🎯 **测试就绪：**
- 所有代码已通过TypeScript类型检查
- API端点已创建
- 文档已完善
- 可以开始测试

📝 **下一步：**
1. 配置Resend API密钥
2. 创建测试数据
3. 测试邮件发送
4. 部署到Vercel
5. 配置Cron任务
