import { NextRequest, NextResponse } from 'next/server'
import { checkVMAccess } from '@/lib/middleware/project-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const accessResult = await checkVMAccess(request, id)
  
  if (accessResult) {
    return accessResult
  }

  return NextResponse.json({ hasAccess: true })
}