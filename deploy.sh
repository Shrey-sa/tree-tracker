#!/bin/bash
# ─────────────────────────────────────────────────
# Tree Tracker - EC2 Deployment Script
# Run this on your EC2 instance after first setup
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────

set -e  # Stop on any error

echo "🌳 Tree Tracker Deployment Starting..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Rebuild and restart containers
echo "🐳 Rebuilding Docker containers..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d

# Wait for backend to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment complete!"
echo "🌐 Backend API: http://$(curl -s ifconfig.me)/api/"
echo "🔧 Admin Panel: http://$(curl -s ifconfig.me)/admin/"
