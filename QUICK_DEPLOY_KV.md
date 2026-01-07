# 🚀 Quick Deploy with Vercel KV (5 Minutes)

## Step 1: Deploy to Vercel (2 min)

```bash
git add .
git commit -m "Add Vercel KV support"
git push origin main
```

Then:
1. Go to https://vercel.com/dashboard
2. Import your repository
3. Set root directory: `vm-expiry-management`
4. Add environment variables:
   ```
   NEXTAUTH_URL=https://your-project.vercel.app
   NEXTAUTH_SECRET=<run: openssl rand -base64 32>
   ```
5. Click "Deploy"

## Step 2: Create KV Database (1 min)

In Vercel Dashboard:
1. Go to your project
2. **Storage** → **Create Database** → **KV**
3. Name: `vm-expiry-kv`
4. Region: Same as your app
5. Click **Create**

## Step 3: Redeploy (1 min)

```bash
vercel --prod
```

Or in Vercel Dashboard: **Deployments** → **Redeploy**

## Step 4: Initialize (1 min)

Visit: `https://your-project.vercel.app/api/init`

Should see:
```json
{
  "storageType": "kv"  ← Must be "kv"!
}
```

## Step 5: Login

Visit: `https://your-project.vercel.app/auth/signin`

- Email: `admin@123.com`
- Password: `123456789`

## ✅ Done!

Your data is now permanent! 🎉

## 🔍 Verify

```bash
curl https://your-project.vercel.app/api/storage-test
```

Should show:
```json
{
  "storageType": "kv",
  "tests": {
    "connection": "OK",
    "readWrite": "OK"
  }
}
```

## ⚠️ Troubleshooting

**If showing "file" instead of "kv":**
1. Check KV database is created
2. Redeploy: `vercel --prod`
3. Check `/api/init` again

## 📚 More Info

- [Detailed Guide](./DEPLOYMENT_WITH_KV.md)
- [KV Setup](./VERCEL_KV_SETUP.md)
- [Migration Summary](./KV_MIGRATION_SUMMARY.md)

---

**Total Time:** ~5 minutes  
**Cost:** Free (256 MB, 30K commands/month)  
**Data:** ✅ Permanent
