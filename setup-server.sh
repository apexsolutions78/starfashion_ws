#!/bin/bash
# StarFashion Wholesale - Server Setup Script
# Run this on your DirectAdmin server after git clone

set -e

echo "=== StarFashion Server Setup ==="

# 1. Generate secure secrets
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# 2. Get MySQL credentials from user
echo ""
echo "Enter your MySQL database details:"
read -p "MySQL Username: " DB_USER
read -sp "MySQL Password: " DB_PASS
echo ""
read -p "MySQL Database Name [starfashion_db]: " DB_NAME
DB_NAME=${DB_NAME:-starfashion_db}
read -p "MySQL Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

# 3. Create database and user
echo ""
echo "Creating MySQL database and user..."
mysql -u root -p -e "
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${DB_HOST}';
FLUSH PRIVILEGES;
" 2>/dev/null || echo "Note: If mysql root command failed, create the database manually via DirectAdmin Panel > MySQL Databases"

# 4. Create .env file
echo ""
echo "Creating .env file..."
cat > .env << ENVEOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="http://$(hostname -f 2>/dev/null || echo 'yourdomain.com')"
SYSTEM_CURRENCY="PKR"
SYSTEM_CURRENCY_SYMBOL="Rs."
PORT=3000
NODE_ENV="production"
ENVEOF

echo ".env file created with secure random secrets."

# 5. Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# 6. Generate Prisma Client
echo ""
echo "Generating Prisma Client..."
npx prisma generate

# 7. Push database schema
echo ""
echo "Pushing database schema..."
npx prisma db push

# 8. Seed database
echo ""
echo "Seeding database..."
npm run db:seed || echo "Seed script not found or failed, continuing..."

# 9. Build application
echo ""
echo "Building application..."
npm run build

echo ""
echo "=== Setup Complete ==="
echo "Start with: node server.js"
echo "Or use PM2: pm2 start server.js --name starfashion"
echo ""
echo "IMPORTANT: Save your .env file contents somewhere safe!"
cat .env
