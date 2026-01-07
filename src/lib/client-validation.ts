import { z } from 'zod'

// Client-side validation schemas (mirrors server-side but with Chinese messages)
export const clientValidation = {
  // Common patterns
  email: z.string()
    .min(1, '邮箱地址是必填项')
    .email('请输入有效的邮箱地址'),
  
  requiredString: (fieldName: string) => 
    z.string().min(1, `${fieldName}是必填项`),
  
  ipAddress: z.string()
    .min(1, '内网IP是必填项')
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, '请输入有效的IP地址')
    .refine(
      (ip) => {
        const parts = ip.split('.')
        return parts.every(part => {
          const num = parseInt(part, 10)
          return num >= 0 && num <= 255
        })
      },
      '请输入有效的IP地址'
    ),
  
  domain: z.string()
    .min(1, '域名是必填项')
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      '请输入有效的域名'
    ),
  
  futureDate: z.string()
    .min(1, '到期时间是必填项')
    .refine(
      (dateString) => {
        const date = new Date(dateString)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date > today
      },
      '到期时间必须是未来的日期'
    ),
  
  projectName: z.string()
    .min(1, '项目名称是必填项')
    .max(100, '项目名称不能超过100个字符')
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/, '项目名称只能包含字母、数字、中文、空格、连字符和下划线'),
  
  projectDescription: z.string()
    .max(500, '项目描述不能超过500个字符')
    .optional(),
  
  userName: z.string()
    .min(1, '用户名是必填项')
    .max(50, '用户名不能超过50个字符'),
  
  password: z.string()
    .min(8, '密码至少需要8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字')
}

// Form validation schemas
export const formSchemas = {
  // VM forms
  createVM: z.object({
    email: clientValidation.email,
    vmAccount: clientValidation.requiredString('VM账户'),
    vmInternalIP: clientValidation.ipAddress,
    vmDomain: clientValidation.domain,
    currentExpiryDate: clientValidation.futureDate,
    projectId: clientValidation.requiredString('项目')
  }),

  updateVM: z.object({
    email: clientValidation.email.optional(),
    vmAccount: z.string().min(1, 'VM账户不能为空').optional(),
    vmInternalIP: clientValidation.ipAddress.optional(),
    vmDomain: clientValidation.domain.optional(),
    currentExpiryDate: clientValidation.futureDate.optional(),
    projectId: z.string().min(1, '请选择项目').optional()
  }),

  batchUpdateExpiry: z.object({
    vmIds: z.array(z.string()).min(1, '请至少选择一个VM'),
    currentExpiryDate: clientValidation.futureDate
  }),

  // Project forms
  createProject: z.object({
    name: clientValidation.projectName,
    description: clientValidation.projectDescription
  }),

  updateProject: z.object({
    name: clientValidation.projectName.optional(),
    description: clientValidation.projectDescription
  }),

  // User forms
  createUser: z.object({
    email: clientValidation.email,
    name: clientValidation.userName,
    role: z.enum(['ADMIN', 'USER']).refine(
      (val) => ['ADMIN', 'USER'].includes(val),
      { message: '请选择用户角色' }
    ),
    password: clientValidation.password
  }),

  updateUser: z.object({
    email: clientValidation.email.optional(),
    name: clientValidation.userName.optional(),
    role: z.enum(['ADMIN', 'USER']).refine(
      (val) => ['ADMIN', 'USER'].includes(val),
      { message: '请选择用户角色' }
    ).optional()
  }),

  login: z.object({
    email: clientValidation.email,
    password: z.string().min(1, '密码是必填项')
  }),

  // Renewal forms
  renewVM: z.object({
    newExpiryDate: clientValidation.futureDate.optional(),
    renewalPeriodMonths: z.number()
      .int('续期月数必须是整数')
      .min(1, '续期月数至少为1个月')
      .max(24, '续期月数不能超过24个月')
      .optional()
  }),

  batchRenew: z.object({
    vmIds: z.array(z.string()).min(1, '请至少选择一个VM'),
    renewalPeriodMonths: z.number()
      .int('续期月数必须是整数')
      .min(1, '续期月数至少为1个月')
      .max(24, '续期月数不能超过24个月')
      .optional()
  })
}

// Validation helper functions for client-side
export const clientValidationHelpers = {
  /**
   * Validate form data and return formatted errors
   */
  validateForm<T>(
    data: any,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; errors: Record<string, string> } {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach(issue => {
          const field = issue.path.join('.')
          errors[field] = issue.message
        })
        return { success: false, errors }
      }
      return { success: false, errors: { general: '验证失败' } }
    }
  },

  /**
   * Validate single field
   */
  validateField<T>(
    value: any,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      const validatedData = schema.parse(value)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.issues[0]?.message || '验证失败' }
      }
      return { success: false, error: '验证失败' }
    }
  },

  /**
   * Real-time validation for form fields
   */
  createFieldValidator<T>(schema: z.ZodSchema<T>) {
    return (value: any): string | undefined => {
      try {
        schema.parse(value)
        return undefined
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.issues[0]?.message
        }
        return '验证失败'
      }
    }
  },

  /**
   * Sanitize and format input values
   */
  sanitizeInput: {
    email: (email: string): string => email.trim().toLowerCase(),
    string: (str: string): string => str.trim().replace(/\s+/g, ' '),
    projectName: (name: string): string => name.trim(),
    ipAddress: (ip: string): string => ip.trim(),
    domain: (domain: string): string => domain.trim().toLowerCase()
  },

  /**
   * Format error messages for display
   */
  formatErrorMessage: (error: any): string => {
    if (typeof error === 'string') {
      return error
    }
    
    if (error?.details && Array.isArray(error.details)) {
      return error.details.map((detail: any) => detail.message).join(', ')
    }
    
    if (error?.error) {
      return error.error
    }
    
    if (error?.message) {
      return error.message
    }
    
    return '操作失败，请重试'
  },

  /**
   * Check if date is in the future
   */
  isFutureDate: (dateString: string): boolean => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  },

  /**
   * Validate date range
   */
  validateDateRange: (startDate: string, endDate: string): string | undefined => {
    if (!startDate || !endDate) return undefined
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '日期格式无效'
    }
    
    if (start > end) {
      return '开始日期不能晚于结束日期'
    }
    
    return undefined
  },

  /**
   * Validate IP address format
   */
  validateIPAddress: (ip: string): boolean => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip)) return false
    
    const parts = ip.split('.')
    return parts.every(part => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  },

  /**
   * Validate domain format
   */
  validateDomain: (domain: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return domainRegex.test(domain)
  },

  /**
   * Get default expiry date (3 months from now)
   */
  getDefaultExpiryDate: (): string => {
    const date = new Date()
    date.setMonth(date.getMonth() + 3)
    return date.toISOString().split('T')[0]
  },

  /**
   * Format date for display
   */
  formatDate: (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  },

  /**
   * Calculate days until expiry
   */
  getDaysUntilExpiry: (expiryDate: string): number => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}

// Export for easy access
export const clientValidationUtils = {
  schemas: formSchemas,
  helpers: clientValidationHelpers,
  patterns: clientValidation
}