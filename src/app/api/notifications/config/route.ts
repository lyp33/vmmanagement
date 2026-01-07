import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins can view email configuration
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const config = {
      emailConfigured: !!process.env.RESEND_API_KEY,
      cronSecret: !!process.env.CRON_SECRET,
      cronSchedule: '0 9 * * *', // Daily at 9 AM UTC
      notificationDaysBeforeExpiry: 7,
      fromEmail: 'VM Expiry Management <noreply@yourdomain.com>',
      features: {
        autoNotifications: !!process.env.RESEND_API_KEY,
        manualTesting: true,
        emailPreview: true
      }
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching notification config:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
