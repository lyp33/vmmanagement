import { NextRequest, NextResponse } from 'next/server'
import { checkProjectAccess } from '@/lib/middleware/project-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const accessResult = await checkProjectAccess(request, id)
  
  if (accessResult) {
    return accessResult
  }

  return NextResponse.json({ hasAccess: true })
}