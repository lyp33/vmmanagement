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

export interface VMSummary {
  vmAccount: string;
  vmDomain: string;
  vmInternalIP: string;
  currentExpiryDate: Date;
  email: string;
}

export interface ProjectVMGroup {
  projectName: string;
  vms: VMSummary[];
}

export interface BatchExpiryEmailData {
  recipientEmail: string;
  recipientName?: string;
  isAdmin: boolean;
  projectGroups: ProjectVMGroup[];
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
   * Send batch expiry notification email (grouped by project)
   */
  async sendBatchExpiryNotification(data: BatchExpiryEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const totalVMs = data.projectGroups.reduce((sum, group) => sum + group.vms.length, 0);
      const subject = data.isAdmin 
        ? `VM Expiry Alert: ${totalVMs} VMs expiring in 7 days (All Projects)`
        : `VM Expiry Alert: ${totalVMs} VMs expiring in 7 days`;

      const emailHtml = this.generateBatchExpiryEmailTemplate(data);
      const emailText = this.generateBatchExpiryEmailText(data);

      const result = await getResend().emails.send({
        from: 'VM Expiry Management <noreply@yourdomain.com>',
        to: [data.recipientEmail],
        subject,
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
   * Generate HTML email template for batch VM expiry notification
   */
  private generateBatchExpiryEmailTemplate(data: BatchExpiryEmailData): string {
    const totalVMs = data.projectGroups.reduce((sum, group) => sum + group.vms.length, 0);
    const greeting = data.recipientName ? `Hello ${data.recipientName}` : 'Hello';
    const roleNote = data.isAdmin 
      ? '<p><strong>Note:</strong> As an administrator, you are receiving the complete list of all expiring VMs across all projects.</p>'
      : '<p>You are receiving this notification because you are assigned to the following project(s).</p>';

    const projectSections = data.projectGroups.map(group => `
      <div class="project-section">
        <h3>📁 ${group.projectName}</h3>
        <p><strong>${group.vms.length}</strong> VM(s) expiring in this project:</p>
        <table class="vm-table">
          <thead>
            <tr>
              <th>VM Account</th>
              <th>Domain</th>
              <th>Internal IP</th>
              <th>Contact Email</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            ${group.vms.map(vm => `
              <tr>
                <td>${vm.vmAccount}</td>
                <td>${vm.vmDomain}</td>
                <td>${vm.vmInternalIP}</td>
                <td>${vm.email}</td>
                <td>${vm.currentExpiryDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

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
            max-width: 900px;
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
        .summary {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
        }
        .project-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .project-section h3 {
            margin-top: 0;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            padding-bottom: 10px;
        }
        .vm-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background-color: white;
        }
        .vm-table th {
            background-color: #495057;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        .vm-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #dee2e6;
        }
        .vm-table tbody tr:hover {
            background-color: #f8f9fa;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-size: 14px;
            color: #6c757d;
        }
        .action-items {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .action-items ul {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 VM Expiry Alert</h1>
        <p>${greeting},</p>
        <p>This is an automated notification from the VM Expiry Management System.</p>
    </div>

    <div class="alert">
        <strong>⚠️ Action Required:</strong> ${totalVMs} VM(s) will expire in 7 days. Please review and take necessary action.
    </div>

    <div class="summary">
        <strong>Summary:</strong>
        <ul>
            <li>Total VMs expiring: <strong>${totalVMs}</strong></li>
            <li>Projects affected: <strong>${data.projectGroups.length}</strong></li>
            <li>Expiry date: <strong>7 days from now</strong></li>
        </ul>
    </div>

    ${roleNote}

    ${projectSections}

    <div class="action-items">
        <h3>📋 Recommended Actions</h3>
        <p>Please contact your system administrator if you need to:</p>
        <ul>
            <li>Extend the VM expiry date</li>
            <li>Backup important data before expiry</li>
            <li>Transfer resources to another VM</li>
            <li>Decommission VMs that are no longer needed</li>
        </ul>
    </div>

    <div class="footer">
        <p>This is an automated message from the VM Expiry Management System. Please do not reply to this email.</p>
        <p>If you believe this notification was sent in error, please contact your system administrator.</p>
        <p><small>Notification sent at: ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          timeZoneName: 'short'
        })}</small></p>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email for batch VM expiry notification
   */
  private generateBatchExpiryEmailText(data: BatchExpiryEmailData): string {
    const totalVMs = data.projectGroups.reduce((sum, group) => sum + group.vms.length, 0);
    const greeting = data.recipientName ? `Hello ${data.recipientName}` : 'Hello';
    const roleNote = data.isAdmin 
      ? '\nNote: As an administrator, you are receiving the complete list of all expiring VMs across all projects.\n'
      : '\nYou are receiving this notification because you are assigned to the following project(s).\n';

    const projectSections = data.projectGroups.map(group => {
      const vmList = group.vms.map(vm => 
        `  - ${vm.vmAccount} | ${vm.vmDomain} | ${vm.vmInternalIP} | ${vm.email} | Expires: ${vm.currentExpiryDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`
      ).join('\n');

      return `
PROJECT: ${group.projectName}
${group.vms.length} VM(s) expiring in this project:
${vmList}
`;
    }).join('\n---\n');

    return `
VM EXPIRY ALERT

${greeting},

⚠️ Action Required: ${totalVMs} VM(s) will expire in 7 days. Please review and take necessary action.

SUMMARY:
- Total VMs expiring: ${totalVMs}
- Projects affected: ${data.projectGroups.length}
- Expiry date: 7 days from now

${roleNote}

${projectSections}

RECOMMENDED ACTIONS:
Please contact your system administrator if you need to:
- Extend the VM expiry date
- Backup important data before expiry
- Transfer resources to another VM
- Decommission VMs that are no longer needed

---
This is an automated message from the VM Expiry Management System. Please do not reply to this email.
If you believe this notification was sent in error, please contact your system administrator.

Notification sent at: ${new Date().toLocaleString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric', 
  hour: '2-digit', 
  minute: '2-digit',
  timeZoneName: 'short'
})}
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