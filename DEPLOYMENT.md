# VM到期管理系统 - 部署指南

## 概述

本文档提供VM到期管理系统在Vercel平台上的完整部署指南，包括环境配置、数据库设置、邮件服务配置和监控设置。

## 前置要求

- Node.js 18+ 
- npm 或 yarn
- Vercel 账户
- PostgreSQL 数据库（推荐使用 Vercel Postgres）
- Resend 账户（用于邮件服务）

## 快速部署

### 1. 克隆项目并安装依赖

```bash
git clone <your-repository-url>
cd vm-expiry-management
npm install
```

### 2. 环境变量配置

复制环境变量模板：
```bash
cp .env.example .env.local
```

配置以下必需的环境变量：

```env
# 数据库连接（Vercel Postgres 会自动提供）
DATABASE_URL="your-database-url"

# NextAuth 配置
NEXTAUTH_SECRET="your-strong-secret-key"
NEXTAUTH_URL="https://your-domain.vercel.app"

# 邮件服务
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@your-domain.com"

# 可选：定时任务安全密钥
CRON_SECRET="your-cron-secret"
```

### 3. 数据库设置

```bash
# 生成 Prisma 客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# （可选）填充种子数据
npm run db:seed
```

### 4. 本地测试

```bash
# 启动开发服务器
npm run dev

# 验证环境配置
npm run validate:env

# 运行测试
npm run test

# 健康检查
npm run health
```

### 5. 部署到 Vercel

#### 方法一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

#### 方法二：通过 Git 集成

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 Vercel 控制台导入项目
3. 配置环境变量
4. 部署

## 详细配置

### 数据库配置

#### 使用 Vercel Postgres

1. 在 Vercel 项目中添加 Postgres 存储
2. Vercel 会自动设置以下环境变量：
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NO_SSL`
   - `POSTGRES_URL_NON_POOLING`

3. 系统会自动使用 `POSTGRES_PRISMA_URL`

#### 使用外部数据库

设置 `DATABASE_URL` 环境变量：
```env
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

### 邮件服务配置

#### 设置 Resend

1. 注册 [Resend](https://resend.com) 账户
2. 创建 API 密钥
3. 验证发送域名
4. 配置环境变量：

```env
RESEND_API_KEY="re_xxxxxxxxxx"
FROM_EMAIL="noreply@your-verified-domain.com"
```

### 认证配置

#### NextAuth 设置

```env
# 生成强密钥
NEXTAUTH_SECRET="your-32-character-secret-key"

# 生产环境 URL
NEXTAUTH_URL="https://your-domain.vercel.app"
```

生成安全密钥：
```bash
openssl rand -base64 32
```

### 定时任务配置

系统使用 Vercel Cron Jobs 进行定时任务：

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-expiry",
      "schedule": "0 9 * * *"
    }
  ]
}
```

- 每天上午9点检查即将到期的VM
- 自动发送到期提醒邮件

### 环境变量完整列表

#### 必需变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `DATABASE_URL` 或 `POSTGRES_PRISMA_URL` | 数据库连接字符串 | `postgresql://...` |
| `NEXTAUTH_SECRET` | NextAuth JWT 签名密钥 | `your-secret-key` |
| `RESEND_API_KEY` | Resend 邮件服务 API 密钥 | `re_xxxxxxxxxx` |

#### 可选变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NEXTAUTH_URL` | 应用基础 URL | 自动检测 |
| `FROM_EMAIL` | 发件人邮箱地址 | `noreply@vmmanagement.com` |
| `CRON_SECRET` | 定时任务安全密钥 | 无 |
| `NODE_ENV` | 运行环境 | `production` |

## 部署验证

### 1. 健康检查

部署完成后，访问健康检查端点：
```
GET https://your-domain.vercel.app/api/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-04T10:00:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "email": "configured",
    "auth": "configured"
  }
}
```

### 2. 功能测试

- [ ] 用户登录/登出
- [ ] VM 记录管理
- [ ] 项目管理
- [ ] 邮件通知测试
- [ ] 定时任务执行
- [ ] 权限控制

### 3. 性能监控

- 响应时间 < 2秒
- 数据库连接稳定
- 邮件发送成功率 > 95%

## 故障排除

### 常见问题

#### 1. 数据库连接失败

**症状**：健康检查显示数据库不健康

**解决方案**：
- 检查 `DATABASE_URL` 或 `POSTGRES_PRISMA_URL` 是否正确
- 确认数据库服务正在运行
- 验证网络连接

#### 2. 邮件发送失败

**症状**：通知邮件未发送

**解决方案**：
- 验证 `RESEND_API_KEY` 是否有效
- 检查发送域名是否已验证
- 查看 Resend 控制台的发送日志

#### 3. 认证问题

**症状**：无法登录或会话异常

**解决方案**：
- 确认 `NEXTAUTH_SECRET` 已设置
- 检查 `NEXTAUTH_URL` 是否匹配部署域名
- 清除浏览器缓存和 cookies

#### 4. 定时任务未执行

**症状**：到期检查未自动运行

**解决方案**：
- 检查 `vercel.json` 中的 cron 配置
- 在 Vercel 控制台查看 Functions 日志
- 手动触发定时任务进行测试

### 日志查看

#### Vercel 函数日志

1. 访问 Vercel 控制台
2. 选择项目
3. 进入 "Functions" 标签
4. 查看实时日志

#### 应用日志

系统使用结构化日志记录：
- 错误日志：包含错误堆栈和上下文
- 审计日志：记录所有数据修改操作
- 通知日志：记录邮件发送状态

## 安全考虑

### 1. 环境变量安全

- 使用强随机密钥
- 定期轮换敏感密钥
- 不在代码中硬编码密钥

### 2. 数据库安全

- 使用连接池限制并发连接
- 启用 SSL 连接
- 定期备份数据

### 3. API 安全

- 实施速率限制
- 验证所有输入数据
- 使用 HTTPS 传输

### 4. 访问控制

- 基于角色的权限管理
- 项目级别的数据隔离
- 审计所有敏感操作

## 监控和维护

### 1. 健康监控

设置外部监控服务定期检查：
```bash
curl -f https://your-domain.vercel.app/api/health
```

### 2. 性能监控

- 使用 Vercel Analytics
- 监控 API 响应时间
- 跟踪错误率

### 3. 数据备份

- 定期导出数据
- 测试恢复流程
- 保留多个备份版本

### 4. 更新维护

- 定期更新依赖包
- 监控安全漏洞
- 测试新版本部署

## 扩展配置

### 自定义域名

1. 在 Vercel 控制台添加域名
2. 配置 DNS 记录
3. 更新 `NEXTAUTH_URL` 环境变量

### 多环境部署

- **开发环境**：`development` 分支 → 预览部署
- **测试环境**：`staging` 分支 → 测试部署  
- **生产环境**：`main` 分支 → 生产部署

### 性能优化

- 启用 Vercel Edge Functions
- 配置适当的缓存策略
- 优化数据库查询

## 支持和联系

如需技术支持，请：

1. 查看应用日志和错误信息
2. 检查本文档的故障排除部分
3. 联系系统管理员

---

**注意**：请确保在生产环境中使用强密钥和安全配置。定期检查和更新系统以确保安全性和稳定性。