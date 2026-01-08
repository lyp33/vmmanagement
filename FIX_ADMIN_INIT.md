# Fix Admin Initialization Issue

## Problem Identified

The admin initialization is failing because **Vercel KV is not connected**. The storage test shows `"storageType": "file"` instead of `"storageType": "vercel-kv"`.

## Root Cause

Your Vercel environment variables have the wrong names:
- ❌ `vm_management_KV_URL`
- ❌ `vm_management_KV_REST_API_URL`
- ❌ `vm_management_KV_REST_API_TOKEN`
- ❌ `vm_management_KV_REST_API_READ_ONLY_TOKEN`

But the code expects:
- ✅ `KV_URL`
- ✅ `KV_REST_API_URL`
- ✅ `KV_REST_API_TOKEN`
- ✅ `KV_REST_API_READ_ONLY_TOKEN`

## Solution: Rename Environment Variables

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Select your project: `vmmanagement`
3. Go to **Settings** → **Environment Variables**

### Step 2: Rename the Variables

For each variable, you need to:
1. **Delete** the old variable with `vm_management_` prefix
2. **Add** a new variable with the correct name (without prefix)
3. Copy the **same value** from the old variable

**Variables to rename:**

| Old Name (DELETE) | New Name (ADD) | Keep Same Value |
|-------------------|----------------|-----------------|
| `vm_management_KV_URL` | `KV_URL` | ✅ Copy value |
| `vm_management_KV_REST_API_URL` | `KV_REST_API_URL` | ✅ Copy value |
| `vm_management_KV_REST_API_TOKEN` | `KV_REST_API_TOKEN` | ✅ Copy value |
| `vm_management_KV_REST_API_READ_ONLY_TOKEN` | `KV_REST_API_READ_ONLY_TOKEN` | ✅ Copy value |

### Step 3: Redeploy

After renaming all variables:
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

### Step 4: Verify KV Connection

Test the storage connection:
```
GET https://vmmanagement.vercel.app/api/storage-test
```

You should see:
```json
{
  "storageType": "vercel-kv",
  "timestamp": "...",
  "tests": {
    "connection": "OK",
    "readWrite": "OK - No admin yet"
  }
}
```

### Step 5: Initialize Admin Account

Once KV is connected, create the admin:

**Using PowerShell:**
```powershell
Invoke-WebRequest -Uri "https://vmmanagement.vercel.app/api/admin/init" -Method POST
```

**Using curl (if installed):**
```bash
curl -X POST https://vmmanagement.vercel.app/api/admin/init
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Default admin account created successfully",
  "admin": {
    "email": "admin@vmmanagement.com",
    "name": "System Administrator",
    "role": "ADMIN"
  },
  "credentials": {
    "email": "admin@vmmanagement.com",
    "password": "Admin@123456",
    "note": "Please change this password immediately after first login"
  }
}
```

### Step 6: Login

1. Go to https://vmmanagement.vercel.app
2. Login with:
   - **Email:** `admin@vmmanagement.com`
   - **Password:** `Admin@123456`
3. Change the password immediately after first login

## Quick Verification Checklist

- [ ] Renamed all 4 KV environment variables (removed `vm_management_` prefix)
- [ ] Redeployed the application
- [ ] Storage test shows `"storageType": "vercel-kv"`
- [ ] POST to `/api/admin/init` succeeded
- [ ] Can login with admin credentials
- [ ] Changed default password

## Troubleshooting

### If storage test still shows "file" after renaming:
- Make sure you **redeployed** after changing variables
- Check that variable names are **exactly** as shown (no extra spaces)
- Verify all 4 variables are present in Vercel dashboard

### If admin init fails with "already exists":
- Admin was already created successfully
- Try logging in with the credentials above

### If you can't send POST request:
Create a simple HTML file and open it in your browser:

```html
<!DOCTYPE html>
<html>
<body>
  <button onclick="initAdmin()">Initialize Admin</button>
  <pre id="result"></pre>
  
  <script>
    async function initAdmin() {
      try {
        const response = await fetch('https://vmmanagement.vercel.app/api/admin/init', {
          method: 'POST'
        });
        const data = await response.json();
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('result').textContent = 'Error: ' + error.message;
      }
    }
  </script>
</body>
</html>
```

Save as `init-admin.html` and open in browser, then click the button.
