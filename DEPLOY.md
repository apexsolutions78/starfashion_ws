# Deployment Guide - DirectAdmin (wsapp.starfashionofficial.com)

## Prerequisites
- DirectAdmin server with SSH access
- Node.js 20+ installed
- MySQL/MariaDB database created
- Subdomain `wsapp.starfashionofficial.com` created with SSL

---

## Step 1: SSH into your server

```bash
ssh username@your-server-ip
```

---

## Step 2: Create the deployment directory

```bash
mkdir -p /home/starfashion/wsapp.starfashionofficial.com
cd /home/starfashion/wsapp.starfashionofficial.com
```

---

## Step 3: Clone the repository

```bash
git clone https://github.com/apexsolutions78/starfashion_ws.git .
```

---

## Step 4: Create MySQL Database

In DirectAdmin panel:
1. Go to **Account Manager** > **MySQL Databases**
2. Create a new database: `starfashion_ws`
3. Create a database user and add to the database with ALL PRIVILEGES
4. Note down: database name, username, password

---

## Step 5: Create .env file

```bash
nano .env
```

Paste this content (replace with your actual database credentials):

```env
DATABASE_URL="mysql://db_username:db_password@localhost:3306/starfashion_ws"
JWT_SECRET="your-random-secret-key-here-change-this"
NEXTAUTH_SECRET="your-random-secret-key-here-change-this"
NEXTAUTH_URL="https://wsapp.starfashionofficial.com"
SYSTEM_CURRENCY="PKR"
SYSTEM_CURRENCY_SYMBOL="Rs."
PORT=3000
NODE_ENV="production"
```

Save with `Ctrl+X`, `Y`, `Enter`

---

## Step 6: Install dependencies and build

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema to MySQL
npx prisma db push

# Seed the database
npx tsx prisma/seed.ts

# Build the application
npm run build
```

---

## Step 7: Start the application

```bash
# Start in background with nohup
nohup node node_modules/.bin/next start -p 3000 > app.log 2>&1 &

# Note the PID for stopping later
echo $! > app.pid
```

---

## Step 8: Configure Reverse Proxy in DirectAdmin

The Next.js app runs on port 3000. DirectAdmin needs to proxy HTTPS traffic to it.

### Option A: Using DirectAdmin's Reverse Proxy (Recommended)

1. Go to **Account Manager** > **Domain Setup**
2. Select `wsapp.starfashionofficial.com`
3. Go to **Advanced Options** > **Reverse Proxy**
4. Add:
   - **Source URL:** `https://wsapp.starfashionofficial.com`
   - **Destination URL:** `http://127.0.0.1:3000`

### Option B: Manual Apache Config

If reverse proxy option isn't available, add this to your Apache config:

```apache
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*) ws://127.0.0.1:3000/$1 [P,L]
RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule /(.*) http://127.0.0.1:3000/$1 [P,L]

ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Port "443"
```

---

## Step 9: Verify SSL and Test

1. Open https://wsapp.starfashionofficial.com in browser
2. Login with `admin@starfashion.com` / `Password123!`

---

## Manage the Application

### Start
```bash
cd /home/starfashion/wsapp.starfashionofficial.com
nohup node node_modules/.bin/next start -p 3000 > app.log 2>&1 &
echo $! > app.pid
```

### Stop
```bash
kill $(cat app.pid)
```

### Restart
```bash
kill $(cat app.pid)
cd /home/starfashion/wsapp.starfashionofficial.com
nohup node node_modules/.bin/next start -p 3000 > app.log 2>&1 &
echo $! > app.pid
```

### View Logs
```bash
tail -f /home/starfashion/wsapp.starfashionofficial.com/app.log
```

---

## Troubleshooting

### App won't start
```bash
tail -50 /home/starfashion/wsapp.starfashionofficial.com/app.log
```

### Database connection error
- Verify credentials in `.env`
- Ensure MySQL user has ALL PRIVILEGES
- Check MySQL is running: `systemctl status mysql`

### 502 Bad Gateway
- Check app is running: `ps aux | grep next`
- Check port 3000 is listening: `netstat -tlnp | grep 3000`
- Verify reverse proxy is configured correctly

### SSL issues
- Ensure SSL is active in DirectAdmin for the subdomain
- Check certificate: `echo | openssl s_client -connect wsapp.starfashionofficial.com:443 -servername wsapp.starfashionofficial.com 2>/dev/null | openssl x509 -noout -dates`

---

## Re-deployment (after code updates)

```bash
cd /home/starfashion/wsapp.starfashionofficial.com

# Stop current instance
kill $(cat app.pid)

# Pull and rebuild
git pull
npm install
npx prisma generate
npx prisma db push
npm run build

# Restart
nohup node node_modules/.bin/next start -p 3000 > app.log 2>&1 &
echo $! > app.pid
```
