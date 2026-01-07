import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { errorLogger, ErrorCategory, LogLevel } from '@/lib/error-logger'

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL = 'INTERNAL',
  RATE_LIMIT = 'RATE_LIMIT'
}

// Error codes for specific business logic errors
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PROJECT_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_EXPIRY_DATE = 'INVALID_EXPIRY_DATE',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_IP_ADDRESS = 'INVALID_IP_ADDRESS',

  // Business logic errors
  VM_NOT_FOUND = 'VM_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_PROJECT_NAME = 'DUPLICATE_PROJECT_NAME',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  PROJECT_HAS_VMS = 'PROJECT_HAS_VMS',
  EXPIRY_DATE_IN_PAST = 'EXPIRY_DATE_IN_PAST',

  // External service errors
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: any
  public readonly timestamp: Date

  constructor(
    type: ErrorType,
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message)
    this.type = type
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date()
    this.name = 'AppError'

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError)
  }
}

// Error response interface
interface ErrorResponse {
  error: string
  code?: string
  details?: any
  timestamp?: string
}

// Error handler class
export class ErrorHandler {
  /**
   * Handle and format errors for API responses
   */
  static handleError(error: unknown): NextResponse<ErrorResponse> {
    console.error('Error occurred:', error)

    // Log error for monitoring
    this.logErrorForMonitoring(error)

    // Handle custom AppError
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          timestamp: error.timestamp.toISOString()
        },
        { status: error.statusCode }
      )
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      errorLogger.logValidationError('Request validation failed', error, {
        issues: error.issues
      })
      
      return NextResponse.json(
        {
          error: '请求数据验证失败',
          code: ErrorCode.INVALID_INPUT,
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          })),
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(error)
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      errorLogger.logDatabaseError('Unknown database error', error)
      
      return NextResponse.json(
        {
          error: '数据库操作失败',
          code: ErrorCode.DATABASE_CONNECTION_ERROR,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      errorLogger.logValidationError('Database validation error', error)
      
      return NextResponse.json(
        {
          error: '数据验证失败',
          code: ErrorCode.INVALID_INPUT,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      errorLogger.logSystemError('Unhandled JavaScript error', error)
      
      // Don't expose internal error details in production
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return NextResponse.json(
        {
          error: isDevelopment ? error.message : '服务器内部错误',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          details: isDevelopment ? { stack: error.stack } : undefined,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Handle unknown errors
    errorLogger.logSystemError('Unknown error type', undefined, { error })
    
    return NextResponse.json(
      {
        error: '未知错误',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }

  /**
   * Handle Prisma-specific errors
   */
  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse<ErrorResponse> {
    errorLogger.logDatabaseError(`Prisma error: ${error.code}`, error, {
      prismaCode: error.code,
      meta: error.meta
    })

    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const target = error.meta?.target as string[]
        const field = target?.[0] || 'field'
        return NextResponse.json(
          {
            error: `${field === 'email' ? '邮箱地址' : field === 'name' ? '名称' : '字段'}已存在`,
            code: field === 'email' ? ErrorCode.DUPLICATE_EMAIL : ErrorCode.DUPLICATE_PROJECT_NAME,
            details: { field, constraint: 'unique' },
            timestamp: new Date().toISOString()
          },
          { status: 409 }
        )

      case 'P2025': // Record not found
        return NextResponse.json(
          {
            error: '请求的资源不存在',
            code: ErrorCode.NOT_FOUND,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        )

      case 'P2003': // Foreign key constraint violation
        return NextResponse.json(
          {
            error: '关联数据不存在或已被删除',
            code: ErrorCode.INVALID_INPUT,
            details: { constraint: 'foreign_key' },
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )

      case 'P2014': // Required relation missing
        return NextResponse.json(
          {
            error: '缺少必需的关联数据',
            code: ErrorCode.INVALID_INPUT,
            details: { constraint: 'required_relation' },
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )

      default:
        return NextResponse.json(
          {
            error: '数据库操作失败',
            code: ErrorCode.DATABASE_CONNECTION_ERROR,
            details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code } : undefined,
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
    }
  }

  /**
   * Log error for monitoring and debugging
   */
  static logError(error: unknown, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      timestamp,
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    }

    // Console log for immediate debugging
    console.error('Application Error:', JSON.stringify(errorInfo, null, 2))

    // Use structured error logger
    if (error instanceof Error) {
      errorLogger.logSystemError(error.message, error, context)
    } else {
      errorLogger.logSystemError('Unknown error', undefined, { error, ...context })
    }
  }

  /**
   * Log error specifically for monitoring (internal method)
   */
  private static logErrorForMonitoring(error: unknown): void {
    if (error instanceof AppError) {
      const category = this.mapErrorTypeToCategory(error.type)
      errorLogger.logError(LogLevel.ERROR, category, error.message, error, {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      })
    } else if (error instanceof Error) {
      errorLogger.logSystemError(error.message, error)
    } else {
      errorLogger.logSystemError('Unknown error type', undefined, { error })
    }
  }

  /**
   * Map AppError type to ErrorCategory
   */
  private static mapErrorTypeToCategory(type: ErrorType): ErrorCategory {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return ErrorCategory.AUTHENTICATION
      case ErrorType.AUTHORIZATION:
        return ErrorCategory.AUTHORIZATION
      case ErrorType.VALIDATION:
        return ErrorCategory.VALIDATION
      case ErrorType.DATABASE:
        return ErrorCategory.DATABASE
      case ErrorType.EXTERNAL_SERVICE:
        return ErrorCategory.EXTERNAL_SERVICE
      default:
        return ErrorCategory.SYSTEM
    }
  }
}

// Predefined error creators for common scenarios
export const createError = {
  validation: (message: string, details?: any) =>
    new AppError(ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, message, 400, details),

  authentication: (message: string = '身份验证失败') =>
    new AppError(ErrorType.AUTHENTICATION, ErrorCode.INVALID_CREDENTIALS, message, 401),

  authorization: (message: string = '权限不足') =>
    new AppError(ErrorType.AUTHORIZATION, ErrorCode.INSUFFICIENT_PERMISSIONS, message, 403),

  notFound: (resource: string = '资源') =>
    new AppError(ErrorType.NOT_FOUND, ErrorCode.NOT_FOUND, `${resource}不存在`, 404),

  conflict: (message: string) =>
    new AppError(ErrorType.CONFLICT, ErrorCode.DUPLICATE_PROJECT_NAME, message, 409),

  vmNotFound: () =>
    new AppError(ErrorType.NOT_FOUND, ErrorCode.VM_NOT_FOUND, 'VM记录不存在', 404),

  projectNotFound: () =>
    new AppError(ErrorType.NOT_FOUND, ErrorCode.PROJECT_NOT_FOUND, '项目不存在', 404),

  userNotFound: () =>
    new AppError(ErrorType.NOT_FOUND, ErrorCode.USER_NOT_FOUND, '用户不存在', 404),

  projectAccessDenied: () =>
    new AppError(ErrorType.AUTHORIZATION, ErrorCode.PROJECT_ACCESS_DENIED, '无权访问此项目', 403),

  adminRequired: () =>
    new AppError(ErrorType.AUTHORIZATION, ErrorCode.ADMIN_REQUIRED, '需要管理员权限', 403),

  expiryDateInPast: () =>
    new AppError(ErrorType.VALIDATION, ErrorCode.EXPIRY_DATE_IN_PAST, '到期时间必须是未来时间', 400),

  projectHasVMs: () =>
    new AppError(ErrorType.CONFLICT, ErrorCode.PROJECT_HAS_VMS, '项目下还有VM记录，无法删除', 409),

  emailServiceError: (message: string = '邮件发送失败') =>
    new AppError(ErrorType.EXTERNAL_SERVICE, ErrorCode.EMAIL_SERVICE_ERROR, message, 503),

  databaseError: (message: string = '数据库连接失败') =>
    new AppError(ErrorType.DATABASE, ErrorCode.DATABASE_CONNECTION_ERROR, message, 503),

  internalError: (message: string = '服务器内部错误') =>
    new AppError(ErrorType.INTERNAL, ErrorCode.INTERNAL_SERVER_ERROR, message, 500)
}

// Error handling middleware wrapper
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      ErrorHandler.logError(error, { handler: handler.name })
      return ErrorHandler.handleError(error)
    }
  }
}

// Async error boundary for API routes
export function asyncHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      ErrorHandler.logError(error, { 
        url: request.url,
        method: request.method,
        context 
      })
      return ErrorHandler.handleError(error)
    }
  }
}

// Client-side error formatting
export const formatClientError = (error: any): string => {
  if (error?.details && Array.isArray(error.details)) {
    return error.details.map((detail: any) => detail.message).join(', ')
  }
  return error?.error || error?.message || '操作失败，请重试'
}

// Error boundary hook for React components
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    console.error(`Error in ${context}:`, error)
    
    // Format error message for user display
    const userMessage = formatClientError(error)
    
    // You can integrate with toast notifications here
    // toast.error(userMessage)
    
    return userMessage
  }

  return { handleError, formatError: formatClientError }
}