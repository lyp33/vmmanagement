#!/usr/bin/env node

/**
 * Automated Translation Script
 * Translates all Chinese text to English in the codebase
 */

const fs = require('fs');
const path = require('path');

// Comprehensive translation mapping
const translations = {
  // App Title & Branding
  'VM到期管理系统': 'VM Expiry Management System',
  'VM到期管理': 'VM Expiry Management',
  
  // Navigation & Menu
  'VM管理': 'VMs',
  '项目管理': 'Projects',
  '审计日志': 'Audit Logs',
  '用户管理': 'Users',
  '仪表板': 'Dashboard',
  '个人资料': 'Profile',
  '设置': 'Settings',
  '退出登录': 'Sign Out',
  '我的账户': 'My Account',
  '管理员': 'Admin',
  '普通用户': 'User',
  
  // Common Actions
  '创建': 'Create',
  '编辑': 'Edit',
  '删除': 'Delete',
  '查看': 'View',
  '保存': 'Save',
  '取消': 'Cancel',
  '确认': 'Confirm',
  '提交': 'Submit',
  '返回': 'Back',
  '刷新': 'Refresh',
  '导出': 'Export',
  '搜索': 'Search',
  '筛选': 'Filter',
  '清除筛选': 'Clear Filters',
  '全选': 'Select All',
  '添加': 'Add',
  '分配': 'Assign',
  '取消分配': 'Unassign',
  '批量操作': 'Batch Operations',
  '批量续期': 'Batch Renew',
  '续期': 'Renew',
  '操作': 'Actions',
  '重试': 'Retry',
  
  // Status
  '状态': 'Status',
  '正常': 'Active',
  '即将到期': 'Expiring Soon',
  '已过期': 'Expired',
  '启用': 'Enabled',
  '禁用': 'Disabled',
  '成功': 'Success',
  '失败': 'Failed',
  '警告': 'Warning',
  '错误': 'Error',
  
  // VM Related
  'VM列表': 'VM List',
  '创建VM': 'Create VM',
  '编辑VM': 'Edit VM',
  '删除VM': 'Delete VM',
  'VM详情': 'VM Details',
  'VM账户': 'VM Account',
  'VM域名': 'VM Domain',
  '内部IP': 'Internal IP',
  '到期时间': 'Expiry Date',
  '当前到期日期': 'Current Expiry Date',
  '上次到期日期': 'Previous Expiry Date',
  '到期日期': 'Expiry Date',
  '邮箱': 'Email',
  '邮箱地址': 'Email Address',
  '域名': 'Domain',
  '账户': 'Account',
  '项目': 'Project',
  '项目VM': 'Project VMs',
  '添加VM': 'Add VM',
  '暂无VM': 'No VMs',
  '此项目还没有VM记录': 'No VMs in this project yet',
  
  // Project Related
  '项目列表': 'Project List',
  '创建项目': 'Create Project',
  '编辑项目': 'Edit Project',
  '删除项目': 'Delete Project',
  '项目详情': 'Project Details',
  '项目名称': 'Project Name',
  '项目描述': 'Project Description',
  '分配用户': 'Assign User',
  '分配用户到项目': 'Assign User to Project',
  '选择要分配到此项目的用户': 'Select a user to assign to this project',
  '选择用户': 'Select User',
  '取消用户项目分配': 'Unassign User from Project',
  '确定要取消此用户的项目分配吗？': 'Are you sure you want to unassign this user?',
  '分配用户数': 'Assigned Users',
  '分配用户': 'Assign Users',
  '暂无用户': 'No Users',
  '此项目还没有分配用户': 'No users assigned to this project yet',
  '项目信息': 'Project Information',
  'VM数量': 'VM Count',
  '创建时间': 'Created At',
  '最后更新': 'Last Updated',
  'VM状态统计': 'VM Status Statistics',
  
  // User Related
  '用户列表': 'User List',
  '创建用户': 'Create User',
  '编辑用户': 'Edit User',
  '删除用户': 'Delete User',
  '用户详情': 'User Details',
  '用户名': 'Username',
  '用户': 'User',
  '用户角色': 'User Role',
  '角色': 'Role',
  '项目分配': 'Project Assignments',
  '确定要删除此用户吗？': 'Are you sure you want to delete this user?',
  '没有用户': 'No Users',
  '开始创建您的第一个用户': 'Create your first user',
  
  // Audit Log Related
  '审计日志列表': 'Audit Log List',
  '操作记录': 'Operation Records',
  '操作类型': 'Operation Type',
  '操作时间': 'Operation Time',
  '操作用户': 'Operator',
  '操作详情': 'Operation Details',
  '变更内容': 'Changes',
  '变更详情': 'Change Details',
  '资源类型': 'Resource Type',
  '资源ID': 'Resource ID',
  '暂无审计日志': 'No Audit Logs',
  '系统还没有审计记录': 'No audit records yet',
  
  // Dashboard
  '欢迎回来': 'Welcome Back',
  '这是您的VM到期管理系统仪表板': 'This is your VM Expiry Management dashboard',
  '总览': 'Overview',
  '统计': 'Statistics',
  '快速操作': 'Quick Actions',
  '最近活动': 'Recent Activity',
  '总VM数': 'Total VMs',
  '即将到期VM': 'Expiring VMs',
  '已过期VM': 'Expired VMs',
  '总项目数': 'Total Projects',
  '总用户数': 'Total Users',
  
  // Auth Pages
  '登录': 'Sign In',
  '请输入您的凭据以访问系统': 'Please enter your credentials to access the system',
  '密码': 'Password',
  '请输入您的邮箱地址': 'Please enter your email address',
  '请输入您的密码': 'Please enter your password',
  '登录中...': 'Signing in...',
  '登录成功': 'Sign in successful',
  '登录失败': 'Sign in failed',
  '退出成功': 'Signed out successfully',
  '正在退出...': 'Signing out...',
  
  // Forms & Validation
  '请输入': 'Please enter',
  '必填项': 'Required field',
  '邮箱格式不正确': 'Invalid email format',
  '密码长度至少8位': 'Password must be at least 8 characters',
  '确认密码': 'Confirm Password',
  '密码不匹配': 'Passwords do not match',
  '请选择': 'Please select',
  '描述': 'Description',
  '名称': 'Name',
  
  // Messages & Notifications
  '操作成功': 'Operation successful',
  '操作失败': 'Operation failed',
  '确定要删除吗？': 'Are you sure you want to delete?',
  '删除后无法恢复': 'This action cannot be undone',
  '加载中...': 'Loading...',
  '暂无数据': 'No data available',
  '没有找到结果': 'No results found',
  '分配于': 'Assigned at',
  '更新时间': 'Updated At',
  
  // Pagination & Lists
  '共': 'Total',
  '条': 'items',
  '页': 'page',
  '每页': 'Per page',
  '上一页': 'Previous',
  '下一页': 'Next',
  
  // Export
  '导出CSV': 'Export CSV',
  '导出JSON': 'Export JSON',
  '导出数据': 'Export Data',
  
  // Misc
  '详情': 'Details',
  '信息': 'Information',
  '合作伙伴': 'Partner',
  '开发项目': 'Development Project',
  '系统管理员': 'System Administrator',
  '跟踪合作伙伴虚拟机使用情况并自动发送到期提醒': 'Track partner virtual machine usage and automatically send expiry reminders',
  '分配中...': 'Assigning...',
  '用户已成功分配到项目': 'User successfully assigned to project',
  '用户已从项目中移除': 'User removed from project',
  '确定要删除此项目吗？': 'Are you sure you want to delete this project?',
  '此操作无法撤销': 'This action cannot be undone',
  '项目已成功删除': 'Project deleted successfully',
  '项目已成功创建': 'Project created successfully',
  '项目已成功更新': 'Project updated successfully',
  'VM已成功创建': 'VM created successfully',
  'VM已成功更新': 'VM updated successfully',
  'VM已成功删除': 'VM deleted successfully',
  '用户已成功创建': 'User created successfully',
  '用户已成功更新': 'User updated successfully',
  '用户已成功删除': 'User deleted successfully',
  
  // Additional translations
  '测试账户': 'Test Accounts',
  '没有': 'No',
  '暂无': 'No',
  '还没有': 'No',
  '记录': 'records',
  '条记录': 'records',
  '总共': 'Total',
  '显示': 'Showing',
  '至': 'to',
  '的': 'of',
  '合作伙伴A的开发项目': 'Partner A Development Project',
  '合作伙伴B的开发项目': 'Partner B Development Project',
  '项目A': 'Project A',
  '项目B': 'Project B',
  '项目C': 'Project C',
  '测试项目': 'Test Project',
  '这是您的VM到期管理系统仪表板': 'This is your VM Expiry Management dashboard',
  '欢迎': 'Welcome',
  '您没有权限查看此项目': 'You do not have permission to view this project',
  '项目不存在': 'Project not found',
  '加载项目失败': 'Failed to load project',
  '加载失败': 'Failed to load',
  '出现错误': 'An error occurred',
  '发生了异步错误': 'An asynchronous error occurred',
  '应用程序遇到了意外错误，我们已经记录了这个问题': 'The application encountered an unexpected error. We have logged this issue',
  '返回首页': 'Return to Home',
  '错误监控': 'Error Monitoring',
  '最后更新': 'Last Updated',
  '总错误数': 'Total Errors',
  '严重错误': 'Critical Errors',
  '错误分类': 'Error Classification',
  '按错误类型分布': 'Distribution by error type',
  '最近错误': 'Recent Errors',
  '最新的错误记录': 'Latest error records',
  '系统测试页面': 'System Test Page',
  '测试所有API端点的功能状态': 'Test the functional status of all API endpoints',
  '错误信息': 'Error Message',
  '用户管理测试页面': 'User Management Test Page',
  '测试用户编辑功能（无需登录）': 'Test user editing functionality (no login required)',
  '创建用户': 'Create User',
  '测试说明': 'Test Instructions',
  '这是一个测试页面，用于验证用户编辑功能。您可以更改用户角色和创建新用户': 'This is a test page to verify user editing functionality. You can change user roles and create new users',
  '用户列表': 'User List',
  '没有用户': 'No Users',
  '开始创建您的第一个用户': 'Create your first user',
  '确定要将此用户角色更改为': 'Are you sure you want to change this user role to',
  '吗？': '?',
  '更新用户角色失败': 'Failed to update user role',
  '请输入邮箱地址': 'Please enter email address',
  '请输入用户姓名': 'Please enter user name',
  '请输入密码': 'Please enter password',
  '创建用户失败': 'Failed to create user',
  
  // Error monitoring specific
  '过去': 'Past',
  '小时': 'hour',
  '天': 'day',
  '周': 'week',
  '需要立即处理': 'Requires immediate attention',
  '需要关注': 'Requires attention',
  '趋势': 'Trend',
  '相比昨天': 'Compared to yesterday',
  '身份验证': 'Authentication',
  '数据验证': 'Validation',
  '数据库': 'Database',
  '网络': 'Network',
  '其他': 'Other',
  '监控': 'Monitoring',
};

// Files to translate
const filesToTranslate = [
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/auth/signin/page.tsx',
  'src/app/auth/signout/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/vms/page.tsx',
  'src/app/dashboard/vms/new/page.tsx',
  'src/app/dashboard/vms/[id]/page.tsx',
  'src/app/dashboard/vms/[id]/edit/page.tsx',
  'src/app/dashboard/projects/page.tsx',
  'src/app/dashboard/projects/[id]/page.tsx',
  'src/app/dashboard/projects/[id]/edit/page.tsx',
  'src/app/dashboard/users/page.tsx',
  'src/app/dashboard/audit/page.tsx',
  'src/components/layout/navigation.tsx',
  'src/components/layout/dashboard-layout.tsx',
  'src/components/error-boundary.tsx',
  'src/components/monitoring/error-dashboard.tsx',
  'src/components/auth/project-guard.tsx',
  'src/app/test/page.tsx',
  'src/app/test-users/page.tsx',
  'src/lib/mock-data.ts',
];

function translateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Apply translations
  for (const [chinese, english] of Object.entries(translations)) {
    const regex = new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.match(regex)) {
      content = content.replace(regex, english);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Translated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes: ${filePath}`);
  }
}

console.log('🚀 Starting translation process...\n');

filesToTranslate.forEach(translateFile);

console.log('\n✨ Translation complete!');
