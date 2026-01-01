# Render Deployment Checklist

## Pre-Deployment Setup

### Local Testing
- [ ] Run `pnpm install` to install dependencies
- [ ] Create `.env` file with database credentials
- [ ] Run `pnpm run build` to verify build succeeds
- [ ] Run `pnpm run start:prod` to test production build locally
- [ ] Check that seeds run automatically (should see `✅ Database seeding completed successfully!` in logs)

### Optional: Manual Seed Testing
- [ ] Run `pnpm run seed` to test seeding script
- [ ] Verify data appears in database (countries, cities, categories)

## Render Configuration

### Step 1: Prepare Repository
- [ ] Commit all changes to `dev` branch
- [ ] Push to GitHub
- [ ] Ensure `render.yaml` is committed
- [ ] Ensure `.env.example` shows all needed variables

### Step 2: Create Render Web Service
1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Select your GitHub repository
4. Configuration will auto-load from `render.yaml`

### Step 3: Set Environment Variables
Add these in Render dashboard → Service → Environment:

**Required:**
- [ ] `DATABASE_URL` - Your PostgreSQL connection string
- [ ] `JWT_SECRET` - Strong random secret (use online generator)
- [ ] `NODE_ENV` = `production`
- [ ] `AUTO_SEED` = `true`

**Optional (if needed):**
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - For email
- [ ] `SMS_API_KEY`, `SMS_SENDER_ID` - For SMS

### Step 4: Deploy
- [ ] Click **Create Web Service**
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Check logs for deployment status
- [ ] Look for: `✓ Application is running on port 3000`
- [ ] Look for: `✅ Database seeding completed successfully!`

## Post-Deployment Verification

### Check Logs
- [ ] View logs in Render dashboard
- [ ] Confirm app started successfully
- [ ] Confirm seeding ran and completed
- [ ] No error messages in logs

### Test API
- [ ] Access your API URL (e.g., `https://your-service.onrender.com`)
- [ ] Test GraphQL endpoint: `https://your-service.onrender.com/graphql`
- [ ] Test a simple query to confirm database connection

### Verify Database Seeding
- [ ] Query countries endpoint - should return Saudi Arabia
- [ ] Query cities endpoint - should return Saudi cities
- [ ] Query categories endpoint - should return 10 categories

## Troubleshooting

### If build fails:
- [ ] Check build logs in Render
- [ ] Verify `pnpm` is available (Node >= 18)
- [ ] Check for TypeScript errors: `pnpm run build` locally

### If seeding fails:
- [ ] Verify `DATABASE_URL` is correct
- [ ] Check database is accessible from Render
- [ ] Verify database has required tables (TypeORM should create them)
- [ ] Set `AUTO_SEED=false` temporarily to test API without seeding

### If app crashes on startup:
- [ ] Check database connection in logs
- [ ] Verify all required environment variables are set
- [ ] Check database is in correct state
- [ ] Look for connection timeouts

## Monitoring & Maintenance

### Regular Checks
- [ ] Monitor Render dashboard for errors
- [ ] Check logs weekly for warnings
- [ ] Verify database backups are enabled
- [ ] Monitor disk usage and memory

### When Redeploying
- [ ] Seeds are idempotent - safe to redeploy
- [ ] No downtime expected during redeploy
- [ ] Logs will show seeding running again
- [ ] Verify no duplicate data is created

## Environment Variable Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | `postgresql://...` | PostgreSQL connection string |
| `NODE_ENV` | Yes | `production` | Must be 'production' for Render |
| `JWT_SECRET` | Yes | `abc123...` | Use strong random string (min 32 chars) |
| `AUTO_SEED` | No | `true` | Set to 'false' to disable seeding |
| `PORT` | No | `3000` | Automatically set by Render |

## Useful Links

- [Render Documentation](https://render.com/docs)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express)
- [Render PostgreSQL](https://render.com/docs/databases)
- [API Repository](https://github.com/besufkadmenji/wesal-api)

## Support

- **Render Issues**: Check Render logs and documentation
- **API Issues**: Check application logs or GitHub issues
- **Database Issues**: Verify PostgreSQL connection and configuration
