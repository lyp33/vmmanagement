# 部署后验证清单

## ✅ 环境变量已配置

你已经在 Vercel 配置了以下环境变量：
- ✅ NEXTAUTH_SECRET
- ✅ NEXTAUTH_URL
- ✅ RESEND_API_KEY
- ✅ CRON_SECRET (可选)
- ✅ Vercel KV (自动配置)

## 📋 部署后验证步骤

### 1. 触发重新部署

**选项 A：通过 Git 推送**
```bash
cd vm-expiry-management
git add .
git commit -m "Add batch notification feature with KV storage"
git push
```

**选项 B：Vercel Dashboard**
1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. 进入 "Deployments" 标签
4. 点击最新部署旁的 "..." 菜单
5. 选择 "Redeploy"

### 2. 验证部署成功

等待部署完成后，检查：

```bash
# 访问你的生产环境 URL
https://your-app.vercel.app

# 检查健康状态
https://your-app.vercel.app/api/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2026-01-08T...",
  "environment": "production",
  "storage": "vercel-kv"
}
```

### 3. 测试批量通知功能

```bash
# 访问测试端点
https://your-app.vercel.app/api/notifications/batch-test
```

预期响应：
```json
{
  "success": true,
  "timestamp": "2026-01-08T...",
  "result": {
    "totalVMs": 0,
    "expiringVMs": 0,
    "notificationsSent": 0,
    "notificationsFailed": 0,
    "userNotifications": 0,
    "adminNotifications": 0,
    "errors": []
  }
}
```

### 4. 验证 Cron Job 配置

**在 Vercel Dashboard 中：**
1. 进入项目设置
2. 点击 "Cron Jobs" 标签
3. 确认看到：
   - Path: `/api/cron/check-expiry`
   - Schedule: `0 9 * * *` (每天 UTC 9:00)
   - Status: Active

### 5. 创建测试数据

登录应用并创建测试数据：

**A. 创建项目**
```
名称: Test Project
描述: For testing batch notifications
```

**B. 创建用户**
```
普通用户:
- Email: user@test.com
- Name: Test User
- Role: USER

管理员:
- Email: admin@test.com
- Name: Admin User
- Role: ADMIN
```

**C. 分配用户到项目**
- 将 Test User 分配到 Test Project

**D. 创建测试 VM（7天后到期）**
```
Email: vm-owner@test.com
VM Account: test-vm-001
VM Domain: test.example.com
Internal IP: 10.0.1.100
Expiry Date: 2026-01-15 (7天后)
Project: Test Project
```

### 6. 手动触发通知测试

```bash
# 方法1：访问测试端点
curl https://your-app.vercel.app/api/notifications/batch-test

# 方法2：手动触发 Cron（需要 CRON_SECRET）
curl -X POST https://your-app.vercel.app/api/cron/check-expiry \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 7. 验证邮件发送

检查以下邮箱：
- ✅ user@test.com - 应收到项目特定的VM列表
- ✅ admin@test.com - 应收到所有项目的完整列表

**邮件内容检查：**
- [ ] 主题正确
- [ ] 收件人姓名显示正确
- [ ] VM 列表按项目分组
- [ ] 表格格式正确
- [ ] 到期日期正确
- [ ] 建议操作列表显示

### 8. 检查日志

**在 Vercel Dashboard：**
1. 进入项目
2. 点击 "Logs" 标签
3. 查看最近的日志输出

**查找关键日志：**
```
✅ "Starting expiry check cron job..."
✅ "Expiry check completed"
✅ "No VMs expiring in 7 days" (如果没有到期VM)
✅ 或看到发送的通知数量
```

### 9. 验证 KV 存储

```bash
# 检查存储状态
curl https://your-app.vercel.app/api/storage-test
```

预期响应：
```json
{
  "success": true,
  "storage": "vercel-kv",
  "operations": {
    "write": "success",
    "read": "success",
    "delete": "success"
  }
}
```

### 10. 监控 Cron 执行

**等待第二天 UTC 9:00**
- Cron 会自动运行
- 检查 Vercel Logs 确认执行
- 如果有到期 VM，应该会发送邮件

## 🔍 故障排查

### 问题：邮件未发送

**检查清单：**
1. ✅ RESEND_API_KEY 是否正确配置
2. ✅ Resend 账号是否激活
3. ✅ 是否验证了发件域名（或使用测试域名）
4. ✅ 查看 Vercel Logs 中的错误信息
5. ✅ 检查 Resend Dashboard 的发送日志

**解决方法：**
```bash
# 查看详细日志
vercel logs your-project-name --follow

# 或在 Vercel Dashboard 查看
```

### 问题：Cron 未执行

**检查清单：**
1. ✅ vercel.json 中的 cron 配置是否正确
2. ✅ 项目是否在 Pro 计划（免费计划有限制）
3. ✅ Cron Jobs 标签中状态是否为 Active

**解决方法：**
- 确保项目已重新部署
- 在 Vercel Dashboard 手动触发一次

### 问题：环境变量未生效

**解决方法：**
1. 确认环境变量已保存
2. 重新部署项目
3. 检查环境变量的作用域（Production/Preview/Development）

### 问题：KV 存储错误

**检查：**
```bash
# 测试 KV 连接
curl https://your-app.vercel.app/api/storage-test
```

**解决方法：**
- 确认 Vercel KV 已创建并连接到项目
- 检查 KV 环境变量是否自动配置

## 📊 监控建议

### 1. 设置 Vercel 通知
在 Vercel Dashboard 中配置：
- 部署失败通知
- Cron 执行失败通知

### 2. 定期检查
- 每周检查 Cron 执行日志
- 每月检查邮件发送统计
- 监控 KV 存储使用量

### 3. Resend 监控
在 Resend Dashboard 中：
- 查看邮件发送统计
- 检查退信率
- 监控 API 使用量

## 🎉 完成确认

完成以下所有项后，批量通知功能即可正常使用：

- [ ] 环境变量已配置
- [ ] 应用已重新部署
- [ ] 健康检查通过
- [ ] 测试端点响应正常
- [ ] Cron Job 配置正确
- [ ] 测试数据已创建
- [ ] 测试邮件发送成功
- [ ] 日志显示正常
- [ ] KV 存储工作正常

## 📚 相关文档

- [BATCH_NOTIFICATION_SUMMARY.md](./BATCH_NOTIFICATION_SUMMARY.md) - 功能总结
- [BATCH_NOTIFICATION_USAGE.md](./BATCH_NOTIFICATION_USAGE.md) - 使用指南
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - 部署文档
- [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) - KV 配置

## 🆘 需要帮助？

如果遇到问题：
1. 查看 Vercel Logs
2. 查看 Resend Dashboard
3. 检查本文档的故障排查部分
4. 查看相关文档

## 📝 生产环境注意事项

### Resend 配置
- 免费计划：每月 3,000 封邮件
- 需要验证域名才能发送到任意邮箱
- 测试域名只能发送到注册邮箱

### Vercel Cron
- 免费计划：有限的 Cron 执行次数
- Pro 计划：无限制
- 时区：UTC（注意时差）

### KV 存储
- 免费计划：有存储和请求限制
- 定期清理旧日志
- 监控使用量

### 安全建议
- 定期更换 NEXTAUTH_SECRET
- 保护 CRON_SECRET 不被泄露
- 限制 API 访问权限
- 定期审查审计日志
