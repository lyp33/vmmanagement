# Vercel KV Setup Guide

## ✅ Migration Complete!

Your application now supports **Vercel KV (Redis)** for persistent storage!

## How It Works

The application automatically detects which storage to use:

- **Local Development**: Uses file storage (`data/vm-data.json`) ✅ Permanent
- **Vercel with KV**: Uses Vercel KV (Redis) ✅ Permanent
- **Vercel without KV**: Uses `/tmp` file storage ❌ Temporary

## Setup Steps

### Step 1: Create Vercel KV Database

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Create KV Database**
   - Click **"Storage"** tab
   - Click **"Create Database"**
   - Select **"KV"** (Redis)
   - Choose a name (e.g., `vm-expiry-kv`)
   - Select region (same as your app for best performance)
   - Click **"Create"**

3. **Connect to Project**
   - Vercel will automatically add environment variables:
     ```env
     KV_REST_API_URL
     KV_REST_API_TOKEN
     KV_REST_API_READ_ONLY_TOKEN
     KV_URL
     ```

### Step 2: Deploy Application

```bash
# Push to GitHub
git add .
git commit -m "Add Vercel KV support for persistent storage"
git push origin main

# Deploy to Vercel
vercel --prod
```

### Step 3: Initialize Database

After deployment, visit:
```
https://your-domain.vercel.app/api/init
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

**Note:** `storageType: "kv"` confirms you're using Vercel KV!

### Step 4: Login

Visit: `https://your-domain.vercel.app/auth/signin`

Login with:
- **Email:** `admin@123.com`
- **Password:** `123456789`

## ✅ Data is Now Permanent!

With Vercel KV:
- ✅ Data persists across deployments
- ✅ Data persists during cold starts
- ✅ Data persists during server restarts
- ✅ Fast Redis-based storage
- ✅ Automatic backups by Vercel

## Vercel KV Free Tier

- **Storage:** 256 MB
- **Commands:** 30,000 per month
- **Bandwidth:** 100 MB per month

This is sufficient for:
- Small to medium teams (< 50 users)
- Up to ~10,000 VM records
- Regular usage patterns

## Pricing

| Tier | Storage | Commands/month | Price |
|------|---------|----------------|-------|
| **Free** | 256 MB | 30K | $0 |
| **Pro** | 512 MB | 100K | $1/month |
| **Enterprise** | Custom | Custom | Contact |

## Verify Storage Type

You can check which storage is being used:

```bash
# Call the init endpoint
curl https://your-domain.vercel.app/api/init

# Look for "storageType" in response:
# "storageType": "kv"  ← Using Vercel KV ✅
# "storageType": "file" ← Using file storage ❌
```

## Local Development

For local development, the app uses file storage automatically:
- No KV setup needed locally
- Data saved to `data/vm-data.json`
- Works offline

## Troubleshooting

### Issue: Still showing "storageType": "file"

**Check:**
1. Did you create the KV database in Vercel?
2. Is the KV database connected to your project?
3. Did you redeploy after creating KV?

**Solution:**
```bash
# Verify environment variables in Vercel Dashboard
# Storage → Your KV Database → Settings → Environment Variables

# Redeploy
vercel --prod
```

### Issue: "Cannot connect to KV"

**Check:**
1. KV database is in the same region as your app
2. Environment variables are set correctly
3. KV database is not paused

**Solution:**
- Go to Vercel Dashboard → Storage → Your KV
- Check status (should be "Active")
- Verify connection settings

### Issue: Data still disappears

**Check:**
- Call `/api/init` and verify `storageType: "kv"`
- If showing `"file"`, KV is not properly configured

## Migration from File Storage

If you already have data in file storage (local development):

### Option 1: Manual Migration

1. Export data from local app (use Export button)
2. Deploy with KV
3. Import data manually through the UI

### Option 2: Script Migration (Advanced)

Create a migration script to copy data from file to KV:

```typescript
// scripts/migrate-to-kv.ts
import { fileStorage } from '@/lib/file-storage'
import { kvStorage } from '@/lib/kv-storage'

async function migrate() {
  // Get all data from file storage
  const users = await fileStorage.findAllUsers()
  const projects = await fileStorage.findAllProjects()
  const vms = await fileStorage.findAllVMs()
  
  // Copy to KV
  for (const user of users) {
    await kvStorage.createUser(user)
  }
  
  for (const project of projects) {
    await kvStorage.createProject(project)
  }
  
  for (const vm of vms) {
    await kvStorage.createVMRecord(vm)
  }
  
  console.log('Migration complete!')
}

migrate()
```

## Benefits of Vercel KV

1. **Persistent Storage** ✅
   - Data survives deployments
   - Data survives cold starts
   - Data survives server restarts

2. **Fast Performance** ⚡
   - Redis-based (in-memory)
   - Sub-millisecond latency
   - Global edge network

3. **Automatic Scaling** 📈
   - Scales with your usage
   - No manual configuration
   - Pay only for what you use

4. **Managed Service** 🛠️
   - Automatic backups
   - High availability
   - No maintenance required

5. **Easy Integration** 🔌
   - One-click setup in Vercel
   - Automatic environment variables
   - Works with existing code

## Next Steps

1. ✅ Create Vercel KV database
2. ✅ Deploy application
3. ✅ Initialize database (`/api/init`)
4. ✅ Verify storage type is "kv"
5. ✅ Start using the app with permanent storage!

## Support

If you need help:
1. Check Vercel KV documentation: https://vercel.com/docs/storage/vercel-kv
2. Check Vercel Dashboard logs
3. Verify environment variables are set

---

**Status:** ✅ Ready for Vercel KV  
**Storage:** Automatic (File for dev, KV for production)  
**Data Persistence:** ✅ Permanent with KV  
**Free Tier:** 256 MB, 30K commands/month
