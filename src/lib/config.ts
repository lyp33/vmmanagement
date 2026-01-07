export const config = {
  database: {
    // Use Vercel Postgres URL in production, fallback to DATABASE_URL
    url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '',
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET || '',
    // Auto-detect production URL or use provided NEXTAUTH_URL
    url: process.env.NEXTAUTH_URL || 
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || "noreply@vmmanagement.com",
  },
  app: {
    name: "VM Expiry Management System",
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

// Validation for required environment variables (only at runtime, not build time)
export function validateConfig() {
  // Skip validation during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return
  }

  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'RESEND_API_KEY',
  ]

  const missing = required.filter(key => !process.env[key] && !process.env.POSTGRES_PRISMA_URL)
  
  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`)
    // Don't throw error, just warn - app will use KV storage or file storage as fallback
  }
}