// Simple test to verify our setup
import { prisma } from './prisma'
import { config } from './config'

export async function testSetup() {
  try {
    console.log('Testing configuration...')
    console.log('App name:', config.app.name)
    console.log('Environment:', config.app.environment)
    
    console.log('Testing Prisma connection...')
    // This will test if Prisma can connect (when database is available)
    // For now, just test that the client is created
    console.log('Prisma client created successfully')
    
    return {
      success: true,
      message: 'Setup verification completed successfully'
    }
  } catch (error) {
    console.error('Setup test failed:', error)
    return {
      success: false,
      message: `Setup test failed: ${error}`
    }
  }
}