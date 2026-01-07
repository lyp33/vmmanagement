import { Resend } from 'resend';

// Lazy initialize Resend only when needed
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured. Email notifications will be disabled.');
      // Return a mock Resend that doesn't actually send emails
      return {
        emails: {
          send: async () => {
            console.log('Email sending skipped: RESEND_API_KEY not configured');
            return { id: 'mock-email-id' };
          }
        }
      } as any;
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface VMExpiryEmailData {
  vmAccount: string;
  vmDomain: string;
  vmInternalIP: string;
  currentExpiryDate: Date;
  projectName: string;
  recipientEmail: string;
}

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send VM expiry notification email
   */
  async sendExpiryNotification(data: VMExpiryEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const emailHtml = this.generateExpiryEmailTemplate(data);
      const emailText = this.generateExpiryEmailText(data);

      const result = await getResend().emails.send({
        from: 'VM Expiry Management <noreply@yourdomain.com>',
        to: [data.recipientEmail],
        subject: `VM Expiry Alert: ${data.vmAccount} expires in 7 days`,
        html: emailHtml,
        text: emailText,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Unknown email sending error'
        };
      }

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate HTML email template for VM expiry notification
   */
  private generateExpiryEmailTemplate(data: VMExpiryEmailData): string {
    const formattedDate = data.currentExpiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VM Expiry Alert</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .alert {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .vm-details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .vm-details h3 {
            margin-top: 0;
            color: #495057;
        }
        .detail-row {
            margin: 8px 0;
        }
        .label {
            font-weight: bold;
            color: #495057;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-size: 14px;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 VM Expiry Alert</h1>
        <p>This is an automated notification from the VM Expiry Management System.</p>
    </div>

    <div class="alert">
        <strong>⚠️ Action Required:</strong> Your VM will expire in 7 days. Please take necessary action to renew or backup your data.
    </div>

    <div class="vm-details">
        <h3>VM Details</h3>
        <div class="detail-row">
            <span class="label">Project:</span> ${data.projectName}
        </div>
        <div class="detail-row">
            <span class="label">VM Account:</span> ${data.vmAccount}
        </div>
        <div class="detail-row">
            <span class="label">VM Domain:</span> ${data.vmDomain}
        </div>
        <div class="detail-row">
            <span class="label">Internal IP:</span> ${data.vmInternalIP}
        </div>
        <div class="detail-row">
            <span class="label">Expiry Date:</span> <strong>${formattedDate}</strong>
        </div>
    </div>

    <p>Please contact your system administrator if you need to:</p>
    <ul>
        <li>Extend the VM expiry date</li>
        <li>Backup important data before expiry</li>
        <li>Transfer resources to another VM</li>
    </ul>

    <div class="footer">
        <p>This is an automated message from the VM Expiry Management System. Please do not reply to this email.</p>
        <p>If you believe this notification was sent in error, please contact your system administrator.</p>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email for VM expiry notification
   */
  private generateExpiryEmailText(data: VMExpiryEmailData): string {
    const formattedDate = data.currentExpiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
VM EXPIRY ALERT

⚠️ Action Required: Your VM will expire in 7 days. Please take necessary action to renew or backup your data.

VM Details:
- Project: ${data.projectName}
- VM Account: ${data.vmAccount}
- VM Domain: ${data.vmDomain}
- Internal IP: ${data.vmInternalIP}
- Expiry Date: ${formattedDate}

Please contact your system administrator if you need to:
- Extend the VM expiry date
- Backup important data before expiry
- Transfer resources to another VM

This is an automated message from the VM Expiry Management System. Please do not reply to this email.
If you believe this notification was sent in error, please contact your system administrator.
    `.trim();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test with a simple email
      const result = await getResend().emails.send({
        from: 'VM Expiry Management <noreply@yourdomain.com>',
        to: ['test@example.com'],
        subject: 'Email Configuration Test',
        text: 'This is a test email to verify email configuration.',
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Email configuration test failed'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const emailService = EmailService.getInstance();