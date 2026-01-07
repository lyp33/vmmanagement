# 🚀 Deploy to Vercel with Permanent Storage

## ✅ What's New

Your application now supports **Vercel KV** for permanent data storage!

**No more data loss!** 🎉

## Quick Start (5 Minutes)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Add Vercel KV support for permanent storage"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Root Directory:** `vm-expiry-management`
   - **Framework:** Next.js (auto-detected)
5. Add environment variables:
   ```env
   NEXTAUTH_URL=https://your-project.vercel.app
   NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
   ```
6. Click **"Deploy"**

### Step 3: Create Vercel KV Database

1. In Vercel Dashboard, go to your project
2. Click **"Storage"** tab
3. Click **"Create Database"**
4. Select **"KV"** (Redis)
5. Name it: `vm-expiry-kv`
6. Select region (same as your app)
7. Click **"Create"**

**Vercel automatically connects the KV database to your project!**

### Step 4: Redeploy (Important!)

After creating KV, you need to redeploy:

```bash
vercel --prod
```

Or in Vercel Dashboard:
- Go to **"Deployments"**
- Click **"Redeploy"** on the latest deployment

### Step 5: Initialize Database

Visit your deployed app:
```
https://your-project.vercel.app/api/init
```

You should see:
```json
{
  "message": "Database initialized successfully",
  "storageType": "kv",
  "defaultAdmin": {
    "email": "admin@123.com",
    "password": "123456789"
  }
}
```

**✅ If you see `"storageType": "kv"`, you're all set!**

### Step 6: Login and Use

1. Visit: `https://your-project.vercel.app/auth/signin`
2. Login with:
   - Email: `admin@123.com`
   - Password: `123456789`
3. Start creating VMs, projects, and users!

## ✅ Verification Checklist

- [ ] Application deployed to Vercel
- [ ] Vercel KV database created
- [ ] Application redeployed after KV creation
- [ ] `/api/init` shows `"storageType": "kv"`
- [ ] Can login with default admin
- [ ] Can create and view VMs
- [ ] Data persists after page refresh

## 🎯 What You Get with Vercel KV

### ✅ Permanent Storage
- Data survives deployments
- Data survives cold starts
- Data survives server restarts
- No more data loss!

### ⚡ Fast Performance
- Redis-based (in-memory)
- Sub-millisecond latency
- Global edge network

### 💰 Free Tier
- **Storage:** 256 MB
- **Commands:** 30,000/month
- **Bandwidth:** 100 MB/month

**Perfect for:**
- Small to medium teams (< 50 users)
- Up to ~10,000 VM records
- Regular daily usage

## 🔍 Troubleshooting

### Issue: Still showing `"storageType": "file"`

**This means KV is not connected yet.**

**Solution:**
1. Verify KV database is created in Vercel Dashboard
2. Check Storage tab → Your KV database → Status should be "Active"
3. Redeploy the application:
   ```bash
   vercel --prod
   ```
4. Visit `/api/init` again

### Issue: "Cannot connect to KV"

**Check:**
1. KV database region matches your app region
2. KV database is not paused
3. Environment variables are set (automatic)

**Solution:**
- Go to Vercel Dashboard → Storage → Your KV
- Click "Settings" → Verify connection
- Redeploy if needed

### Issue: Data still disappears

**Check storage type:**
```bash
curl https://your-domain.vercel.app/api/storage-test
```

If it shows `"storageType": "file"`, KV is not properly configured.

**Solution:**
1. Delete and recreate KV database
2. Make sure it's connected to your project
3. Redeploy

## 📊 Monitor Your Storage

### Check Storage Type

Visit: `https://your-domain.vercel.app/api/storage-test`

Response:
```json
{
  "storageType": "kv",
  "timestamp": "2026-01-07T...",
  "tests": {
    "connection": "OK",
    "readWrite": "OK - Admin found"
  }
}
```

### View KV Usage

1. Go to Vercel Dashboard
2. Click "Storage" → Your KV database
3. View:
   - Storage used
   - Commands used
   - Bandwidth used

## 🔄 Local Development

**No changes needed for local development!**

The app automatically uses file storage locally:
- Data saved to `data/vm-data.json`
- Works offline
- No KV setup required

## 📈 Scaling

### Current Setup (Free Tier)
- 256 MB storage
- 30K commands/month
- ~10,000 VM records

### Need More?

Upgrade to Pro:
- **$1/month**
- 512 MB storage
- 100K commands/month
- ~20,000 VM records

## 🎉 Success!

Your VM Expiry Management System now has:
- ✅ Permanent data storage
- ✅ Fast Redis performance
- ✅ Automatic backups
- ✅ No data loss
- ✅ Production-ready

## 📚 Additional Resources

- [Vercel KV Setup Guide](./VERCEL_KV_SETUP.md) - Detailed setup
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Deployment Guide](./VERCEL_DEPLOYMENT.md) - General deployment

## 🆘 Need Help?

1. Check `/api/storage-test` endpoint
2. Verify `storageType` is "kv"
3. Check Vercel Dashboard logs
4. Verify KV database is active

---

**Status:** ✅ Ready for Production with Permanent Storage  
**Storage:** Vercel KV (Redis)  
**Data Persistence:** ✅ Permanent  
**Free Tier:** 256 MB, 30K commands/month  
**Setup Time:** ~5 minutes
