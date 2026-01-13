# 本地测试 VM 导入功能指南

## 🚀 服务器已启动

开发服务器正在运行：
- **本地地址**: http://localhost:3000
- **网络地址**: http://172.29.1.30:3000

## 📝 测试步骤

### 步骤 1: 访问系统

1. 打开浏览器访问: http://localhost:3000
2. 使用默认管理员账号登录：
   - **邮箱**: `admin@123.com`
   - **密码**: `123456789`

### 步骤 2: 初始化数据（如果需要）

如果是首次运行，访问: http://localhost:3000/api/init
这将创建默认的管理员账号和测试项目。

### 步骤 3: 进入 VMs 页面

1. 登录后，点击左侧菜单的 **"VMs"**
2. 你应该能看到页面右上角有以下按钮：
   - Export CSV
   - Export JSON
   - **Import CSV** ⬅️ 这是新功能
   - Create VM

### 步骤 4: 下载 CSV 模板

1. 点击 **"Import CSV"** 按钮
2. 在弹出的对话框中，点击 **"Download Template"**
3. 模板文件会自动下载为 `vm-import-template.csv`

### 步骤 5: 准备测试数据

你可以使用项目中已经准备好的测试文件：`test-import-data.csv`

或者编辑下载的模板，填入以下测试数据：

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
test1@example.com,test-vm-001,192.168.1.100,test-vm-001.local,2026-06-30,Test Project,2026-03-31
test2@example.com,test-vm-002,192.168.1.101,test-vm-002.local,2026-07-15,Test Project,
test3@example.com,test-vm-003,10.0.0.50,test-vm-003.local,2026-08-20,Test Project,2026-05-20
```

**注意**: 确保 `projectCode` 使用的是系统中已存在的项目名称（如 "Test Project"）

### 步骤 6: 上传导入

1. 在导入对话框中，点击 **"Select CSV File"**
2. 选择准备好的 CSV 文件
3. 点击 **"Import"** 按钮
4. 等待导入完成

### 步骤 7: 查看结果

导入完成后，你会看到：

#### ✅ 成功场景
- 显示绿色的成功提示
- 统计信息：总行数、成功数、失败数
- 如果全部成功，对话框会在 2 秒后自动关闭
- VM 列表会自动刷新，显示新导入的记录

#### ⚠️ 部分失败场景
- 显示黄色的警告提示
- 成功导入的记录会保存
- 失败的记录会显示详细错误信息：
  - 行号
  - 错误字段
  - 错误原因

## 🧪 测试场景

### 场景 1: 正常导入（全部成功）

使用 `test-import-data.csv` 文件，确保：
- 所有 VM 账户是唯一的
- 项目 "Test Project" 已存在
- 所有数据格式正确

**预期结果**: 3 条记录全部成功导入

### 场景 2: 测试验证错误

创建一个包含错误的 CSV 文件：

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
invalid-email,vm-001,192.168.1.256,vm,06/30/2026,NonExistentProject,
user@example.com,vm-002,192.168.1.100,vm002.local,2026-07-15,Test Project,
```

**预期结果**: 
- 第 1 条失败（多个验证错误）
- 第 2 条成功
- 显示详细的错误列表

### 场景 3: 测试重复 VM 账户

1. 先导入一次 `test-import-data.csv`
2. 再次导入相同的文件

**预期结果**: 
- 所有记录失败
- 错误信息：VM Account already exists (duplicate)

### 场景 4: 测试项目不存在

创建一个使用不存在项目的 CSV：

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
user@example.com,vm-999,192.168.1.100,vm999.local,2026-07-15,NonExistentProject,
```

**预期结果**: 
- 验证通过
- 导入失败
- 错误信息：Project 'NonExistentProject' not found

## 🔍 验证导入结果

### 1. 检查 VM 列表
- 返回 VMs 页面
- 确认新导入的 VM 记录显示在列表中
- 检查所有字段是否正确

### 2. 检查审计日志
1. 点击左侧菜单的 **"Audit Logs"**
2. 查找 `BATCH_IMPORT` 操作
3. 查看导入统计信息

### 3. 检查 VM 详情
1. 点击任意导入的 VM 记录
2. 查看详细信息
3. 确认所有字段正确填充

## 📊 测试检查清单

- [ ] 服务器成功启动
- [ ] 成功登录管理员账号
- [ ] 能看到 "Import CSV" 按钮
- [ ] 能下载 CSV 模板
- [ ] 正常导入测试（全部成功）
- [ ] 验证错误测试（部分失败）
- [ ] 重复账户测试
- [ ] 项目不存在测试
- [ ] 导入结果正确显示在列表中
- [ ] 审计日志正确记录

## 🐛 常见问题排查

### 问题 1: 看不到 "Import CSV" 按钮
**原因**: 可能不是管理员账号  
**解决**: 确保使用 `admin@123.com` 登录

### 问题 2: 上传后报错 "Project not found"
**原因**: CSV 中的项目代码不存在  
**解决**: 
1. 先在 Projects 页面创建项目
2. 或使用已存在的项目名称（如 "Test Project"）

### 问题 3: 所有记录都失败
**原因**: 可能是 CSV 格式问题  
**解决**: 
1. 检查 CSV 表头是否正确
2. 使用下载的模板作为基础
3. 确保字段顺序正确

### 问题 4: 导入后列表没有刷新
**原因**: 可能是缓存问题  
**解决**: 手动刷新页面（F5）

## 📸 预期界面截图位置

1. **导入按钮**: VMs 页面右上角
2. **导入对话框**: 点击按钮后弹出
3. **成功提示**: 绿色背景，显示统计信息
4. **错误详情**: 红色/橙色背景，显示错误列表

## 🎉 测试完成

如果所有测试场景都通过，说明导入功能工作正常！

---

**测试时间**: 2026-01-13  
**功能版本**: v1.0.0  
**测试状态**: ⏳ 待测试
