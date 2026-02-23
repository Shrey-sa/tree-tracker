#!/bin/bash
# ─────────────────────────────────────────────────
# Tree Tracker - EC2 First Time Setup Script
# Run this ONCE after SSHing into a fresh EC2 instance
# Usage: bash setup-ec2.sh
# ─────────────────────────────────────────────────

set -e

echo "🚀 Setting up EC2 for Tree Tracker..."

# 1. Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# 3. Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# 4. Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
echo "✅ Docker installed"

# 5. Install Git
sudo apt install -y git
echo "✅ Git installed"

# 6. Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/
echo "✅ AWS CLI installed"

echo ""
echo "✅ EC2 setup complete!"
echo ""
echo "Next steps:"
echo "1. Log out and SSH back in (for docker group to take effect)"
echo "2. Clone your repo: git clone https://github.com/YOUR/tree-tracker.git"
echo "3. cd tree-tracker"
echo "4. cp .env.prod.example .env.prod"
echo "5. nano .env.prod  (fill in your values)"
echo "6. docker compose -f docker-compose.prod.yml up --build -d"
