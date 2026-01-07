import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notification';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can view notification statistics
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const stats = await notificationService.getNotificationStats(days);

    return NextResponse.json({
      success: true,
      stats,
      period: `${days} days`
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can trigger manual operations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'check-expiry':
        const expiryResult = await notificationService.checkExpiringVMs();
        return NextResponse.json({
          success: true,
          action: 'check-expiry',
          result: expiryResult
        });

      case 'retry-failed':
        const retryResult = await notificationService.retryFailedNotifications();
        return NextResponse.json({
          success: true,
          action: 'retry-failed',
          result: retryResult
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: check-expiry, retry-failed' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in notification operation:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}