export const config = {
  database: {
    // Use Vercel Postgres URL in production, fallback to DATABASE_URL
    url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL!,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    // Auto-detect production URL or use provided NEXTAUTH_URL
    url: process.env.NEXTAUTH_URL || 
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || "noreply@vmmanagement.com",
  },
  app: {
    name: "VM到期管理系统",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
  },
  notifications: {
    expiryWarningDays: 7,
    defaultRenewalMonths: 3,
  },
  security: {
    cronSecret: process.env.CRON_SECRET,
  },
  vercel: {
    // Vercel-specific environment variables
    url: process.env.VERCEL_URL,
    env: process.env.VERCEL_ENV, // 'production', 'preview', or 'development'
    region: process.env.VERCEL_REGION,
  },
} as const

// Validation for required environment variables
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'RESEND_API_KEY',
  ]

  const missing = required.filter(key => !process.env[key] && !process.env.POSTGRES_PRISMA_URL)
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Call validation in production
if (config.app.isProduction) {
  validateConfig()
}