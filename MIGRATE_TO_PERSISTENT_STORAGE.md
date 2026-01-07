# Migrate to Persistent Storage

## Why You Need This

Currently, the app uses **file-based storage** which saves data to:
- **Local**: `data/vm-data.json` ✅ Permanent
- **Vercel**: `/tmp/vm-data.json` ❌ Temporary (cleared on cold start)

**Vercel's Serverless limitation:**
- File system is read-only except `/tmp`
- `/tmp` is temporary and cleared frequently
- Cannot save permanent files on Vercel

## Solution: Migrate to Database

### Option 1: Vercel Postgres (Recommended)

**Pros:**
- ✅ Easy integration with Vercel
- ✅ Automatic backups
- ✅ Free tier available
- ✅ Managed service

**Steps:**

1. **Create Vercel Postgres Database**
   ```bash
   # In Vercel Dashboard:
   # 1. Go to your project
   # 2. Click "Storage" tab
   # 3. Click "Create Database"
   # 4. Select "Postgres"
   # 5. Follow the wizard
   ```

2. **Vercel will auto-add these environment variables:**
   ```env
   POSTGRES_URL
   POSTGRES_PRISMA_URL
   POSTGRES_URL_NON_POOLING
   ```

3. **Update Prisma configuration** (already configured in the project)
   ```bash
   # The project already has Prisma setup
   # Just need to run migrations
   npm run db:migrate
   ```

4. **Redeploy**
   ```bash
   vercel --prod
   ```

5. **Initialize database**
   ```
   Visit: https://your-domain.vercel.app/api/init
   ```

### Option 2: Vercel KV (Redis)

**Pros:**
- ✅ Very fast
- ✅ Simple key-value storage
- ✅ Free tier available

**Cons:**
- ❌ Requires code changes
- ❌ Less suitable for relational data

**Steps:**

1. **Create Vercel KV**
   ```bash
   # In Vercel Dashboard:
   # Storage → Create Database → KV
   ```

2. **Install KV SDK**
   ```bash
   npm install @vercel/kv
   ```

3. **Update storage code** (requires significant changes)

### Option 3: Supabase (PostgreSQL)

**Pros:**
- ✅ Free tier with good limits
- ✅ Full PostgreSQL features
- ✅ Built-in auth (optional)
- ✅ Real-time subscriptions

**Steps:**

1. **Create Supabase project**
   - Go to https://supabase.com
   - Create new project
   - Get connection string

2. **Add to environment variables**
   ```env
   DATABASE_URL="postgresql://..."
   ```

3. **Run migrations**
   ```bash
   npm run db:migrate
   ```

### Option 4: MongoDB Atlas

**Pros:**
- ✅ Free tier available
- ✅ NoSQL flexibility
- ✅ Global distribution

**Cons:**
- ❌ Requires code changes (from Prisma to Mongoose)

## Quick Migration Guide (Vercel Postgres)

### Step 1: Create Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **"Storage"** tab
4. Click **"Create Database"**
5. Select **"Postgres"**
6. Choose a name (e.g., `vm-expiry-db`)
7. Select region (same as your app)
8. Click **"Create"**

### Step 2: Connect Database

Vercel automatically adds these environment variables:
```env
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
```

### Step 3: Run Migrations

The project already has Prisma configured. Just run:

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### Step 4: Update Code (Optional)

The project already supports Prisma! Just need to switch from file storage to Prisma.

**Current:** Uses `src/lib/file-storage.ts`
**Target:** Use Prisma client

The Prisma schema is already defined in `prisma/schema.prisma`.

### Step 5: Redeploy

```bash
vercel --prod
```

### Step 6: Initialize

Visit: `https://your-domain.vercel.app/api/init`

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **Vercel Postgres** | 256 MB, 60 hours compute | From $20/month |
| **Vercel KV** | 256 MB, 30K commands | From $1/month |
| **Supabase** | 500 MB, 2 GB transfer | From $25/month |
| **MongoDB Atlas** | 512 MB | From $9/month |
| **Neon** | 3 GB, 100 hours compute | From $19/month |

## Recommendation

**For your use case (VM expiry management):**

1. **Small team (< 10 users):** Vercel Postgres Free Tier
2. **Medium team (10-50 users):** Vercel Postgres Paid or Supabase
3. **Large team (50+ users):** Supabase or dedicated PostgreSQL

## Need Help?

If you want me to help migrate to Vercel Postgres or another database, just let me know!

I can:
1. ✅ Set up the database connection
2. ✅ Update the code to use Prisma instead of file storage
3. ✅ Run migrations
4. ✅ Test the migration
5. ✅ Deploy to Vercel

---

**Current Status:** Using temporary file storage (`/tmp/vm-data.json`)  
**Recommended:** Migrate to Vercel Postgres  
**Effort:** ~15 minutes with my help
