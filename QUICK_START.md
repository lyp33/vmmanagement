# VM到期管理系统 - 快速开始指南

## 🚀 5分钟快速部署

本指南帮助您在5分钟内完成VM到期管理系统的部署。

### 前置条件

- [Vercel](https://vercel.com) 账户
- [Resend](https://resend.com) 账户
- Git 仓库（GitHub/GitLab/Bitbucket）

### 步骤1：准备代码

1. **Fork 或克隆项目**
   ```bash
   git clone <repository-url>
   cd vm-expiry-management
   ```

2. **推送到您的Git仓库**
   ```bash
   git remote set-url origin <your-repository-url>
   git push -u origin main
   ```

### 步骤2：Vercel部署

1. **导入项目**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择您的Git仓库
   - 点击 "Import"

2. **配置环境变量**
   
   在Vercel项目设置中添加以下环境变量：

   ```env
   # 必需变量
   NEXTAUTH_SECRET=your-32-character-secret-key
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
   
   # 可选变量
   FROM_EMAIL=noreply@your-domain.com
   CRON_SECRET=your-cron-secret-key
   ```

   **生成NEXTAUTH_SECRET：**
   ```bash
   openssl rand -base64 32
   ```

3. **添加数据库**
   - 在Vercel项目中点击 "Storage"
   - 选择 "Postgres"
   - 创建数据库
   - Vercel会自动添加数据库环境变量

4. **部署**
   - 点击 "Deploy"
   - 等待部署完成

### 步骤3：配置邮件服务

1. **获取Resend API密钥**
   - 访问 [Resend Dashboard](https://resend.com/dashboard)
   - 创建API密钥
   - 复制密钥到Vercel环境变量

2. **验证发送域名（可选）**
   - 在Resend中添加您的域名
   - 配置DNS记录
   - 验证域名

### 步骤4：初始化系统

1. **访问应用**
   ```
   https://your-project.vercel.app
   ```

2. **健康检查**
   ```
   https://your-project.vercel.app/api/health
   ```

3. **创建管理员账户**
   - 系统会自动创建默认管理员账户
   - 用户名：admin@example.com
   - 密码：admin123（首次登录后请修改）

### 步骤5：验证功能

1. **登录系统**
   - 使用管理员账户登录
   - 验证仪表板正常显示

2. **测试邮件通知**
   ```
   https://your-project.vercel.app/api/notifications/test
   ```

3. **检查定时任务**
   - 在Vercel Functions页面查看cron任务
   - 确认每日9点的定时任务已配置

## 🔧 自定义配置

### 自定义域名

1. 在Vercel项目设置中添加域名
2. 配置DNS记录
3. 更新NEXTAUTH_URL环境变量

### 邮件模板自定义

编辑 `src/lib/email.ts` 文件中的邮件模板。

### 定时任务调整

修改 `vercel.json` 中的cron配置：
```json
{
  "crons": [
    {
      "path": "/api/cron/check-expiry",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## 🛠️ 故障排除

### 常见问题

**Q: 部署失败，提示数据库连接错误**
A: 确认Vercel Postgres已正确配置，检查环境变量。

**Q: 邮件发送失败**
A: 验证RESEND_API_KEY是否正确，检查域名验证状态。

**Q: 登录失败**
A: 确认NEXTAUTH_SECRET已设置，清除浏览器缓存重试。

**Q: 定时任务未执行**
A: 检查Vercel Functions日志，确认cron配置正确。

### 获取帮助

- 查看 [完整部署指南](./DEPLOYMENT.md)
- 检查 [管理员指南](./ADMIN_GUIDE.md)
- 访问项目Issues页面

## 📋 部署检查清单

- [ ] 代码已推送到Git仓库
- [ ] Vercel项目已创建并导入
- [ ] 环境变量已配置
- [ ] Postgres数据库已添加
- [ ] 应用部署成功
- [ ] 健康检查通过
- [ ] 管理员账户可正常登录
- [ ] 邮件服务测试通过
- [ ] 定时任务配置正确
- [ ] 自定义域名已配置（如需要）

## 🎉 完成！

恭喜！您的VM到期管理系统已成功部署。

**下一步：**
1. 修改默认管理员密码
2. 创建项目和用户账户
3. 导入VM数据
4. 配置监控和告警

**有用链接：**
- [用户手册](./USER_MANUAL.md) - 学习如何使用系统
- [管理员指南](./ADMIN_GUIDE.md) - 系统管理和维护
- [API文档](./API.md) - 集成和开发参考

---

**需要帮助？** 请查看完整文档或创建Issue。