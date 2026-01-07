import { prisma } from '@/lib/prisma'

// Error log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Error categories for better organization
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  USER_ACTION = 'USER_ACTION'
}

// Error log entry interface
interface ErrorLogEntry {
  level: LogLevel
  category: ErrorCategory
  message: string
  error?: Error
  context?: Record<string, any>
  userId?: string
  userEmail?: string
  requestId?: string
  url?: string
  method?: string
  userAgent?: string
  ipAddress?: string
  timestamp: Date
  stackTrace?: string
  additionalData?: Record<string, any>
}

// Error logger class
export class ErrorLogger {
  private static instance: ErrorLogger
  private logQueue: ErrorLogEntry[] = []
  private isProcessing = false

  private constructor() {
    // Start processing queue
    this.startQueueProcessor()
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  /**
   * Log an error with full context
   */
  async logError(
    level: LogLevel,
    category: ErrorCategory,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const logEntry: ErrorLogEntry = {
      level,
      category,
      message,
      error,
      context,
      timestamp: new Date(),
      stackTrace: error?.stack,
      ...this.extractRequestContext()
    }

    // Add to queue for async processing
    this.logQueue.push(logEntry)

    // Also log to console immediately for development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry)
    }

    // For critical errors, try to log immediately
    if (level === LogLevel.ERROR) {
      await this.processLogEntry(logEntry)
    }
  }

  /**
   * Log authentication errors
   */
  async logAuthError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.ERROR, ErrorCategory.AUTHENTICATION, message, error, context)
  }

  /**
   * Log authorization errors
   */
  async logAuthzError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.ERROR, ErrorCategory.AUTHORIZATION, message, error, context)
  }

  /**
   * Log validation errors
   */
  async logValidationError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.WARN, ErrorCategory.VALIDATION, message, error, context)
  }

  /**
   * Log database errors
   */
  async logDatabaseError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.ERROR, ErrorCategory.DATABASE, message, error, context)
  }

  /**
   * Log external service errors
   */
  async logExternalServiceError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.ERROR, ErrorCategory.EXTERNAL_SERVICE, message, error, context)
  }

  /**
   * Log business logic errors
   */
  async logBusinessError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.WARN, ErrorCategory.BUSINESS_LOGIC, message, error, context)
  }

  /**
   * Log system errors
   */
  async logSystemError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.ERROR, ErrorCategory.SYSTEM, message, error, context)
  }

  /**
   * Log user action errors
   */
  async logUserActionError(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.INFO, ErrorCategory.USER_ACTION, message, error, context)
  }

  /**
   * Log warning messages
   */
  async logWarning(
    category: ErrorCategory,
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.WARN, category, message, undefined, context)
  }

  /**
   * Log info messages
   */
  async logInfo(
    category: ErrorCategory,
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logError(LogLevel.INFO, category, message, undefined, context)
  }

  /**
   * Extract request context from current execution
   */
  private extractRequestContext(): Partial<ErrorLogEntry> {
    // In a serverless environment, we need to extract this from the current request
    // This would typically be done through middleware or request context
    return {
      requestId: this.generateRequestId(),
      // url, method, userAgent, ipAddress would be extracted from request headers
      // userId, userEmail would be extracted from session
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log to console for development
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const logMethod = entry.level === LogLevel.ERROR ? console.error :
                     entry.level === LogLevel.WARN ? console.warn :
                     console.log

    logMethod(`[${entry.level}] [${entry.category}] ${entry.message}`, {
      error: entry.error,
      context: entry.context,
      timestamp: entry.timestamp.toISOString()
    })
  }

  /**
   * Process log entry - save to database and external services
   */
  private async processLogEntry(entry: ErrorLogEntry): Promise<void> {
    try {
      // Save to database (optional - for critical errors only to avoid performance impact)
      if (entry.level === LogLevel.ERROR) {
        await this.saveToDatabase(entry)
      }

      // Send to external logging service in production
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalService(entry)
      }
    } catch (error) {
      // Fallback to console if logging fails
      console.error('Failed to process log entry:', error)
      this.logToConsole(entry)
    }
  }

  /**
   * Save critical errors to database
   */
  private async saveToDatabase(entry: ErrorLogEntry): Promise<void> {
    try {
      // Only save critical errors to avoid database bloat
      if (entry.level === LogLevel.ERROR) {
        // Note: You might want to create a separate error_logs table
        // For now, we'll use the existing audit system
        // await prisma.errorLog.create({
        //   data: {
        //     level: entry.level,
        //     category: entry.category,
        //     message: entry.message,
        //     stackTrace: entry.stackTrace,
        //     context: entry.context,
        //     userId: entry.userId,
        //     timestamp: entry.timestamp
        //   }
        // })
      }
    } catch (error) {
      console.error('Failed to save error to database:', error)
    }
  }

  /**
   * Send to external logging service
   */
  private async sendToExternalService(entry: ErrorLogEntry): Promise<void> {
    try {
      // TODO: Integrate with external logging service
      // Examples: Sentry, LogRocket, DataDog, etc.
      
      // Example Sentry integration:
      // if (typeof window !== 'undefined' && window.Sentry) {
      //   window.Sentry.captureException(entry.error || new Error(entry.message), {
      //     level: entry.level.toLowerCase(),
      //     tags: {
      //       category: entry.category
      //     },
      //     extra: entry.context
      //   })
      // }

      // Example webhook to external service:
      // await fetch(process.env.ERROR_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // })
    } catch (error) {
      console.error('Failed to send error to external service:', error)
    }
  }

  /**
   * Start queue processor for async logging
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.logQueue.length === 0) {
        return
      }

      this.isProcessing = true
      const batch = this.logQueue.splice(0, 10) // Process in batches

      for (const entry of batch) {
        await this.processLogEntry(entry)
      }

      this.isProcessing = false
    }, 5000) // Process every 5 seconds
  }

  /**
   * Get error statistics for monitoring
   */
  async getErrorStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsByLevel: Record<LogLevel, number>
    recentErrors: ErrorLogEntry[]
  }> {
    // This would query your error logs database
    // For now, return mock data
    return {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsByLevel: {} as Record<LogLevel, number>,
      recentErrors: []
    }
  }

  /**
   * Clear old logs (cleanup job)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    try {
      // Delete old error logs from database
      // await prisma.errorLog.deleteMany({
      //   where: {
      //     timestamp: {
      //       lt: cutoffDate
      //     }
      //   }
      // })
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }
}

// Singleton instance
export const errorLogger = ErrorLogger.getInstance()

// Convenience functions
export const logError = (
  category: ErrorCategory,
  message: string,
  error?: Error,
  context?: Record<string, any>
) => errorLogger.logError(LogLevel.ERROR, category, message, error, context)

export const logWarning = (
  category: ErrorCategory,
  message: string,
  context?: Record<string, any>
) => errorLogger.logWarning(category, message, context)

export const logInfo = (
  category: ErrorCategory,
  message: string,
  context?: Record<string, any>
) => errorLogger.logInfo(category, message, context)

// Specific error loggers
export const logAuthError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logAuthError(message, error, context)

export const logAuthzError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logAuthzError(message, error, context)

export const logValidationError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logValidationError(message, error, context)

export const logDatabaseError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logDatabaseError(message, error, context)

export const logExternalServiceError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logExternalServiceError(message, error, context)

export const logBusinessError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logBusinessError(message, error, context)

export const logSystemError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logSystemError(message, error, context)

export const logUserActionError = (message: string, error?: Error, context?: Record<string, any>) =>
  errorLogger.logUserActionError(message, error, context)