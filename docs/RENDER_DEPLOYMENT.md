# Render Deployment Guide

This guide explains how to deploy the Wesal API to Render and ensure database seeding runs properly.

## Prerequisites

- A Render account (https://render.com)
- A PostgreSQL database (either Render's PostgreSQL or external)
- Your repository on GitHub/GitLab

## Deployment Steps

### 1. Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Fill in the following:
   - **Name**: `wesal-api` (or your preference)
   - **Environment**: Node
   - **Region**: Choose closest to your users
   - **Plan**: Standard (or higher if needed)

### 2. Build & Start Commands

Set these in the Render dashboard:

- **Build Command**: `pnpm install && pnpm run build`
- **Start Command**: `node dist/main`

Or if using `render.yaml`, commit the file and Render will auto-detect it.

### 3. Environment Variables

In the Render dashboard, add the following environment variables:

| Variable | Value | Scope |
|----------|-------|-------|
| `NODE_ENV` | `production` | - |
| `AUTO_SEED` | `true` | - |
| `PORT` | `3000` | - |
| `DATABASE_URL` | `postgresql://user:password@host:port/db` | Project (secret) |
| `JWT_SECRET` | Your JWT secret | Project (secret) |

### 4. Database Connection

#### Option A: Using Render PostgreSQL
1. Create a PostgreSQL instance on Render
2. Get the `Database URL` from Render PostgreSQL dashboard
3. Set as `DATABASE_URL` environment variable

#### Option B: Using External Database
1. Use your own PostgreSQL connection string
2. Set as `DATABASE_URL` environment variable

### 5. How Seeding Works

The seeding process is **automatic and non-blocking**:

1. **App starts**: `node dist/main` runs
2. **API listens**: App immediately accepts requests on port 3000
3. **Background seeding**: After 1 second, database seeding starts in the background
4. **Idempotent**: Seeds won't duplicate data if run multiple times

### 6. Monitoring Seeding

To verify seeding is running:

1. Go to Render dashboard → Your service
2. Click **Logs** tab
3. Look for these messages:
   ```
   ✓ Application is running on port 3000
   🌱 Starting background database seeding...
   ✓ Saudi Arabia already exists
   ✓ City "Riyadh" already exists
   ...
   ✅ Database seeding completed successfully!
   ```

### 7. Manual Seeding (if needed)

If you need to run seeding manually on Render:

1. Go to Render dashboard → Your service
2. Click **Shell** tab
3. Run: `node dist/cli-seed`

Or create a one-time job:
```bash
node dist/cli-seed
```

## Disabling Auto-Seeding

If you want to disable automatic seeding (e.g., in production after initial setup):

1. Go to Render dashboard
2. Set `AUTO_SEED` environment variable to `false`
3. Redeploy

## Troubleshooting

### Seeds not running
- Check logs for errors
- Verify `AUTO_SEED=true` in environment variables
- Ensure `DATABASE_URL` is set correctly
- Check database connectivity

### App crashes during startup
- Check database connection
- Look at logs for specific error messages
- Try disabling `AUTO_SEED` temporarily
- Check database has required tables created (TypeORM `synchronize: true`)

### Seeds running slowly
- Check database network latency from Render
- Monitor Render service metrics
- Consider seeding separately before deploying

## Deployment Flow Diagram

```
Deployment Trigger (git push)
        ↓
Render detects changes
        ↓
Build Command runs: pnpm install && pnpm run build
        ↓
Service restarts with: node dist/main
        ↓
App initializes & listens on port 3000 ✓
        ↓
Background seed job starts (1 sec delay)
        ↓
Database seeding runs in background ✓
        ↓
Service fully ready to serve requests ✓
```

## Additional Configuration

### Using render.yaml for Infrastructure as Code

Instead of manual configuration, commit `render.yaml`:

```yaml
services:
  - type: web
    name: wesal-api
    env: node
    plan: standard
    buildCommand: pnpm install && pnpm run build
    startCommand: node dist/main
    envVars:
      - key: NODE_ENV
        value: production
      - key: AUTO_SEED
        value: 'true'
```

Then Render will auto-create/update the service based on this file.

## Production Best Practices

1. **Set strong JWT_SECRET** - Use a cryptographically secure random string
2. **Use Render PostgreSQL** - Fully managed, automatic backups
3. **Enable auto-deploy** - Set up GitHub integration for continuous deployment
4. **Monitor logs** - Regularly check for errors or warnings
5. **Set up alerts** - Configure Render notifications for service failures
6. **Database backups** - Enable automatic backups in Render PostgreSQL
7. **Health checks** - Render provides built-in health checks on port 3000

## Support

For Render-specific issues:
- Check Render documentation: https://render.com/docs
- Community support: https://community.render.com

For API-specific issues:
- Check application logs in Render dashboard
- Review code in `/src` directory
- Check `.env` file for configuration (local only)
