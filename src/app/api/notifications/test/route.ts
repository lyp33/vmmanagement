import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can test email configuration
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'testEmail is required' },
        { status: 400 }
      );
    }

    // Test email configuration
    const configTest = await emailService.testEmailConfiguration();
    
    if (!configTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Email configuration test failed',
        details: configTest.error
      });
    }

    // Send a test expiry notification
    const testEmailData = {
      vmAccount: 'test-vm-001',
      vmDomain: 'test-vm.example.com',
      vmInternalIP: '192.168.1.100',
      currentExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      projectName: 'Test Project',
      recipientEmail: testEmail
    };

    const emailResult = await emailService.sendExpiryNotification(testEmailData);

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success 
        ? 'Test notification sent successfully' 
        : 'Failed to send test notification',
      messageId: emailResult.messageId,
      error: emailResult.error,
      testData: testEmailData
    });

  } catch (error) {
    console.error('Error testing notification:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}