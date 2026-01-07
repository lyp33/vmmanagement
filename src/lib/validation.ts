import { z } from 'zod'

// Common validation patterns
export const commonValidation = {
  email: z.string().email('请输入有效的邮箱地址'),
  requiredString: (fieldName: string) => 
    z.string().min(1, `${fieldName}是必填项`),
  optionalString: z.string().optional(),
  positiveNumber: z.number().positive('必须是正数'),
  nonNegativeNumber: z.number().min(0, '不能为负数'),
  futureDate: z.date().refine(
    (date) => date > new Date(),
    '日期必须是未来时间'
  ),
  pastOrPresentDate: z.date().refine(
    (date) => date <= new Date(),
    '日期不能是未来时间'
  ),
  ipAddress: z.string().regex(
    /^(\d{1,3}\.){3}\d{1,3}$/,
    '请输入有效的IP地址'
  ).refine(
    (ip) => {
      const parts = ip.split('.')
      return parts.every(part => {
        const num = parseInt(part, 10)
        return num >= 0 && num <= 255
      })
    },
    '请输入有效的IP地址'
  ),
  domain: z.string().regex(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    '请输入有效的域名'
  ),
  uuid: z.string().uuid('无效的ID格式'),
  dateString: z.string().datetime('无效的日期格式'),
  dateStringOptional: z.string().datetime('无效的日期格式').optional(),
}

// VM validation schemas
export const vmValidation = {
  create: z.object({
    email: commonValidation.email,
    vmAccount: commonValidation.requiredString('VM账户'),
    vmInternalIP: commonValidation.ipAddress,
    vmDomain: commonValidation.domain,
    currentExpiryDate: commonValidation.dateString,
    projectId: commonValidation.uuid,
    lastExpiryDate: commonValidation.dateStringOptional
  }).refine(
    (data) => {
      const expiryDate = new Date(data.currentExpiryDate)
      return expiryDate > new Date()
    },
    {
      message: '到期时间必须是未来时间',
      path: ['currentExpiryDate']
    }
  ),

  update: z.object({
    email: commonValidation.email.optional(),
    vmAccount: z.string().min(1, 'VM账户不能为空').optional(),
    vmInternalIP: commonValidation.ipAddress.optional(),
    vmDomain: commonValidation.domain.optional(),
    currentExpiryDate: commonValidation.dateString.optional(),
    projectId: commonValidation.uuid.optional(),
    lastExpiryDate: commonValidation.dateStringOptional
  }).refine(
    (data) => {
      if (data.currentExpiryDate) {
        const expiryDate = new Date(data.currentExpiryDate)
        return expiryDate > new Date()
      }
      return true
    },
    {
      message: '到期时间必须是未来时间',
      path: ['currentExpiryDate']
    }
  ),

  batchUpdate: z.object({
    vmIds: z.array(commonValidation.uuid).min(1, '至少选择一个VM'),
    currentExpiryDate: commonValidation.dateString
  }).refine(
    (data) => {
      const expiryDate = new Date(data.currentExpiryDate)
      return expiryDate > new Date()
    },
    {
      message: '到期时间必须是未来时间',
      path: ['currentExpiryDate']
    }
  ),

  query: z.object({
    projectId: commonValidation.uuid.optional(),
    projectName: z.string().optional(),
    email: z.string().optional(),
    vmAccount: z.string().optional(),
    vmDomain: z.string().optional(),
    vmInternalIP: z.string().optional(),
    expiryDateFrom: commonValidation.dateString.optional(),
    expiryDateTo: commonValidation.dateString.optional(),
    expiringInDays: z.string().transform(val => {
      const num = parseInt(val)
      if (isNaN(num) || num < 0) {
        throw new Error('天数必须是非负整数')
      }
      return num
    }).optional(),
    createdDateFrom: commonValidation.dateString.optional(),
    createdDateTo: commonValidation.dateString.optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'currentExpiryDate', 'email', 'vmAccount']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.string().transform(val => {
      const num = parseInt(val)
      return isNaN(num) || num < 1 ? 1 : num
    }).optional(),
    limit: z.string().transform(val => {
      const num = parseInt(val)
      return isNaN(num) || num < 1 ? 10 : Math.min(num, 100)
    }).optional()
  })
}

// Project validation schemas
export const projectValidation = {
  create: z.object({
    name: z.string()
      .min(1, '项目名称是必填项')
      .max(100, '项目名称不能超过100个字符')
      .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/, '项目名称只能包含字母、数字、中文、空格、连字符和下划线'),
    description: z.string().max(500, '项目描述不能超过500个字符').optional()
  }),

  update: z.object({
    name: z.string()
      .min(1, '项目名称不能为空')
      .max(100, '项目名称不能超过100个字符')
      .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/, '项目名称只能包含字母、数字、中文、空格、连字符和下划线')
      .optional(),
    description: z.string().max(500, '项目描述不能超过500个字符').optional()
  }),

  assign: z.object({
    userId: commonValidation.uuid
  })
}

// User validation schemas
export const userValidation = {
  create: z.object({
    email: commonValidation.email,
    name: z.string()
      .min(1, '用户名是必填项')
      .max(50, '用户名不能超过50个字符'),
    role: z.enum(['ADMIN', 'USER']).refine(
      (val) => ['ADMIN', 'USER'].includes(val),
      { message: '用户角色必须是ADMIN或USER' }
    ),
    password: z.string()
      .min(8, '密码至少需要8个字符')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字')
  }),

  update: z.object({
    email: commonValidation.email.optional(),
    name: z.string()
      .min(1, '用户名不能为空')
      .max(50, '用户名不能超过50个字符')
      .optional(),
    role: z.enum(['ADMIN', 'USER']).refine(
      (val) => ['ADMIN', 'USER'].includes(val),
      { message: '用户角色必须是ADMIN或USER' }
    ).optional()
  }),

  login: z.object({
    email: commonValidation.email,
    password: z.string().min(1, '密码是必填项')
  })
}

// Renewal validation schemas
export const renewalValidation = {
  single: z.object({
    newExpiryDate: commonValidation.dateString.optional(),
    renewalPeriodMonths: z.number()
      .int('续期月数必须是整数')
      .min(1, '续期月数至少为1个月')
      .max(24, '续期月数不能超过24个月')
      .optional()
  }).refine(
    (data) => {
      if (data.newExpiryDate) {
        const expiryDate = new Date(data.newExpiryDate)
        return expiryDate > new Date()
      }
      return true
    },
    {
      message: '新的到期时间必须是未来时间',
      path: ['newExpiryDate']
    }
  ),

  batch: z.object({
    vmIds: z.array(commonValidation.uuid).min(1, '至少选择一个VM'),
    renewalPeriodMonths: z.number()
      .int('续期月数必须是整数')
      .min(1, '续期月数至少为1个月')
      .max(24, '续期月数不能超过24个月')
      .optional()
  })
}

// Audit validation schemas
export const auditValidation = {
  query: z.object({
    startDate: commonValidation.dateString.optional(),
    endDate: commonValidation.dateString.optional(),
    operation: z.string().optional(),
    entityType: z.string().optional(),
    userId: commonValidation.uuid.optional(),
    page: z.string().transform(val => {
      const num = parseInt(val)
      return isNaN(num) || num < 1 ? 1 : num
    }).optional(),
    limit: z.string().transform(val => {
      const num = parseInt(val)
      return isNaN(num) || num < 1 ? 10 : Math.min(num, 100)
    }).optional()
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate)
      }
      return true
    },
    {
      message: '开始日期不能晚于结束日期',
      path: ['endDate']
    }
  )
}

// Validation helper functions
export const validationHelpers = {
  /**
   * Validate and parse request body with Zod schema
   */
  async validateRequestBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
  ): Promise<{ success: true; data: T } | { success: false; error: string; details?: any }> {
    try {
      const body = await request.json()
      const data = schema.parse(body)
      return { success: true, data }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: '请求数据验证失败',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }
      }
      return {
        success: false,
        error: '请求数据格式错误'
      }
    }
  },

  /**
   * Validate query parameters with Zod schema
   */
  validateQueryParams<T>(
    searchParams: URLSearchParams,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: string; details?: any } {
    try {
      const queryParams = Object.fromEntries(searchParams.entries())
      const data = schema.parse(queryParams)
      return { success: true, data }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: '查询参数验证失败',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }
      }
      return {
        success: false,
        error: '查询参数格式错误'
      }
    }
  },

  /**
   * Validate date range
   */
  validateDateRange(startDate?: string, endDate?: string): { isValid: boolean; error?: string } {
    if (!startDate || !endDate) {
      return { isValid: true }
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: '日期格式无效' }
    }

    if (start > end) {
      return { isValid: false, error: '开始日期不能晚于结束日期' }
    }

    return { isValid: true }
  },

  /**
   * Validate expiry date is in the future
   */
  validateFutureDate(dateString: string): { isValid: boolean; error?: string } {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return { isValid: false, error: '日期格式无效' }
    }

    if (date <= new Date()) {
      return { isValid: false, error: '日期必须是未来时间' }
    }

    return { isValid: true }
  },

  /**
   * Sanitize string input
   */
  sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ')
  },

  /**
   * Validate and sanitize email
   */
  validateEmail(email: string): { isValid: boolean; email?: string; error?: string } {
    const sanitized = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, error: '请输入有效的邮箱地址' }
    }

    return { isValid: true, email: sanitized }
  }
}

// Export all validation schemas for easy access
export const validation = {
  vm: vmValidation,
  project: projectValidation,
  user: userValidation,
  renewal: renewalValidation,
  audit: auditValidation,
  common: commonValidation,
  helpers: validationHelpers
}