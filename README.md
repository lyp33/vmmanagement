# VM Expiry Management System

A modern web application for tracking and managing virtual machine expiry dates, supporting multi-project management, automatic expiry reminders, batch operations, and detailed operation auditing.

## 🌟 Key Features

- **VM Record Management**: Complete CRUD operations with batch management support
- **Project Management**: Multi-project organization with project-based access control
- **Automatic Expiry Monitoring**: 7-day advance email reminders with scheduled task automation
- **User Permission Management**: Admin and regular user roles with project-level access control
- **Operation Auditing**: Complete operation history and audit logs
- **Data Export**: Support for VM data and audit log exports
- **Modern UI**: Responsive interface built with Next.js 14 and Tailwind CSS

## 🚀 Quick Start

### Requirements

- Node.js 18+
- PostgreSQL Database (or use file-based storage for development)
- Resend Email Service Account (optional)

### Local Development

1. **Clone the project**
   ```bash
   git clone <repository-url>
   cd vm-expiry-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure required environment variables:
   ```env
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   RESEND_API_KEY="your-resend-api-key" # Optional
   ```

4. **Database setup** (Optional - uses file storage by default)
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

6. **访问应用**
   打开 [http://localhost:3000](http://localhost:3000)

### 生产部署

#### 自动部署脚本

**Linux/macOS:**
```bash
# 预览部署
./scripts/deploy.sh

# 生产部署
./scripts/deploy.sh production
```

**Windows:**
```cmd
# 预览部署
scripts\deploy.bat

# 生产部署
scripts\deploy.bat production
```

#### 手动部署到Vercel

1. **环境变量验证**
   ```bash
   npm run validate:env
   ```

2. **构建应用**
   ```bash
   npm run build
   ```

3. **部署到Vercel**
   ```bash
   vercel --prod
   ```

详细部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📖 文档

- [部署指南](./DEPLOYMENT.md) - 完整的生产环境部署指南
- [用户手册](./USER_MANUAL.md) - 系统使用说明
- [管理员指南](./ADMIN_GUIDE.md) - 系统管理和维护指南
- [认证设置](./AUTHENTICATION_SETUP.md) - 认证系统配置
- [审计系统](./AUDIT_SYSTEM.md) - 审计功能说明

## 🏗️ 技术架构

### 技术栈

- **前端**: Next.js 14 (App Router), React 19, TypeScript
- **后端**: Next.js API Routes (Serverless)
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js
- **UI框架**: Tailwind CSS + shadcn/ui
- **邮件服务**: Resend
- **部署**: Vercel (Serverless)
- **定时任务**: Vercel Cron Jobs

### 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   API Routes    │    │   Database      │
│   (Next.js)     │◄──►│   (Serverless)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Email Service  │
                       │    (Resend)     │
                       └─────────────────┘
```

## 🔧 开发

### 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 数据库
npm run db:generate      # 生成Prisma客户端
npm run db:migrate       # 运行数据库迁移
npm run db:seed          # 填充种子数据
npm run db:reset         # 重置数据库

# 测试和验证
npm run test             # 运行测试
npm run lint             # 代码检查
npm run type-check       # TypeScript类型检查
npm run validate         # 完整验证（类型+lint+测试）

# 部署相关
npm run validate:env     # 验证环境变量
npm run setup:prod       # 生产环境设置
npm run health           # 健康检查
```

### 项目结构

```
vm-expiry-management/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API路由
│   │   ├── auth/           # 认证页面
│   │   └── dashboard/      # 仪表板页面
│   ├── components/         # React组件
│   │   ├── ui/            # UI基础组件
│   │   ├── auth/          # 认证组件
│   │   └── layout/        # 布局组件
│   ├── lib/               # 工具库
│   │   ├── middleware/    # 中间件
│   │   └── __tests__/     # 测试文件
│   └── types/             # TypeScript类型定义
├── prisma/                # 数据库模式和迁移
├── scripts/               # 部署和工具脚本
└── docs/                  # 文档文件
```

## 🔐 安全特性

- **身份认证**: NextAuth.js集成，支持多种认证方式
- **权限控制**: 基于角色的访问控制(RBAC)
- **项目隔离**: 用户只能访问分配的项目数据
- **操作审计**: 所有数据修改操作完整记录
- **输入验证**: 客户端和服务端双重数据验证
- **安全头**: 生产环境安全HTTP头配置

## 📊 监控和日志

### 健康检查

```bash
# 本地健康检查
curl http://localhost:3000/api/health

# 生产环境健康检查
curl https://your-domain.vercel.app/api/health
```

### 日志类型

- **应用日志**: 系统运行和错误日志
- **审计日志**: 用户操作和数据变更记录
- **通知日志**: 邮件发送状态和历史
- **性能日志**: API响应时间和性能指标

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 编写单元测试覆盖核心功能
- 更新相关文档

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 支持

如需帮助，请：

1. 查看 [用户手册](./USER_MANUAL.md) 和 [管理员指南](./ADMIN_GUIDE.md)
2. 检查 [Issues](../../issues) 中的已知问题
3. 创建新的 Issue 描述问题

## 📈 版本历史

- **v1.0.0** - 初始版本
  - 基础VM管理功能
  - 用户认证和权限控制
  - 自动到期提醒
  - 操作审计系统

---

**维护团队**: 系统管理员  
**最后更新**: 2024年1月4日


## 🚀 Vercel Deployment

### ⚠️ Storage Configuration

**The app now supports Vercel KV for permanent storage!**

**Storage Options:**
- **Local Development:** File storage (`data/vm-data.json`) ✅ Permanent
- **Vercel + KV:** Vercel KV (Redis) ✅ Permanent - **RECOMMENDED**
- **Vercel without KV:** Temporary file storage ❌ Data clears on restart

### Quick Deploy with Vercel KV

1. **Deploy to Vercel**
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

2. **Create Vercel KV Database**
   - Go to Vercel Dashboard → Your Project
   - Click "Storage" → "Create Database" → "KV"
   - Vercel automatically connects it to your project

3. **Initialize**
   - Visit: `https://your-domain.vercel.app/api/init`
   - Verify `storageType: "kv"` in response

4. **Login**
   - Email: `admin@123.com`
   - Password: `123456789`

**✅ Your data is now permanent!**

### 📚 Deployment Guides

- **Quick Start (5 min):** [QUICK_DEPLOY_KV.md](./QUICK_DEPLOY_KV.md) ⚡
- **Detailed Setup:** [DEPLOYMENT_WITH_KV.md](./DEPLOYMENT_WITH_KV.md)
- **KV Configuration:** [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md)
- **Migration Summary:** [KV_MIGRATION_SUMMARY.md](./KV_MIGRATION_SUMMARY.md)

For detailed setup instructions, see [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md)

### Manual Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Set root directory to `vm-expiry-management`

3. **Configure Environment Variables**
   ```env
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ```

4. **Initialize Database**
   After deployment, visit: `https://your-domain.vercel.app/api/init`

5. **Login with Default Admin**
   ```
   Email: admin@123.com
   Password: 123456789
   ```

For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

## 📚 Documentation

- [Quick Start Guide](./QUICK_START.md)
- [User Manual](./USER_MANUAL.md)
- [Admin Guide](./ADMIN_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md)

## 🔐 Default Credentials

**Default Admin Account:**
- Email: `admin@123.com`
- Password: `123456789`

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Authentication**: NextAuth.js
- **Storage**: File-based (development) / PostgreSQL (production)
- **Email**: Resend API
- **Deployment**: Vercel

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Version:** 1.0.0  
**Last Updated:** January 7, 2026  
**Status:** Production Ready ✅
