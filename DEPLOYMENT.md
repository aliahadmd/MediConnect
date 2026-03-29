# Deployment Guide — VPS

This guide covers deploying MediConnect on a VPS (Ubuntu/Debian) using Docker Compose.

## Requirements

- VPS with 2+ GB RAM, 2+ vCPU (4 GB recommended)
- Ubuntu 22.04+ or Debian 12+
- Docker Engine 24+ and Docker Compose v2
- Domain name pointed to your VPS IP (for HTTPS)
- Ports 80, 443 open in firewall

## 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then verify:
docker --version
docker compose version
```

## 2. Clone the repository

```bash
cd /opt
git clone <repo-url> mediconnect
cd mediconnect
```

## 3. Configure environment

The `.env.production` file is gitignored and not pushed to the repository. Copy it from your local development environment and create a `.env` file on the server:

1. On your local machine, open `.env.production` and copy its contents
2. On the server, create the `.env` file:

```bash
nano .env
```

3. Paste the contents from `.env.production` and update the values for your production setup:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://mediconnect:mediconnect@postgres:5432/mediconnect
LIVEKIT_URL=wss://livekit.yourdomain.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=<YOUR_LIVEKIT_API_SECRET>
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
BETTER_AUTH_SECRET=<RANDOM_SECRET_32_CHARS>
BETTER_AUTH_URL=https://yourdomain.com
```

For production, generate strong secrets:

```bash
openssl rand -base64 32   # For BETTER_AUTH_SECRET
openssl rand -hex 16      # For MINIO keys
openssl rand -hex 24      # For database password
```

The Docker Compose services read from this `.env` file via `env_file: .env`.

## 4. Update LiveKit config

Edit `livekit.yaml` with production keys:

```yaml
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
keys:
  <YOUR_LIVEKIT_API_KEY>: <YOUR_LIVEKIT_API_SECRET>
```

## 5. Build and start

```bash
# Build and start all services
docker compose up nextjs-standalone --build -d

# Check logs
docker compose logs -f nextjs-standalone

# Verify all services are running
docker compose ps
```

This starts:
- **Next.js app** on port 3000
- **PostgreSQL** on port 5432
- **LiveKit** on ports 7880-7882
- **MinIO** on ports 9000-9001

## 6. Initialize the database

Push the schema and optionally seed demo data:

```bash
# Schema is auto-applied by the migrate service on startup.
# To seed demo data:
docker compose -f docker-compose.production.yml --profile seed up seed
```

## 7. Set up reverse proxy (Nginx + SSL)

Install Nginx and Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create Nginx config at `/etc/nginx/sites-available/mediconnect`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
    }

    # SSE notifications — disable buffering
    location /api/notifications/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/mediconnect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

## 8. LiveKit reverse proxy (optional)

If you want LiveKit accessible via `wss://livekit.yourdomain.com`, add another Nginx config:

```nginx
server {
    listen 80;
    server_name livekit.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then `sudo certbot --nginx -d livekit.yourdomain.com`.

## Operations

### View logs

```bash
docker compose logs -f                    # All services
docker compose logs -f nextjs-standalone  # App only
docker compose logs -f postgres           # Database only
```

### Restart services

```bash
docker compose restart nextjs-standalone
```

### Update deployment

```bash
cd /opt/mediconnect
git pull
docker compose up nextjs-standalone --build -d
```

### Database backup

```bash
docker compose exec postgres pg_dump -U mediconnect mediconnect > backup_$(date +%Y%m%d).sql
```

### Database restore

```bash
cat backup_20250330.sql | docker compose exec -T postgres psql -U mediconnect mediconnect
```

### Using Bun runtime instead of Node.js

Replace `nextjs-standalone` with `nextjs-standalone-with-bun` in all commands:

```bash
docker compose up nextjs-standalone-with-bun --build -d
```

## Health checks

- **App**: `curl http://localhost:3000`
- **PostgreSQL**: `docker compose exec postgres pg_isready -U mediconnect`
- **LiveKit**: `curl http://localhost:7880`
- **MinIO**: `curl http://localhost:9000/minio/health/live`

## Architecture

```
Internet
    │
    ▼
┌─────────┐
│  Nginx  │ ← SSL termination, reverse proxy
│ :80/443 │
└────┬────┘
     │
     ├──► Next.js App (:3000)
     │        ├── PostgreSQL (:5432)
     │        ├── MinIO (:9000)
     │        └── LiveKit (:7880)
     │
     └──► LiveKit WSS (optional subdomain)
```

All services run in a shared Docker network (`mediconnect`). Only Nginx is exposed to the internet.
