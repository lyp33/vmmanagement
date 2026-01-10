# Deploy to Vercel - Quick Guide

## 🚀 One-Click Deploy

Click the button below to deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

## 📋 Step-by-Step Guide

### Step 1: Prepare Your Repository

```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your repository
5. Click **"Import"**

### Step 3: Configure Project

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `vm-expiry-management`

**Build Settings:**
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add:

```env
NEXTAUTH_URL=https://your-project-name.vercel.app
NEXTAUTH_SECRET=your-generated-secret-here
```

**Generate NEXTAUTH_SECRET:**

Option 1 - Using OpenSSL:
```bash
openssl rand -base64 32
```

Option 2 - Using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Option 3 - Online Generator:
Visit: https://generate-secret.vercel.app/32

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Your app will be live at: `https://your-project-name.vercel.app`

### Step 6: Initialize Database

Visit your deployed app and call the init endpoint:

```
https://your-project-name.vercel.app/api/init
```

You should see:
```json
{
  "message": "Database initialized successfully",
  "defaultAdmin": {
    "email": "admin@123.com",
    "password": "123456789"
  }
}
```

### Step 7: First Login

1. Go to: `https://your-project-name.vercel.app/auth/signin`
2. Login with:
   - **Email:** `admin@123.com`
   - **Password:** `123456789`

ononfiguratiment Cst-Deploy## 🔧 Po

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Update `NEXTAUTH_URL` environment variable to your custom domain
5. Redeploy the application

### Optional: Enable Email Notifications

Add to environment variables:
```env
RESEND_API_KEY=your-resend-api-key
```

Get your API key from: https://resend.com

## 🎯 Verification Checklist

After deployment, verify:

- [ ] App loads successfully
- [ ] Can login with default credentials
- [ ] Dashboard displays correctly
- [ ] Can create a new project
- [ ] Can create a new VM record
- [ ] Can view audit logs
- [ ] Export functionality works
- [ ] Mobile responsive design works

## 🐛 Troubleshooting

### Build Fails

**Check:**
- All dependencies are in `package.json`
- No TypeScript errors
- Environment variables are set correctly

**Solution:**
- Review build logs in Vercel dashboard
- Fix any errors and redeploy

### Cannot Login

**Check:**
- Did you call `/api/init`?
- Is `NEXTAUTH_SECRET` set?
- Is `NEXTAUTH_URL` correct?

**Solution:**
- Visit `/api/init` endpoint
- Verify environment variables
- Redeploy if needed

### Data Disappears

**This is EXPECTED behavior with file storage:**

**Your data WILL BE CLEARED when:**
1. ❌ You redeploy the application
2. ❌ App is idle for 15-30 minutes (cold start)
3. ❌ Vercel restarts the server

**Your data WILL PERSIST when:**
1. ✅ App is actively being used
2. ✅ You refresh pages or navigate
3. ✅ Multiple users are using it continuously

**Solutions:**
- **For testing/demo:** Export data before redeploying
- **For production:** Migrate to PostgreSQL, MongoDB, or other persistent database
- **Current setup:** Only suitable for temporary use, demos, or testing

### 404 Errors

**Check:**
- Root directory is set to `vm-expiry-management`
- Build completed successfully

**Solution:**
- Verify project settings in Vercel
- Redeploy

## 📊 Monitoring

### Vercel Analytics

Enable in Vercel Dashboard:
1. Go to your project
2. Click **"Analytics"**
3. Enable analytics

### Error Monitoring

Built-in error dashboard:
- Visit: `https://your-domain.vercel.app/dashboard`
- Check error monitoring section

### Logs

View real-time logs:
1. Vercel Dashboard → Your Project
2. Click **"Logs"**
3. Monitor API calls and errors

## 🔐 Security Best Practices

1. **Secure NEXTAUTH_SECRET**
   - Use a cryptographically secure random string
   - Never commit to version control

2. **Enable Security Headers**
   - Vercel automatically adds security headers
   - Review in `vercel.json`

3. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories

## 📈 Scaling Considerations

### Current Setup
- File-based storage (ephemeral)
- Suitable for: Demo, testing, small teams

### For Production
Consider upgrading to:
- **Database:** PostgreSQL (Vercel Postgres, Supabase, etc.)
- **Storage:** Persistent database instead of file storage
- **Email:** Configure Resend for notifications
- **Monitoring:** Set up error tracking (Sentry, etc.)

## 🆘 Support

If you encounter issues:

1. **Check Documentation:**
   - [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
   - [DEPLOYMENT.md](./DEPLOYMENT.md)
   - [QUICK_START.md](./QUICK_START.md)

2. **Review Logs:**
   - Vercel Dashboard → Logs
   - Browser Console (F12)
   - Application error dashboard

3. **Common Issues:**
   - Environment variables not set
   - Database not initialized
   - Build configuration incorrect

## ✅ Success!

Your VM Expiry Management System is now live on Vercel! 🎉

**Next Steps:**
1. Create your first project
2. Add VM records
3. Invite team members
4. Configure email notifications (optional)

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** January 7, 2026  
**Status:** Production Ready ✅
