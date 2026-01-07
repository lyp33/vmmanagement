# Complete Translation Guide

## Files Requiring Translation

### Priority 1: Core Navigation & Layout (COMPLETED)
- ✅ src/app/layout.tsx
- ✅ src/components/layout/navigation.tsx

### Priority 2: Authentication Pages
- src/app/auth/signin/page.tsx
- src/app/auth/signout/page.tsx
- src/app/page.tsx (landing page)

### Priority 3: Dashboard Pages
- src/app/dashboard/page.tsx
- src/app/dashboard/vms/page.tsx
- src/app/dashboard/vms/[id]/page.tsx
- src/app/dashboard/vms/[id]/edit/page.tsx
- src/app/dashboard/vms/new/page.tsx
- src/app/dashboard/projects/page.tsx
- src/app/dashboard/projects/[id]/page.tsx
- src/app/dashboard/projects/[id]/edit/page.tsx
- src/app/dashboard/users/page.tsx
- src/app/dashboard/audit/page.tsx

### Priority 4: Mock Data
- src/lib/mock-data.ts (user names, project names, descriptions)

## Translation Mapping

### Common UI Elements
```
欢迎 → Welcome
仪表板 → Dashboard
总览 → Overview
统计 → Statistics
快速操作 → Quick Actions
最近活动 → Recent Activity
```

### VM Management
```
VM管理 → VM Management
VM列表 → VM List
创建VM → Create VM
编辑VM → Edit VM
删除VM → Delete VM
VM详情 → VM Details
VM账户 → VM Account
VM域名 → VM Domain
内部IP → Internal IP
到期时间 → Expiry Date
当前到期日期 → Current Expiry Date
上次到期日期 → Previous Expiry Date
```

### Project Management
```
项目管理 → Project Management
项目列表 → Project List
创建项目 → Create Project
编辑项目 → Edit Project
删除项目 → Delete Project
项目详情 → Project Details
项目名称 → Project Name
项目描述 → Project Description
分配用户 → Assign User
取消分配 → Unassign
项目VM → Project VMs
```

### User Management
```
用户管理 → User Management
用户列表 → User List
创建用户 → Create User
编辑用户 → Edit User
删除用户 → Delete User
用户详情 → User Details
用户名 → Username
邮箱地址 → Email Address
用户角色 → User Role
管理员 → Admin
普通用户 → User
```

### Audit Logs
```
审计日志 → Audit Logs
操作记录 → Operation Records
操作类型 → Operation Type
操作时间 → Operation Time
操作用户 → Operator
操作详情 → Operation Details
变更内容 → Changes
```

### Status & Actions
```
状态 → Status
操作 → Actions
正常 → Active
即将到期 → Expiring Soon
已过期 → Expired
查看 → View
编辑 → Edit
删除 → Delete
保存 → Save
取消 → Cancel
确认 → Confirm
提交 → Submit
返回 → Back
刷新 → Refresh
导出 → Export
搜索 → Search
筛选 → Filter
清除筛选 → Clear Filters
全选 → Select All
批量操作 → Batch Operations
```

### Forms & Validation
```
请输入 → Please enter
必填项 → Required field
邮箱格式不正确 → Invalid email format
密码长度至少8位 → Password must be at least 8 characters
确认密码 → Confirm Password
密码不匹配 → Passwords do not match
```

### Messages & Notifications
```
操作成功 → Operation successful
操作失败 → Operation failed
确定要删除吗？ → Are you sure you want to delete?
删除后无法恢复 → This action cannot be undone
加载中... → Loading...
暂无数据 → No data available
没有找到结果 → No results found
```

### Date & Time
```
创建时间 → Created At
更新时间 → Updated At
最后更新 → Last Updated
分配于 → Assigned At
```

## Implementation Strategy

1. Update all page.tsx files with English translations
2. Update mock-data.ts with English sample data
3. Update all component files
4. Test each page after translation
5. Verify all functionality still works

## Notes
- Keep technical terms in English (VM, IP, API, etc.)
- Use consistent terminology throughout
- Maintain proper capitalization for titles
- Keep button text concise
- Use sentence case for descriptions
