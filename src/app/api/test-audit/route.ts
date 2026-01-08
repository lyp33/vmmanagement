import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET() {
  try {
    // Test creating an audit log
    const testLog = await storage.createAuditLog({
      operation: 'TEST_OPERATION',
      entityType: 'Test',
      entityId: 'test-123',
      userId: 'test-user',
      userEmail: 'test@example.com',
      changes: {
        test: 'This is a test audit log'
      }
    })

    console.log('Created test audit log:', testLog)

    // Try to fetch audit logs
    const logs = await storage.findAuditLogs(10)
    
    console.log('Fetched audit logs:', logs)

    return NextResponse.json({
      success: true,
      createdLog: testLog,
      allLogs: logs,
      totalLogs: logs.length
    })
  } catch (error) {
    console.error('Test audit error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
