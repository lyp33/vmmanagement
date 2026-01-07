#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are properly configured
 */

const requiredVars = {
  // Database
  database: {
    vars: ['DATABASE_URL', 'POSTGRES_PRISMA_URL'],
    description: 'Database connection string',
    oneRequired: true
  },
  
  // Authentication
  auth: {
    vars: ['NEXTAUTH_SECRET'],
    description: 'NextAuth secret key for JWT signing',
    oneRequired: false
  },
  
  // Email Service
  email: {
    vars: ['RESEND_API_KEY'],
    description: 'Resend API key for email notifications',
    oneRequired: false
  }
}

const optionalVars = {
  'NEXTAUTH_URL': 'Base URL for NextAuth (auto-detected in Vercel)',
  'FROM_EMAIL': 'From email address for notifications',
  'CRON_SECRET': 'Secret key for cron job security',
  'NODE_ENV': 'Application environment (development/production)'
}

console.log('🔍 Validating environment configuration...\n')

let hasErrors = false
let hasWarnings = false

// Check required variables
Object.entries(requiredVars).forEach(([category, config]) => {
  console.log(`📋 ${category.toUpperCase()}:`)
  
  if (config.oneRequired) {
    const hasAny = config.vars.some(varName => process.env[varName])
    if (hasAny) {
      const setVar = config.vars.find(varName => process.env[varName])
      console.log(`   ✅ ${setVar} - configured`)
    } else {
      console.log(`   ❌ Missing: One of [${config.vars.join(', ')}] required`)
      console.log(`      ${config.description}`)
      hasErrors = true
    }
  } else {
    config.vars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`   ✅ ${varName} - configured`)
      } else {
        console.log(`   ❌ ${varName} - missing`)
        console.log(`      ${config.description}`)
        hasErrors = true
      }
    })
  }
  console.log()
})

// Check optional variables
console.log('📋 OPTIONAL CONFIGURATION:')
Object.entries(optionalVars).forEach(([varName, description]) => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} - configured`)
  } else {
    console.log(`   ⚠️  ${varName} - not set`)
    console.log(`      ${description}`)
    hasWarnings = true
  }
})

console.log()

// Environment-specific checks
const nodeEnv = process.env.NODE_ENV
const isVercel = process.env.VERCEL === '1'

console.log('🌍 ENVIRONMENT INFO:')
console.log(`   Environment: ${nodeEnv || 'not set'}`)
console.log(`   Vercel deployment: ${isVercel ? 'Yes' : 'No'}`)

if (isVercel) {
  console.log(`   Vercel URL: ${process.env.VERCEL_URL || 'not available'}`)
  console.log(`   Vercel Environment: ${process.env.VERCEL_ENV || 'not available'}`)
}

console.log()

// Summary
if (hasErrors) {
  console.log('❌ VALIDATION FAILED')
  console.log('   Please set the missing required environment variables')
  process.exit(1)
} else if (hasWarnings) {
  console.log('⚠️  VALIDATION PASSED WITH WARNINGS')
  console.log('   Consider setting the optional environment variables for full functionality')
} else {
  console.log('✅ VALIDATION PASSED')
  console.log('   All environment variables are properly configured')
}

// Production-specific recommendations
if (nodeEnv === 'production') {
  console.log('\n🚀 PRODUCTION RECOMMENDATIONS:')
  console.log('   - Ensure NEXTAUTH_SECRET is a strong, random string')
  console.log('   - Verify database connection is stable')
  console.log('   - Test email notifications')
  console.log('   - Monitor application logs')
  console.log('   - Set up health check monitoring')
}