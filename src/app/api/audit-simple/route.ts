import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const limit = limitParam ? parseInt(limitParam, 10) : 100

    let logs = await storage.findAuditLogs(limit)
    
    // Filter by entityType and entityId if provided
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType)
    }
    if (entityId) {
      logs = logs.filter(log => log.entityId === entityId)
    }
    
    return NextResponse.json({ 
      logs,
      total: logs.length
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}