# VM 批量导入 - 快速开始

## 5 分钟快速上手

### 步骤 1: 下载模板 (30 秒)

1. 登录系统（管理员账号）
2. 进入 **VMs** 页面
3. 点击 **"Import CSV"** 按钮
4. 在弹窗中点击 **"Download Template"**

### 步骤 2: 填写数据 (2 分钟)

在下载的模板中填写 VM 信息：

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
user@example.com,vm-001,192.168.1.100,vm001.example.com,2026-06-30,PROJECT-001,2026-03-31
admin@example.com,vm-002,192.168.1.101,vm002.example.com,2026-07-15,PROJECT-002,
```

**重要提示：**
- `vmAccount` 必须唯一
- `projectCode` 必须是已存在的项目名称
- 日期格式：`YYYY-MM-DD`
- 可选字段可以留空

### 步骤 3: 上传导入 (1 分钟)

1. 保存 CSV 文件
2. 点击 **"Import CSV"** 按钮
3. 选择文件
4. 点击 **"Import"**

### 步骤 4: 查看结果 (30 秒)

系统会显示导入结果：
- ✅ 成功导入的记录数
- ❌ 失败的记录及原因
- 📋 详细的错误列表

## 常见问题速查

| 问题 | 解决方案 |
|------|----------|
| "VM Account already exists" | 更改 vmAccount 为唯一值 |
| "Invalid email format" | 使用正确的邮箱格式 |
| "Project 'XXX' not found" | 先创建该项目或使用已存在的项目名 |
| "Invalid date format" | 使用 YYYY-MM-DD 格式 |
| "Invalid IP address format" | 使用标准 IPv4 格式（如 192.168.1.100） |

## 示例数据

### 正确示例 ✅

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
john@company.com,vm-prod-001,10.0.1.100,prod-vm-001.internal,2026-12-31,Production,2026-09-30
jane@company.com,vm-dev-001,10.0.2.100,dev-vm-001.internal,2026-06-30,Development,
```

### 错误示例 ❌

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
invalid-email,vm-001,192.168.1.256,vm,06/30/2026,NonExistentProject,
```

**错误原因：**
- ❌ 邮箱格式错误
- ❌ IP 地址超出范围
- ❌ 域名太短
- ❌ 日期格式错误
- ❌ 项目不存在

## 验证规则速记

| 字段 | 规则 |
|------|------|
| email | 必填，格式：`xxx@xxx.xxx` |
| vmAccount | 必填，全局唯一 |
| vmInternalIP | 必填，格式：`0-255.0-255.0-255.0-255` |
| vmDomain | 必填，至少 3 个字符 |
| currentExpiryDate | 必填，格式：`YYYY-MM-DD` |
| projectCode | 必填，必须已存在 |
| lastExpiryDate | 可选，格式：`YYYY-MM-DD` |

## 下一步

详细文档请参考：[VM_IMPORT_GUIDE.md](./VM_IMPORT_GUIDE.md)

---

**提示：** 建议先用 1-2 条数据测试，确认无误后再批量导入。
