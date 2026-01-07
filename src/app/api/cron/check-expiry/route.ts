import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting expiry check cron job...');
    
    // Check for expiring VMs and send notifications
    const result = await notificationService.checkExpiringVMs();
    
    console.log('Expiry check completed:', result);

    // Also retry any failed notifications from previous runs
    const retryResult = await notificationService.retryFailedNotifications();
    
    console.log('Failed notification retry completed:', retryResult);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      expiryCheck: result,
      retryResults: retryResult
    });

  } catch (error) {
    console.error('Cron job error:', error);
    
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

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  try {
    // Check if this is a manual test request
    const isManualTest = request.nextUrl.searchParams.get('test') === 'true';
    
    if (!isManualTest) {
      return NextResponse.json(
        { 
          message: 'This endpoint is for cron jobs. Add ?test=true for manual testing.',
          endpoint: '/api/cron/check-expiry',
          method: 'POST'
        }
      );
    }

    console.log('Manual expiry check test...');
    
    // Run the same logic as POST for testing
    const result = await notificationService.checkExpiringVMs();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      testMode: true,
      result
    });

  } catch (error) {
    console.error('Manual test error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        testMode: true
      },
      { status: 500 }
    );
  }
}