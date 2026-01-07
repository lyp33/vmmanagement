import { NextResponse } from 'next/server'

// Mock data for testing
const mockAuditLogs = [
  {
    id: 'audit1',
    operation: 'CREATE',
    entityType: 'VMRecord',
    entityId: '1',
    userId: 'user1',
    userEmail: 'admin@example.com',
    changes: {
      email: 'user1@example.com',
      vmAccount: 'vm-user1'
    },
    timestamp: '2024-01-01T10:00:00Z',
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit2',
    operation: 'UPDATE',
    entityType: 'VMRecord',
    entityId: '1',
    userId: 'user1',
    userEmail: 'admin@example.com',
    changes: {
      currentExpiryDate: '2024-04-01T00:00:00Z'
    },
    timestamp: '2024-01-02T14:30:00Z',
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit3',
    operation: 'LOGIN',
    entityType: 'User',
    entityId: 'user2',
    userId: 'user2',
    userEmail: 'user@example.com',
    timestamp: '2024-01-03T09:15:00Z',
    ipAddress: '192.168.1.101'
  }
]

export async function GET() {
  try {
    return NextResponse.json({ 
      logs: mockAuditLogs,
      total: mockAuditLogs.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}