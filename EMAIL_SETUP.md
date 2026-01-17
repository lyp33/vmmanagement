# Email Configuration Guide

This guide explains how to configure email notifications using a custom RESTful API.

## Quick Setup

### 1. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Email API endpoint URL (required)
EMAIL_API_URL="https://portal.insuremo.com/api/mo-fo/1.0/sns/email/send"

# Email account name - sender account (required)
EMAIL_ACCOUNT_NAME="insuremo-ptdev@insuremo.com"

# Email API authentication token (required if your API requires authentication)
EMAIL_API_TOKEN="your-api-token-here"
```

**Note:** If your email API doesn't require authentication, you can omit the `EMAIL_API_TOKEN` variable.

### 2. API Specification

The system sends emails via POST request to the configured API endpoint.

**Request Format:**
```json
{
  "account_name": "insuremo-ptdev@insuremo.com",
  "to": ["recipient@example.com"],
  "subject": "Email Subject",
  "content": "Email content in plain text"
}
```

**Expected Response (Success):**
```json
{
  "code": "i_common_success",
  "message": "request success",
  "trace_id": "426256af99e598e0f995c13fc3753093",
  "env_name": "imo_kic_insuremo_ptdev",
  "date": "2026-01-17T10:56:18.835Z",
  "data": {
    "message_id": "4b59adbd-09e6-45c4-966d-a3aad08eaa71",
    "content_length": 391
  }
}
```

### 3. Authentication Headers

If your email API requires authentication, the system automatically adds an `Authorization` header when `EMAIL_API_TOKEN` is configured:

```
Authorization: Bearer your-api-token-here
```

The token is read from the `EMAIL_API_TOKEN` environment variable. If the variable is not set, the Authorization header will not be included in the request.

**To configure:**

1. Add to your `.env.local`:
   ```env
   EMAIL_API_TOKEN="your-api-token-here"
   ```

2. Restart your development server

**Request Headers (with token):**
```
Content-Type: application/json
Authorization: Bearer your-api-token-here
```

**Request Headers (without token):**
```
Content-Type: application/json
```

## Testing Email Configuration

### Method 1: Using the Dashboard

1. Login as admin
2. Go to Settings page
3. Scroll to "Test Email Notification" section
4. Enter your email address
5. Click "Send Test Email"

### Method 2: Using API Directly

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your-email@example.com"}'
```

## Email Types

The system sends two types of emails:

### 1. Single VM Expiry Notification
- Sent 7 days before VM expiry
- Contains VM details and expiry date
- Sent to the email associated with the VM

**Example Content:**
```
VM EXPIRY ALERT

⚠️ Action Required: Your VM will expire in 7 days. Please take necessary action to renew or backup your data.

VM Details:
- Project: Test Project
- VM Account: vm-account-001
- VM Domain: vm001.example.com
- Internal IP: 192.168.1.100
- Expiry Date: January 24, 2026, 10:00 AM PST

Please contact your system administrator if you need to:
- Extend the VM expiry date
- Backup important data before expiry
- Transfer resources to another VM
```

### 2. Batch Expiry Notification
- Sent to users with multiple expiring VMs
- Groups VMs by project
- Admins receive notifications for all projects

**Example Content:**
```
VM EXPIRY ALERT

Hello,

⚠️ Action Required: 5 VM(s) will expire in 7 days. Please review and take necessary action.

SUMMARY:
- Total VMs expiring: 5
- Projects affected: 2
- Expiry date: 7 days from now

PROJECT: Project A
3 VM(s) expiring in this project:
  - vm-001 | vm001.example.com | 192.168.1.100 | user@example.com | Expires: Jan 24, 2026
  - vm-002 | vm002.example.com | 192.168.1.101 | user@example.com | Expires: Jan 24, 2026
  - vm-003 | vm003.example.com | 192.168.1.102 | user@example.com | Expires: Jan 24, 2026
```

## Common Issues

### Issue 1: "Email API not configured" Error

**Problem:** Environment variables are missing.

**Solution:**
- Check that `EMAIL_API_URL` is set in `.env.local`
- Check that `EMAIL_ACCOUNT_NAME` is set in `.env.local`
- Restart your development server after adding the variables

### Issue 2: API Returns Error

**Problem:** The email API returns an error response.

**Possible causes:**
1. Invalid API endpoint URL
2. Invalid account name
3. Missing or incorrect authentication headers
4. Network connectivity issues

**Solution:**
- Verify the API endpoint URL is correct
- Check the account name is valid
- Review API logs for detailed error messages
- Test the API endpoint directly using curl or Postman

### Issue 3: Email Sent but Not Received

**Problem:** API returns success but email not received.

**Possible causes:**
1. Email in spam folder
2. Invalid recipient email address
3. Email service configuration issues

**Solution:**
- Check spam/junk folder
- Verify recipient email address is correct
- Contact your email service administrator

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EMAIL_API_URL` | Yes | Email API endpoint URL | `https://portal.insuremo.com/api/mo-fo/1.0/sns/email/send` |
| `EMAIL_ACCOUNT_NAME` | Yes | Sender email account | `insuremo-ptdev@insuremo.com` |
| `EMAIL_API_TOKEN` | Conditional | API authentication token (required if API needs auth) | `your-api-token` |

## Production Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `EMAIL_API_URL`
   - Add `EMAIL_ACCOUNT_NAME`
   - Add `EMAIL_API_TOKEN` (if your API requires authentication)

2. Redeploy your application

3. Test email functionality in production

## API Integration Details

### Request Headers

Headers sent with each request:

**Always included:**
```
Content-Type: application/json
```

**Conditionally included (when EMAIL_API_TOKEN is set):**
```
Authorization: Bearer {EMAIL_API_TOKEN}
```

### Error Handling

The system checks for:
- HTTP status codes (expects 200 OK)
- Response code field (expects "i_common_success")
- Network errors and timeouts

All errors are logged to the console and returned to the caller.

### Retry Logic

Currently, the system does not implement automatic retries. Failed emails are logged and can be reviewed in the notification logs.

## Troubleshooting

### Enable Debug Logging

Check server logs for email sending details:

```bash
# Development
npm run dev

# Check logs for:
# - "Sending email via API: ..."
# - "Email sent successfully: ..."
# - "Email API error: ..."
```

### Verify Configuration

```bash
# Check if environment variables are loaded
node -e "console.log(process.env.EMAIL_API_URL ? 'API URL: Set' : 'API URL: Not Set')"
node -e "console.log('Account Name:', process.env.EMAIL_ACCOUNT_NAME)"
node -e "console.log(process.env.EMAIL_API_TOKEN ? 'API Token: Set' : 'API Token: Not Set')"
```

### Test API Directly

Use curl to test the email API:

```bash
curl -X POST https://portal.insuremo.com/api/mo-fo/1.0/sns/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token-here" \
  -d '{
    "account_name": "insuremo-ptdev@insuremo.com",
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "content": "This is a test email"
  }'
```

**Note:** Remove the `Authorization` header if your API doesn't require authentication.

## Migration from Resend

If you're migrating from Resend:

1. Remove old environment variables:
   - `RESEND_API_KEY`
   - `FROM_EMAIL`

2. Add new environment variables:
   - `EMAIL_API_URL`
   - `EMAIL_ACCOUNT_NAME`
   - `EMAIL_API_TOKEN` (if needed)

3. Uninstall Resend package:
   ```bash
   npm uninstall resend
   ```

4. Restart your development server

---

**Last Updated:** January 17, 2026
