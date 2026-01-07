import { validation } from '../validation'
import { clientValidationUtils } from '../client-validation'

describe('Validation Utilities', () => {
  describe('Server-side validation', () => {
    test('should validate VM creation data correctly', () => {
      const validData = {
        email: 'test@example.com',
        vmAccount: 'vm-001',
        vmInternalIP: '192.168.1.100',
        vmDomain: 'vm001.example.com',
        currentExpiryDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        projectId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = validation.vm.create.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        vmAccount: 'vm-001',
        vmInternalIP: '192.168.1.100',
        vmDomain: 'vm001.example.com',
        currentExpiryDate: new Date(Date.now() + 86400000).toISOString(),
        projectId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = validation.vm.create.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject invalid IP address', () => {
      const invalidData = {
        email: 'test@example.com',
        vmAccount: 'vm-001',
        vmInternalIP: '999.999.999.999',
        vmDomain: 'vm001.example.com',
        currentExpiryDate: new Date(Date.now() + 86400000).toISOString(),
        projectId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = validation.vm.create.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject past expiry date', () => {
      const invalidData = {
        email: 'test@example.com',
        vmAccount: 'vm-001',
        vmInternalIP: '192.168.1.100',
        vmDomain: 'vm001.example.com',
        currentExpiryDate: new Date(Date.now() - 86400000).toISOString(), // yesterday
        projectId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = validation.vm.create.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Client-side validation', () => {
    test('should validate form data correctly', () => {
      const validData = {
        email: 'test@example.com',
        vmAccount: 'vm-001',
        vmInternalIP: '192.168.1.100',
        vmDomain: 'vm001.example.com',
        currentExpiryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        projectId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = clientValidationUtils.helpers.validateForm(
        validData,
        clientValidationUtils.schemas.createVM
      )
      expect(result.success).toBe(true)
    })

    test('should return formatted errors for invalid data', () => {
      const invalidData = {
        email: 'invalid-email',
        vmAccount: '',
        vmInternalIP: '999.999.999.999',
        vmDomain: '',
        currentExpiryDate: '',
        projectId: ''
      }

      const result = clientValidationUtils.helpers.validateForm(
        invalidData,
        clientValidationUtils.schemas.createVM
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toHaveProperty('email')
        expect(result.errors).toHaveProperty('vmAccount')
        expect(result.errors).toHaveProperty('vmInternalIP')
        expect(result.errors).toHaveProperty('vmDomain')
        expect(result.errors).toHaveProperty('currentExpiryDate')
        expect(result.errors).toHaveProperty('projectId')
      }
    })
  })

  describe('Validation helpers', () => {
    test('should validate IP address correctly', () => {
      expect(clientValidationUtils.helpers.validateIPAddress('192.168.1.1')).toBe(true)
      expect(clientValidationUtils.helpers.validateIPAddress('10.0.0.1')).toBe(true)
      expect(clientValidationUtils.helpers.validateIPAddress('999.999.999.999')).toBe(false)
      expect(clientValidationUtils.helpers.validateIPAddress('not-an-ip')).toBe(false)
    })

    test('should validate domain correctly', () => {
      expect(clientValidationUtils.helpers.validateDomain('example.com')).toBe(true)
      expect(clientValidationUtils.helpers.validateDomain('sub.example.com')).toBe(true)
      expect(clientValidationUtils.helpers.validateDomain('vm001.internal.company.com')).toBe(true)
      expect(clientValidationUtils.helpers.validateDomain('invalid..domain')).toBe(false)
      expect(clientValidationUtils.helpers.validateDomain('.invalid')).toBe(false)
    })

    test('should check future dates correctly', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      
      expect(clientValidationUtils.helpers.isFutureDate(tomorrow)).toBe(true)
      expect(clientValidationUtils.helpers.isFutureDate(yesterday)).toBe(false)
    })

    test('should validate date range correctly', () => {
      const start = '2024-01-01'
      const end = '2024-01-31'
      const invalidEnd = '2023-12-31'
      
      expect(clientValidationUtils.helpers.validateDateRange(start, end)).toBeUndefined()
      expect(clientValidationUtils.helpers.validateDateRange(start, invalidEnd)).toBe('开始日期不能晚于结束日期')
    })

    test('should sanitize input correctly', () => {
      expect(clientValidationUtils.helpers.sanitizeInput.email('  TEST@EXAMPLE.COM  ')).toBe('test@example.com')
      expect(clientValidationUtils.helpers.sanitizeInput.string('  hello   world  ')).toBe('hello world')
      expect(clientValidationUtils.helpers.sanitizeInput.ipAddress('  192.168.1.1  ')).toBe('192.168.1.1')
      expect(clientValidationUtils.helpers.sanitizeInput.domain('  EXAMPLE.COM  ')).toBe('example.com')
    })

    test('should get default expiry date correctly', () => {
      const defaultDate = clientValidationUtils.helpers.getDefaultExpiryDate()
      const expectedDate = new Date()
      expectedDate.setMonth(expectedDate.getMonth() + 3)
      
      expect(defaultDate).toBe(expectedDate.toISOString().split('T')[0])
    })

    test('should calculate days until expiry correctly', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString()
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()
      
      expect(clientValidationUtils.helpers.getDaysUntilExpiry(tomorrow)).toBe(1)
      expect(clientValidationUtils.helpers.getDaysUntilExpiry(nextWeek)).toBe(7)
    })
  })
})