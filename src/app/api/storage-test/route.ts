import { NextResponse } from 'next/server'
import { storage, getStorageType } from '@/lib/storage'

export async function GET() {
  try {
    const storageType = getStorageType()
    
    // Test basic operations
    const testResults = {
      storageType,
      timestamp: new Date().toISOString(),
      tests: {
        connection: 'OK',
        readWrite: 'Not tested'
      }
    }

    // Try to read users (should work even if empty)
    try {
      const admin = await storage.findUserByEmail('admin@123.com')
      testResults.tests.readWrite = admin ? 'OK - Admin found' : 'OK - No admin yet'
    } catch (error) {
      testResults.tests.readWrite = `Error: ${error}`
    }

    return NextResponse.json(testResults)
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Storage test failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
