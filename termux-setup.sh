#!/data/data/com.termux/files/usr/bin/bash
# XLICON-V2-MD Termux Setup

echo ""
echo "=== XLICON Bot - Termux Setup ==="
echo ""

echo "[1/5] Installing packages..."
pkg update -y -q && pkg install -y -q nodejs git python make

echo "[2/5] Cloning repository..."
cd ~
if [ -d "XLICON-V2-MD" ]; then
  cd XLICON-V2-MD && git pull
else
  git clone https://github.com/legacyhood/XLICON-V2-MD.git && cd XLICON-V2-MD
fi

echo "[3/5] Installing npm packages (3-5 min)..."
npm install --omit=dev

echo "[4/5] Enabling wake lock..."
termux-wake-lock 2>/dev/null || true

echo "[5/5] Starting bot..."
echo ""
echo "=== Setup Done — QR code will appear below ==="
echo "Keep Termux open and phone plugged in!"
echo ""
node index.js
