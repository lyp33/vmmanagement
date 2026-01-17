# Email Configuration Guide

This guide explains how to configure email notifications using Resend.

## Quick Setup

### 1. Get Resend API Key

1. Sign up at [Resend](https://resend.com)
2. Go to [API Keys](https://resend.com/api-keys)
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Resend API Key (required)
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# From Email Address (required)
FROM_EMAIL="onboarding@resend.dev"
```

### 3. Email Domain Options

#### Option A: Use Resend Test Domain (Quick Testing)

For testing purposes, you can use Resend's test domain:

```env
FROM_EMAIL="onboarding@resend.dev"
```

**Note:** Test domain has limitations:
- Can only send to verified email addresses in your Resend account
- Not suitable for production use

#### Option B: Use Your Own Domain (Production)

For production, verify your own domain:

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records provided by Resend to your domain
5. Wait for verification (usually takes a few minutes)
6. Update your `.env.local`:

```env
FROM_EMAIL="noreply@yourdomain.com"
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

## Common Issues

### Issue 1: "Domain not verified" Error (403)

**Problem:** The `FROM_EMAIL` domain is not verified in Resend.

**Solution:**
- Use `onboarding@resend.dev` for testing
- Or verify your own domain in Resend dashboard

### Issue 2: "RESEND_API_KEY not configured"

**Problem:** API key is missing or incorrect.

**Solution:**
- Check that `RESEND_API_KEY` is set in `.env.local`
- Verify the API key is correct (starts with `re_`)
- Restart your development server after adding the key

### Issue 3: Email not received

**Problem:** Email sent successfully but not received.

**Possible causes:**
1. Using test domain (`onboarding@resend.dev`) without verifying recipient email in Resend
2. Email in spam folder
3. Invalid recipient email address

**Solution:**
- Check spam/junk folder
- If using test domain, verify recipient email in Resend dashboard
- Use your own verified domain for production

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | Yes | Your Resend API key | `re_xxxxxxxxxxxxx` |
| `FROM_EMAIL` | Yes | Sender email address (must be verified) | `noreply@yourdomain.com` |

## Production Deployment

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `RESEND_API_KEY`
   - Add `FROM_EMAIL`

2. Redeploy your application

3. Test email functionality in production

## Email Templates

The system sends two types of emails:

### 1. Single VM Expiry Notification
- Sent 7 days before VM expiry
- Contains VM details and expiry date
- Sent to the email associated with the VM

### 2. Batch Expiry Notification
- Sent to users with multiple expiring VMs
- Groups VMs by project
- Admins receive notifications for all projects

## Troubleshooting

### Enable Debug Logging

Check server logs for email sending details:

```bash
# Development
npm run dev

# Check logs for:
# - "Email sending skipped: RESEND_API_KEY not configured"
# - Resend API errors
```

### Verify Configuration

```bash
# Check if environment variables are loaded
node -e "console.log(process.env.RESEND_API_KEY ? 'API Key: Set' : 'API Key: Not Set')"
node -e "console.log('From Email:', process.env.FROM_EMAIL)"
```

## Support

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Support](https://resend.com/support)

---

**Last Updated:** January 17, 2026
