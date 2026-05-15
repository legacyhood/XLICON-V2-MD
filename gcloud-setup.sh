#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  XLICON-V2-MD — Google Cloud Always Free Setup Script
#  Run on a fresh Debian/Ubuntu e2-micro VM
#  Usage: bash gcloud-setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   XLICON WhatsApp Bot — GCloud Setup  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. System update ─────────────────────────────────────────
echo "[1/7] Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl build-essential python3 make g++

# ── 2. Install Node.js 20 ────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - -qq
sudo apt-get install -y -qq nodejs
echo "  Node: $(node -v) | npm: $(npm -v)"

# ── 3. Install PM2 ───────────────────────────────────────────
echo "[3/7] Installing PM2 process manager..."
sudo npm install -g pm2 --quiet

# ── 4. Clone repo ────────────────────────────────────────────
echo "[4/7] Cloning bot repository..."
cd ~
if [ -d "XLICON-V2-MD" ]; then
  echo "  Repo exists — pulling latest..."
  cd XLICON-V2-MD && git pull
else
  git clone https://github.com/legacyhood/XLICON-V2-MD.git
  cd XLICON-V2-MD
fi

# ── 5. Install dependencies ───────────────────────────────────
echo "[5/7] Installing npm dependencies (takes 2-3 min)..."
npm install --omit=dev

# ── 6. Create .env ───────────────────────────────────────────
echo "[6/7] Setting up environment variables..."
if [ ! -f ".env" ]; then
  echo ""
  echo "Enter your config values (paste and press Enter):"
  echo ""
  read -p "  MongoDB URI: " MONGODB_URI
  read -p "  GROQ API Key: " GROQ_API_KEY
  read -p "  Owner WhatsApp number (digits only, e.g. 2348038280548): " OWNER_NUMBER
  BOT_PREFIX="."
  PORT="3000"

  cat > .env << ENVEOF
MONGODB_URI=${MONGODB_URI}
GROQ_API_KEY=${GROQ_API_KEY}
BOT_PREFIX=${BOT_PREFIX}
PORT=${PORT}
OWNER_NUMBER=${OWNER_NUMBER}
ENVEOF
  echo "  .env saved."
else
  echo "  .env already exists — skipping."
fi

# ── 7. Start with PM2 ────────────────────────────────────────
echo "[7/7] Starting bot with PM2..."
pm2 delete xlicon 2>/dev/null || true
pm2 start index.js --name xlicon --restart-delay=5000 --max-restarts=10
pm2 save

# Auto-start on reboot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME | grep "sudo" | sudo bash -

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        ✅  Setup Complete!            ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Scan QR code to link WhatsApp:"
echo "  pm2 logs xlicon"
echo ""
echo "Other commands:"
echo "  pm2 status           — bot status"
echo "  pm2 restart xlicon   — restart"
echo "  pm2 stop xlicon      — stop"
echo ""
echo "Update bot anytime:"
echo "  cd ~/XLICON-V2-MD && git pull && npm install --omit=dev && pm2 restart xlicon"
