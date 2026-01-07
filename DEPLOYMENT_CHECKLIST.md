# ✅ Deployment Checklist

## Pre-Deployment

- [ ] Code committed to GitHub
- [ ] All tests passing locally
- [ ] Environment variables prepared

## Vercel Setup

- [ ] Project deployed to Vercel
- [ ] Root directory set to `vm-expiry-management`
- [ ] Environment variables added:
  - [ ] `NEXTAUTH_URL`
  - [ ] `NEXTAUTH_SECRET`

## Vercel KV Setup

- [ ] KV database created in Vercel
- [ ] KV database connected to project
- [ ] Application redeployed after KV creation

## Initialization

- [ ] Visited `/api/init` endpoint
- [ ] Response shows `"storageType": "kv"` ✅
- [ ] Default admin created

## Verification

- [ ] Can access application URL
- [ ] Can login with admin credentials
- [ ] Dashboard loads correctly
- [ ] Can create a project
- [ ] Can create a VM record
- [ ] Can view audit logs
- [ ] Data persists after page refresh

## Storage Verification

- [ ] `/api/storage-test` shows `"storageType": "kv"`
- [ ] `/api/storage-test` shows `"connection": "OK"`
- [ ] `/api/storage-test` shows `"readWrite": "OK"`

## Functional Testing

- [ ] Create project works
- [ ] Create VM works
- [ ] Edit VM works
- [ ] Delete VM works
- [ ] Create user works
- [ ] Assign user to project works
- [ ] Export data works
- [ ] Audit logs show operations

## Performance Check

- [ ] Pages load quickly (< 2 seconds)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All buttons work

## Security Check

- [ ] Cannot access dashboard without login
- [ ] Regular users cannot see admin features
- [ ] Users can only see their assigned projects
- [ ] Audit logs record all operations

## Optional Features

- [ ] Email notifications configured (if needed)
- [ ] Custom domain configured (if needed)
- [ ] Cron job for expiry checks working

## Post-Deployment

- [ ] Bookmark admin URL
- [ ] Save admin credentials securely
- [ ] Document any custom configurations
- [ ] Set up monitoring (optional)

## Success Criteria

✅ All items checked = Ready for production!

## Quick Verification Commands

```bash
# Check storage type
curl https://your-domain.vercel.app/api/init

# Test storage connection
curl https://your-domain.vercel.app/api/storage-test

# Health check
curl https://your-domain.vercel.app/api/health
```

## Expected Responses

### /api/init
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

### /api/storage-test
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

### /api/health
```json
{
  "status": "healthy",
  "timestamp": "2026-01-07T...",
  "uptime": 123.45
}
```

## Troubleshooting

### Issue: storageType shows "file"

**Solution:**
1. Verify KV database is created
2. Verify KV is connected to project
3. Redeploy: `vercel --prod`
4. Check `/api/init` again

### Issue: Cannot login

**Solution:**
1. Verify `/api/init` was called
2. Check browser console for errors
3. Verify `NEXTAUTH_SECRET` is set
4. Try clearing browser cache

### Issue: Data disappears

**Solution:**
1. Check `/api/storage-test`
2. Verify `storageType` is "kv"
3. If "file", KV is not properly configured

## Support Resources

- [Quick Deploy Guide](./QUICK_DEPLOY_KV.md)
- [Detailed Setup](./DEPLOYMENT_WITH_KV.md)
- [KV Configuration](./VERCEL_KV_SETUP.md)
- [Migration Summary](./KV_MIGRATION_SUMMARY.md)

---

**Last Updated:** January 7, 2026  
**Version:** 1.0.0 with Vercel KV  
**Status:** Production Ready ✅
