# OBE Tracker — Bangladesh University of Professionals

An Outcome-Based Education (OBE) attainment tracking system with a Node.js/Express + Prisma backend and a static HTML/JS frontend.

This README covers both **local development** (original quick start) and **production deployment** on an Ubuntu server, including the exact configuration and troubleshooting notes from a live deployment.

---

## Table of Contents

1. [Credentials](#credentials)
2. [Attainment Model](#attainment-model)
3. [Architecture](#architecture)
4. [Local Development (Quick Start)](#local-development-quick-start)
5. [Production Deployment (Ubuntu Server)](#production-deployment-ubuntu-server)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Backend Process Management (PM2)](#backend-process-management-pm2)
9. [Frontend Deployment](#frontend-deployment)
10. [Nginx Configuration](#nginx-configuration)
11. [Networking / Firewall](#networking--firewall)
12. [HTTPS Setup](#https-setup-not-yet-configured)
13. [Deploying Updates](#deploying-updates-workflow)
14. [Troubleshooting Reference](#troubleshooting-reference)
15. [Security Notes / Action Items](#security-notes-action-items-for-next-maintainer)
16. [Quick Reference Commands](#quick-reference-commands)

---

## Credentials

| Role    | Email / Login         | Password      |
|---------|------------------------|---------------|
| Admin   | admin@bup.edu.bd       | 1234          |
| Faculty | AZ@bup.edu.bd          | 1234          |
| Faculty | RAI@bup.edu.bd         | 1234          |
| Student | 23549009001            | 23549009001   |
| Student | (any roll number)      | (roll number) |

⚠️ **These are default seed credentials.** They are fine for local development but **must be changed before any real or public deployment** — see [Security Notes](#security-notes-action-items-for-next-maintainer).

---

## Attainment Model

Binary model — **60% threshold**.

- **CO Attained:** student scores ≥ 60% of weighted marks across all assessments linked to that CO
- **PO Attained:** ≥ 60% of correlation-weighted COs mapped to that PO are individually attained

---

## Architecture

| Component | Tech | Notes |
|---|---|---|
| Backend API | Node.js + Express + Prisma ORM | Routes mounted under `/api/v1/...` |
| Database | PostgreSQL (via Prisma) | Confirm provider in `prisma/schema.prisma` |
| Frontend | Static HTML/CSS/JS, no build step | `obe-tracker-web/js/api.js` controls API base URL |

**Production request flow (Ubuntu server):**
```
Browser → Nginx (port 80)
            ├── "/"       → static files (frontend)
            └── "/api/*"  → proxied to http://localhost:3000/api/*  (PM2-managed backend)
                                          → PostgreSQL (localhost:5432)
```

---

## Local Development (Quick Start)

### Backend
```bash
cd obe-tracker-backend
npm install
# Create .env with DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Web Frontend
Open `obe-tracker-web/index.html` directly in Chrome.
Backend must be running at `localhost:3000`.

> Note: `npm run dev` uses `nodemon` for auto-restart during development. **Do not use this script in production** — see [Backend Process Management](#backend-process-management-pm2).

---

## Production Deployment (Ubuntu Server)

The sections below document a real deployment of this project on an Ubuntu 24.04 server, including the exact fixes required for issues encountered along the way. Use this as the reference for setting up a new server or handing off maintenance.

### Prerequisites installed on the server
- Ubuntu 24.04
- Node.js 20.x (via NodeSource)
- PostgreSQL 16
- Nginx
- PM2 (`sudo npm install -g pm2`)
- `ufw` firewall enabled (OpenSSH, 80, 443 allowed)

### Directory layout

| Purpose | Path |
|---|---|
| Full repo (source of truth, git-managed) | `/home/<user>/ObeTracker` |
| Backend (runs from here via PM2) | `/home/<user>/ObeTracker/obe-tracker-backend` |
| Frontend (served by Nginx — a **copy**, not live-linked) | `/var/www/obetracker` |

---

## Environment Variables

Backend `.env` file (not committed to git — must be created manually on every server):

```
DATABASE_URL="postgresql://obetracker_user:<password>@localhost:5432/obetracker"
JWT_SECRET="<long random string>"
PORT=3000
```

Generate a strong secret:
```bash
openssl rand -base64 48
```

---

## Database Setup

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE obetracker;
CREATE USER obetracker_user WITH ENCRYPTED PASSWORD '<password>';
GRANT ALL PRIVILEGES ON DATABASE obetracker TO obetracker_user;
```

**Postgres 15+ gotcha:** new databases no longer grant `CREATE` on the `public` schema to non-superuser roles. Without this, migrations fail with `permission denied for schema public`:

```sql
\c obetracker
GRANT ALL ON SCHEMA public TO obetracker_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO obetracker_user;
ALTER SCHEMA public OWNER TO obetracker_user;
```

### Applying schema / migrations

The repo's `prisma/migrations` history was inconsistent on this deployment (multiple `init` folders; `migrate deploy` reported "no migration found" despite files existing on disk). The working fix was to bypass migration history and push the schema directly:

```bash
cd obe-tracker-backend
npx prisma db push
```

If the migration history is clean and consistent, prefer the standard production command instead:
```bash
npx prisma migrate deploy
```
Check status any time:
```bash
npx prisma migrate status
```

### Seeding
```bash
npm run db:seed
```
This populates the default accounts listed in [Credentials](#credentials).

---

## Backend Process Management (PM2)

**Do not run `npm run dev` in production.** It depends on `nodemon`, a devDependency that may not be installed on a production server — this causes a crash loop (`sh: 1: nodemon: not found`). Use the `start` script instead, which PM2 will keep alive and restart on crashes or reboots.

```bash
cd obe-tracker-backend
pm2 start npm --name obetracker-backend -- run start
pm2 save
```

**Enable auto-start on server reboot:**
```bash
pm2 startup
# Copy and run the exact command it prints, e.g.:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u <user> --hp /home/<user>
```
This registers a systemd service (`pm2-<user>.service`).

**Common commands:**
```bash
pm2 list                              # status + restart count
pm2 logs obetracker-backend           # view logs
pm2 flush obetracker-backend          # clear old logs
pm2 restart obetracker-backend        # restart after code changes
pm2 delete obetracker-backend         # remove process
```

**Health check:**
```bash
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","db":"connected","timestamp":"..."}
```
(`curl http://localhost:3000/` returning `Route GET / not found` is expected — there is no root route, only `/api/v1/...` endpoints.)

---

## Frontend Deployment

### API base URL

`obe-tracker-web/js/api.js` originally pointed production traffic at a Vercel-hosted backend:

```js
// Original
const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
  ? 'http://localhost:3000/api/v1'
  : 'https://obe-tracker.vercel.app/api/v1';
```

For self-hosting, this was changed to a **relative path**, so it works on any domain/IP without further edits, as long as Nginx proxies `/api/`:

```js
// Updated for self-hosted Nginx deployment
const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
  ? 'http://localhost:3000/api/v1'
  : '/api/v1';
```

### Why the frontend is served from `/var/www/obetracker`, not the repo directly

Nginx runs as the `www-data` user. Ubuntu home directories default to `750` permissions, so `www-data` cannot traverse into `/home/<user>/...` even if the files themselves are readable — this caused `stat() failed (13: Permission denied)` and Nginx `500` errors. The fix is to serve from the standard web root instead:

```bash
sudo mkdir -p /var/www/obetracker
sudo cp -r /home/<user>/ObeTracker/obe-tracker-web/* /var/www/obetracker/
sudo chown -R www-data:www-data /var/www/obetracker
```

⚠️ **This is a copy, not a live symlink.** Editing files in the repo's `obe-tracker-web/` folder has no effect on the live site until re-copied — see [Deploying Updates](#deploying-updates-workflow).

---

## Nginx Configuration

File: `/etc/nginx/sites-available/obetracker` (symlinked into `sites-enabled/`)

```nginx
server {
    listen 80;
    server_name your-domain-or-server-ip;

    root /var/www/obetracker;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Remove/disable the default Nginx site if present, as it can conflict:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Apply changes safely:
```bash
sudo nginx -t          # always test before reloading
sudo systemctl restart nginx
```

---

## Networking / Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # opens ports 80 + 443
sudo ufw enable
sudo ufw status
```

If hosted on a cloud VPS (AWS/DigitalOcean/Azure/GCP/etc.), the provider's **network-level firewall** (e.g. AWS Security Group) must also allow inbound 80/443 — `ufw` alone is not sufficient in that case.

---

## HTTPS Setup (Not Yet Configured)

Once a domain name is pointed at the server:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
Certbot edits the Nginx config automatically and sets up auto-renewal.

---

## Deploying Updates (Workflow)

```bash
cd /home/<user>/ObeTracker
git pull
```

**Backend changes:**
```bash
cd obe-tracker-backend
npm install                 # if dependencies changed
npx prisma db push          # if schema.prisma changed (or `migrate deploy` on clean migration history)
pm2 restart obetracker-backend
```

**Frontend changes:**
```bash
sudo cp -r /home/<user>/ObeTracker/obe-tracker-web/* /var/www/obetracker/
sudo chown -R www-data:www-data /var/www/obetracker
```
(No Nginx reload needed for static file changes — only if `nginx.conf` itself is edited.)

---

## Troubleshooting Reference

| Symptom | Cause | Fix |
|---|---|---|
| `permission denied for schema public` | Postgres 15+ default schema permissions | `GRANT` + `ALTER SCHEMA ... OWNER TO` (see [Database Setup](#database-setup)) |
| `sh: 1: nodemon: not found`, PM2 crash loop | Ran `npm run dev` in production | Use `npm run start` instead |
| `migrate deploy` says "No migration found" | Broken/incomplete migration folder history | Use `npx prisma db push` |
| Nginx `500`, log shows `stat() ... Permission denied` | `www-data` can't traverse into `/home/<user>/...` | Serve frontend from `/var/www/obetracker` instead |
| `curl localhost:3000/` → `Route GET / not found` | No root route defined | Expected — test `/api/v1/health` instead |
| Frontend can't reach API once deployed | `api.js` hardcoded to a Vercel URL | Use relative path `/api/v1` (see [Frontend Deployment](#frontend-deployment)) |

---

## Security Notes / Action Items for Next Maintainer

- [ ] **Change all seeded default passwords** (`1234` / roll numbers) before any real usage.
- [ ] Set up HTTPS once a domain is available.
- [ ] Move `.env` secrets to a proper secrets manager if this becomes long-lived production infrastructure.
- [ ] Set up scheduled PostgreSQL backups (`pg_dump` via cron) — none currently exist.
- [ ] Review CORS configuration in the backend if the frontend is ever hosted on a different origin than the API.
- [ ] Resolve/clean up the Prisma migration history so `migrate deploy` works normally instead of relying on `db push`.

---

## Quick Reference Commands

```bash
# Check everything is alive
pm2 list
sudo systemctl status nginx
sudo systemctl status postgresql
curl http://localhost:3000/api/v1/health

# View logs
pm2 logs obetracker-backend
sudo tail -f /var/log/nginx/error.log

# Restart everything
pm2 restart obetracker-backend
sudo systemctl restart nginx
```
