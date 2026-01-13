# Date Format Update - MM/DD/YYYY

## 更新说明

CSV 导入功能的日期格式已从 `YYYY-MM-DD` 更新为 `MM/DD/YYYY`。

## 更新内容

### 1. 验证函数更新
- 文件: `src/lib/csv-import.ts`
- 函数: `validateDate()`
- 新格式: `MM/DD/YYYY`
- 支持格式:
  - `6/30/2026` (单数字月/日)
  - `06/30/2026` (双数字月/日)
  - `12/31/2026` (完整格式)

### 2. CSV 模板更新
- 文件: `public/vm-import-template.csv`
- 示例日期: `6/30/2026`, `3/31/2026`

### 3. 测试数据更新
- `test-import-data.csv` - 正常测试数据
- `test-import-errors.csv` - 错误测试数据
- 所有日期已更新为 MM/DD/YYYY 格式

### 4. 测试用例更新
- 文件: `src/lib/__tests__/csv-import.test.ts`
- 新增测试: 验证 MM/DD/YYYY 格式
- 新增测试: 拒绝无效日期 (如 2/30/2026)
- 所有 23 个测试通过 ✅

### 5. UI 说明更新
- 文件: `src/components/vms/import-dialog.tsx`
- 更新字段说明为 MM/DD/YYYY 格式

## 日期格式规则

### ✅ 有效格式
```
6/30/2026       ✓ 单数字月/日
06/30/2026      ✓ 双数字月/日
1/1/2026        ✓ 最小格式
12/31/2026      ✓ 完整格式
```

### ❌ 无效格式
```
2026-06-30      ✗ YYYY-MM-DD 格式
30/06/2026      ✗ DD/MM/YYYY 格式
2026/06/30      ✗ YYYY/MM/DD 格式
06-30-2026      ✗ 使用连字符
2/30/2026       ✗ 无效日期
13/01/2026      ✗ 无效月份
```

## 验证逻辑

1. **格式验证**: 使用正则表达式验证 MM/DD/YYYY 格式
2. **日期有效性**: 验证日期是否真实存在（如 2/30 会被拒绝）
3. **年份限制**: 日期必须在 2000 年之后

## 示例 CSV 文件

```csv
email,vmAccount,vmInternalIP,vmDomain,currentExpiryDate,projectCode,lastExpiryDate
user@example.com,vm-001,192.168.1.100,vm001.local,6/30/2026,PROJECT-001,3/31/2026
admin@example.com,vm-002,192.168.1.101,vm002.local,12/31/2026,PROJECT-002,
```

## 测试结果

```
✅ 所有 23 个单元测试通过
✅ 日期格式验证正常
✅ 无效日期正确拒绝
✅ CSV 解析正常工作
```

## 迁移指南

如果你有现有的 CSV 文件使用 YYYY-MM-DD 格式，需要转换为 MM/DD/YYYY：

### 转换示例
```
旧格式: 2026-06-30
新格式: 6/30/2026

旧格式: 2026-03-31
新格式: 3/31/2026
```

### Excel 转换
1. 选择日期列
2. 右键 → 设置单元格格式
3. 选择"自定义"
4. 输入格式: `M/D/YYYY`
5. 点击确定

### 编程转换 (JavaScript)
```javascript
function convertDate(yyyymmdd) {
  const [year, month, day] = yyyymmdd.split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

// 示例
convertDate('2026-06-30'); // 返回 "6/30/2026"
```

## 常见问题

### Q: 为什么改为 MM/DD/YYYY？
A: 这是美国标准日期格式，更符合用户习惯。

### Q: 可以使用 DD/MM/YYYY 吗？
A: 不可以，系统只接受 MM/DD/YYYY 格式。

### Q: 必须使用前导零吗？
A: 不需要，`6/30/2026` 和 `06/30/2026` 都可以。

### Q: 旧格式的 CSV 文件还能用吗？
A: 不能，需要转换为新格式。

## 更新时间

- **日期**: 2026-01-13
- **版本**: v1.1.0
- **状态**: ✅ 已完成并测试

---

**注意**: 请确保所有 CSV 文件使用新的 MM/DD/YYYY 日期格式。
