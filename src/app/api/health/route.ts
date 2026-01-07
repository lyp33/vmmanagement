import { NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.app.environment,
      version: config.app.version,
      checks: {
        database: 'unknown',
        email: 'unknown',
        auth: 'unknown'
      }
    }

    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`
      healthCheck.checks.database = 'healthy'
    } catch (error) {
      healthCheck.checks.database = 'unhealthy'
      healthCheck.status = 'degraded'
    }

    // Email service check (basic validation)
    if (config.email.resendApiKey) {
      healthCheck.checks.email = 'configured'
    } else {
      healthCheck.checks.email = 'not_configured'
      if (config.app.isProduction) {
        healthCheck.status = 'degraded'
      }
    }

    // Auth configuration check
    if (config.auth.secret && config.auth.url) {
      healthCheck.checks.auth = 'configured'
    } else {
      healthCheck.checks.auth = 'not_configured'
      healthCheck.status = 'unhealthy'
    }

    // Include setup info in development
    if (config.app.isDevelopment) {
      const { testSetup } = await import('@/lib/test-setup')
      const setupResult = await testSetup()
      
      return NextResponse.json({
        ...healthCheck,
        setup: setupResult,
        components: {
          nextjs: '16.1.1',
          typescript: 'configured',
          tailwind: 'configured',
          shadcn: 'configured',
          prisma: 'configured',
          nextauth: 'configured',
        }
      })
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503

    return NextResponse.json(healthCheck, { status: statusCode })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: config.app.isDevelopment ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Health check failed',
      environment: config.app.environment
    }, { status: 503 })
  }
}