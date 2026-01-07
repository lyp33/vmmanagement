import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth-middleware'

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request)
  
  if (adminResult) {
    return adminResult
  }

  return NextResponse.json({ hasAccess: true })
}