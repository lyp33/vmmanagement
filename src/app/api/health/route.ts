import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

export async function GET() {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.app.environment,
      version: config.app.version,
      checks: {
        storage: 'unknown',
        email: 'unknown',
        auth: 'unknown'
      }
    }

    // Storage health check (KV or file-based)
    try {
      // Check if we're using KV storage
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        healthCheck.checks.storage = 'kv_configured'
      } else {
        healthCheck.checks.storage = 'file_based'
      }
    } catch (error) {
      healthCheck.checks.storage = 'unhealthy'
      healthCheck.status = 'degraded'
    }

    // Email service check (basic validation)
    if (config.email.resendApiKey) {
      healthCheck.checks.email = 'configured'
    } else {
      healthCheck.checks.email = 'not_configured'
      // Email is optional, don't mark as degraded
    }

    // Auth configuration check
    if (config.auth.secret && config.auth.url) {
      healthCheck.checks.auth = 'configured'
    } else {
      healthCheck.checks.auth = 'not_configured'
      if (config.app.isProduction) {
        healthCheck.status = 'degraded'
      }
    }

    // Include setup info in development
    if (config.app.isDevelopment) {
      try {
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
            storage: healthCheck.checks.storage,
            nextauth: 'configured',
          }
        })
      } catch (error) {
        // If test-setup fails, just return basic health check
        return NextResponse.json(healthCheck)
      }
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