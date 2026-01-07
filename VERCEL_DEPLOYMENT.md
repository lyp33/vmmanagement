# Vercel Deployment Guide

## Pre-Deployment Checklist

✅ **Completed:**
- Test data cleaned
- Default admin account configured
- Mock data reset
- Database files removed
- Application fully translated to English

## Default Admin Credentials

```
Email: admin@123.com
Password: 123456789
```

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment - clean data and set default admin"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `vm-expiry-management`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### 3. Environment Variables

Add these environment variables in Vercel:

```env
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-generated-secret-here

# Generate secret with: openssl rand -base64 32
```

To generate a secure secret:
```bash
openssl rand -base64 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Initialize Database

After deployment, initialize the database by visiting:
```
https://your-domain.vercel.app/api/init
```

This will create the default admin account.

### 5. First Login

1. Go to: `https://your-domain.vercel.app/auth/signin`
2. Login with:
   - Email: `admin@123.com`
   - Password: `123456789`

## Post-Deployment Configuration

### Optional Configuration

1. **Configure Email Notifications** (Optional)
   - Set up SMTP credentials in environment variables
   - Test email notifications

2. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Configure error tracking

### ⚠️ Important: Data Storage Limitations

**Why data gets cleared:**

The application saves data to a file (`vm-data.json`), but:
- **Local development**: Saves to `data/vm-data.json` ✅ Permanent
- **Vercel deployment**: Saves to `/tmp/vm-data.json` ❌ Temporary

**Vercel's Serverless limitation:**
- File system is **read-only** (except `/tmp` directory)
- `/tmp` directory is **temporary** and cleared on cold start
- Cannot write to project directory on Vercel

**Your data (VMs, users, projects) WILL BE CLEARED:**
1. ❌ When you redeploy
2. ❌ After 15-30 minutes of inactivity (cold start)
3. ❌ When Vercel restarts servers

**Your data WILL PERSIST:**
- ✅ During continuous active usage
- ✅ Between page refreshes
- ✅ As long as app stays "warm"

**⚠️ Current setup is ONLY for demo/testing!**

**For production, migrate to persistent storage:**
- **Vercel Postgres** (recommended, easy integration)
- **Vercel KV** (Redis-based key-value store)
- **Vercel Blob** (file storage)
- **Supabase** (PostgreSQL)
- **MongoDB Atlas**
- **Neon** (Serverless PostgreSQL)

### Backup Strategy

**⚠️ CRITICAL: File storage is temporary!**

Since data will be cleared on redeployment or after inactivity:
1. **Export data regularly** using the Export buttons in the app
2. **Save exports locally** before redeploying
3. **For production use:** Migrate to PostgreSQL or another persistent database
4. **Current setup is only suitable for:** Demo, testing, temporary use

## Vercel Configuration

The project includes `vercel.json` with optimized settings:
- API routes configured
- Build settings optimized
- Headers and redirects configured

## Troubleshooting

### Issue: Cannot login after deployment
**Solution:** Make sure you've called `/api/init` to create the default admin

### Issue: Data disappears after some time
**Solution:** This is expected with file storage on Vercel. Migrate to a database for persistence.

### Issue: Build fails
**Solution:** Check build logs in Vercel dashboard. Common issues:
- Missing dependencies
- TypeScript errors
- Environment variables not set

## Monitoring

Monitor your deployment:
- **Vercel Dashboard:** Real-time logs and analytics
- **Error Monitoring:** Built-in error dashboard at `/dashboard`
- **Audit Logs:** Track all system operations

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Review application error logs in the dashboard
3. Check the audit logs for system events

## Next Steps

After successful deployment:
1. ✅ Login with default admin credentials
2. ✅ Create additional users as needed
3. ✅ Create projects
4. ✅ Start adding VM records
5. ✅ Configure email notifications (optional)

---

**Deployment Date:** January 7, 2026
**Version:** 1.0.0
**Status:** Ready for Production
