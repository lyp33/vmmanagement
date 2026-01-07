import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification';

/**
 * Test endpoint for batch notification functionality
 * GET /api/notifications/batch-test
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Testing batch notification system...');
    
    // Run the expiry check which will send batch notifications
    const result = await notificationService.checkExpiringVMs();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        totalVMs: result.totalVMs,
        expiringVMs: result.expiringVMs,
        notificationsSent: result.notificationsSent,
        notificationsFailed: result.notificationsFailed,
        userNotifications: result.userNotifications,
        adminNotifications: result.adminNotifications,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Batch notification test error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
