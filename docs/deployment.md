# StarFashion Wholesale Portal - Deployment Documentation

## 1. Overview

This document provides comprehensive deployment instructions for the StarFashion Wholesale Portal, covering development, staging, and production environments.

## 2. Prerequisites

### 2.1 System Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| Node.js | 18.x or later | 18.x or later |
| npm | 9.x or later | 9.x or later |
| Docker | Optional | Required |
| MySQL | N/A | 8.0 |
| RAM | 4GB minimum | 8GB minimum |
| Storage | 10GB minimum | 50GB minimum |

### 2.2 Required Software

- **Node.js** (v18.x or later)
- **npm** (v9.x or later)
- **Docker** (optional, for MySQL)
- **Git** (for version control)

## 3. Environment Configuration

### 3.1 Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="mysql://starfashion:starfashionpass@localhost:3306/starfashion_db"  # MySQL for production

# Authentication
JWT_SECRET="your-secure-jwt-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Application
SYSTEM_CURRENCY="EUR"
SYSTEM_CURRENCY_SYMBOL="€"
PORT="3000"
NODE_ENV="development"
```

### 3.2 Environment Variable Descriptions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` | Database connection string |
| `JWT_SECRET` | Yes | Hardcoded fallback | JWT token signing secret |
| `NEXTAUTH_SECRET` | No | Same as JWT_SECRET | NextAuth secret (unused) |
| `NEXTAUTH_URL` | No | `http://localhost:3000` | NextAuth URL (unused) |
| `SYSTEM_CURRENCY` | No | `EUR` | Business currency |
| `SYSTEM_CURRENCY_SYMBOL` | No | `€` | Currency display symbol |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |

## 4. Development Setup

### 4.1 Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd starfashion-wholesale

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npm run db:migrate

# 6. Seed database
npm run db:seed

# 7. Start development server
npm run dev
```

### 4.2 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio |

### 4.3 Development URLs

| Service | URL |
|---------|-----|
| Application | http://localhost:3000 |
| Prisma Studio | http://localhost:5555 |
| API Base | http://localhost:3000/api/v1 |

## 5. Production Deployment

### 5.1 Docker Deployment (Recommended)

#### 5.1.1 Start MySQL Container

```bash
# Start MySQL container
docker-compose up -d

# Verify container is running
docker ps

# Check container logs
docker logs starfashion_mysql
```

#### 5.1.2 Docker Compose Configuration

**File:** `docker-compose.yml`

```yaml
services:
  db:
    image: mysql:8.0
    container_name: starfashion_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: starfashion_db
      MYSQL_USER: starfashion
      MYSQL_PASSWORD: starfashionpass
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

#### 5.1.3 Production Environment Variables

Update `.env` for production:

```env
DATABASE_URL="mysql://starfashion:starfashionpass@localhost:3306/starfashion_db"
JWT_SECRET="your-production-jwt-secret"
NODE_ENV="production"
PORT="3000"
```

### 5.2 Manual Deployment

#### 5.2.1 Install MySQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server

# macOS (Homebrew)
brew install mysql
brew services start mysql

# Windows
# Download MySQL Installer from mysql.com
```

#### 5.2.2 Configure MySQL

```sql
-- Create database and user
CREATE DATABASE starfashion_db;
CREATE USER 'starfashion'@'localhost' IDENTIFIED BY 'starfashionpass';
GRANT ALL PRIVILEGES ON starfashion_db.* TO 'starfashion'@'localhost';
FLUSH PRIVILEGES;
```

#### 5.2.3 Deploy Application

```bash
# 1. Install dependencies
npm ci

# 2. Build application
npm run build

# 3. Run migrations
npx prisma migrate deploy

# 4. Seed database (optional)
npm run db:seed

# 5. Start production server
npm start
```

### 5.3 PM2 Deployment (Process Manager)

#### 5.3.1 Install PM2

```bash
npm install -g pm2
```

#### 5.3.2 Create PM2 Ecosystem File

**File:** `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'starfashion-wholesale',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
```

#### 5.3.3 PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart starfashion-wholesale

# Stop application
pm2 stop starfashion-wholesale

# Delete application
pm2 delete starfashion-wholesale
```

### 5.4 Nginx Reverse Proxy

#### 5.4.1 Nginx Configuration

**File:** `/etc/nginx/sites-available/starfashion`

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5.4.2 Enable Nginx Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/starfashion /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 6. SSL/TLS Configuration

### 6.1 Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 6.2 Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        # ... proxy headers
    }
}
```

## 7. Database Management

### 7.1 Migrations

```bash
# Create new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### 7.2 Database Backup

```bash
# MySQL backup
mysqldump -u starfashion -p starfashion_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u starfashion -p starfashion_db < backup.sql
```

### 7.3 Prisma Studio

```bash
# Open Prisma Studio (visual database browser)
npm run db:studio
```

## 8. Monitoring & Logging

### 8.1 Application Logs

```bash
# PM2 logs
pm2 logs

# Docker logs
docker logs -f starfashion_mysql

# Next.js logs (production)
# Logs are output to stdout/stderr
```

### 8.2 Health Checks

Create a health check endpoint:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: error.message }, { status: 500 });
  }
}
```

### 8.3 Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# Node.js profiling
node --inspect server.js
```

## 9. Security Checklist

### 9.1 Pre-Deployment

- [ ] Change default JWT_SECRET
- [ ] Change default database credentials
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set secure HTTP headers
- [ ] Review environment variables

### 9.2 Production Security

- [ ] Use strong, unique passwords
- [ ] Limit database access
- [ ] Enable MySQL SSL connections
- [ ] Configure firewall rules
- [ ] Set up intrusion detection
- [ ] Regular security audits

### 9.3 Application Security

- [ ] Input validation (Zod)
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (React)
- [ ] CSRF protection (SameSite cookies)
- [ ] Rate limiting (recommended)
- [ ] Audit logging

## 10. Troubleshooting

### 10.1 Common Issues

#### Database Connection Errors

```bash
# Check MySQL status
docker ps | grep mysql

# Test connection
mysql -u starfashion -p starfashion_db

# Check Prisma connection
npx prisma db push
```

#### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Regenerate Prisma client
npx prisma generate
```

#### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <process-id> /F
```

### 10.2 Logs Location

| Log Type | Location |
|----------|----------|
| Application | stdout/stderr |
| PM2 | `~/.pm2/logs/` |
| Docker | `docker logs <container>` |
| Nginx | `/var/log/nginx/` |

## 11. Rollback Procedures

### 11.1 Application Rollback

```bash
# PM2 rollback
pm2 rollback

# Git rollback
git revert <commit-hash>
git push
```

### 11.2 Database Rollback

```bash
# Restore from backup
mysql -u starfashion -p starfashion_db < backup.sql

# Reset to specific migration
npx prisma migrate reset --to <migration-name>
```

## 12. Scaling

### 12.1 Horizontal Scaling

```bash
# PM2 cluster mode
pm2 start ecosystem.config.js

# Multiple instances
pm2 start app.js -i 4
```

### 12.2 Database Scaling

```yaml
# Docker Compose with read replica
services:
  db-master:
    image: mysql:8.0
    # ... master configuration
  
  db-replica:
    image: mysql:8.0
    # ... replica configuration
```

## 13. Maintenance

### 13.1 Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Database backup | Daily | `mysqldump ...` |
| Log rotation | Weekly | Configure logrotate |
| Security updates | Monthly | `npm audit` |
| Dependency updates | Monthly | `npm update` |
| SSL certificate renewal | Quarterly | `certbot renew` |

### 13.2 Database Maintenance

```sql
-- Optimize tables
OPTIMIZE TABLE users, orders, invoices;

-- Analyze tables
ANALYZE TABLE users, orders, invoices;

-- Check tables
CHECK TABLE users, orders, invoices;
```

## 14. Support

### 14.1 Useful Commands

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Docker version
docker --version

# Check MySQL version
mysql --version
```

### 14.2 Documentation

- [Architecture Documentation](./architecture.md)
- [Database Schema](./database-schema.md)
- [API Documentation](./api-documentation.md)
- [Security Documentation](./security.md)

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis
