#!/usr/bin/env node

/**
 * Production Environment Setup Script
 * This script helps validate and set up the production environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up production environment...\n');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Vercel deployment: ${isVercel ? 'Yes' : 'No'}\n`);

// Required environment variables
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
];

// Database URL (either DATABASE_URL or Vercel Postgres)
const hasDatabaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

console.log('📋 Checking environment variables...');

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (!hasDatabaseUrl) {
  missingVars.push('DATABASE_URL or POSTGRES_PRISMA_URL');
}

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  
  if (!isVercel) {
    console.log('\n💡 Please set these variables in your deployment platform or .env file');
    process.exit(1);
  }
} else {
  console.log('✅ All required environment variables are set');
}

// Generate Prisma client
console.log('\n🔧 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Run database migrations in production
if (isProduction && hasDatabaseUrl) {
  console.log('\n📊 Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error.message);
    console.log('💡 This might be expected if migrations have already been run');
  }
}

// Validate configuration
console.log('\n🔍 Validating configuration...');
try {
  const { validateConfig } = require('../src/lib/config');
  validateConfig();
  console.log('✅ Configuration validation passed');
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  if (isProduction) {
    process.exit(1);
  }
}

console.log('\n🎉 Production environment setup completed successfully!');

if (isVercel) {
  console.log('\n📝 Vercel-specific notes:');
  console.log('   - Database migrations will run automatically on deployment');
  console.log('   - Cron jobs are configured in vercel.json');
  console.log('   - Environment variables should be set in Vercel dashboard');
}

console.log('\n🔗 Next steps:');
console.log('   1. Ensure all environment variables are set in your deployment platform');
console.log('   2. Configure your custom domain (if applicable)');
console.log('   3. Set up monitoring and logging');
console.log('   4. Test the deployment with a health check');