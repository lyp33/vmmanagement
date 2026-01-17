// Email service using custom RESTful API

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

// Email API configuration
interface EmailAPIConfig {
  url: string;
  accountName: string;
  headers?: Record<string, string>;
}

function getEmailAPIConfig(): EmailAPIConfig {
  const url = process.env.EMAIL_API_URL;
  const accountName = process.env.EMAIL_ACCOUNT_NAME;
  const apiToken = process.env.EMAIL_API_TOKEN;

  if (!url || !accountName) {
    console.warn('Email API not configured. EMAIL_API_URL and EMAIL_ACCOUNT_NAME are required.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token is provided
  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  return {
    url: url || '',
    accountName: accountName || '',
    headers
  };
}

// Email API request/response types
interface EmailAPIRequest {
  account_name: string;
  to: string[];
  subject: string;
  content: string;
}

interface EmailAPIResponse {
  code: string;
  message: string;
  trace_id?: string;
  data?: {
    message_id?: string;
    content_length?: number;
  };
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
   * Send email via custom RESTful API
   */
  private async sendEmailViaAPI(
    to: string[],
    subject: string,
    content: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = getEmailAPIConfig();

    if (!config.url || !config.accountName) {
      return {
        success: false,
        error: 'Email API not configured. Please set EMAIL_API_URL and EMAIL_ACCOUNT_NAME environment variables.'
      };
    }

    try {
      const requestBody: EmailAPIRequest = {
        account_name: config.accountName,
        to,
        subject,
        content
      };

      console.log('Sending email via API:', {
        url: config.url,
        to,
        subject
      });

      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Email API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return {
          success: false,
          error: `Email API returned ${response.status}: ${response.statusText}`
        };
      }

      const result: EmailAPIResponse = await response.json();

      // Check if the API returned success
      if (result.code === 'i_common_success') {
        console.log('Email sent successfully:', {
          messageId: result.data?.message_id,
          traceId: result.trace_id
        });
        return {
          success: true,
          messageId: result.data?.message_id
        };
      } else {
        console.error('Email API returned error:', result);
        return {
          success: false,
          error: result.message || 'Unknown error from email API'
        };
      }
    } catch (error) {
      console.error('Error calling email API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send VM expiry notification email
   */
  async sendExpiryNotification(data: VMExpiryEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const emailText = this.generateExpiryEmailText(data);
      const subject = `VM Expiry Alert: ${data.vmAccount} expires in 7 days`;

      return await this.sendEmailViaAPI(
        [data.recipientEmail],
        subject,
        emailText
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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

    return `VM EXPIRY ALERT

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
If you believe this notification was sent in error, please contact your system administrator.`;
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

      const emailText = this.generateBatchExpiryEmailText(data);

      return await this.sendEmailViaAPI(
        [data.recipientEmail],
        subject,
        emailText
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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

    return `VM EXPIRY ALERT

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
})}`;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      const config = getEmailAPIConfig();
      
      if (!config.url || !config.accountName) {
        return {
          success: false,
          error: 'Email API not configured. Please set EMAIL_API_URL and EMAIL_ACCOUNT_NAME environment variables.'
        };
      }

      // Test with a simple email
      return await this.sendEmailViaAPI(
        ['test@example.com'],
        'Email Configuration Test',
        'This is a test email to verify email configuration.'
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const emailService = EmailService.getInstance();