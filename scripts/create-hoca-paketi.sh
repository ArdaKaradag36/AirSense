#!/usr/bin/env bash
# AirSense — hocaya gonderilecek zip paketi (gizli dosyalar haric)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d)"
OUT_NAME="AirSense-hoca-demo-${STAMP}.zip"
OUT_PATH="${ROOT}/${OUT_NAME}"

echo "[AirSense] Zip olusturuluyor: ${OUT_PATH}"

zip -r "$OUT_PATH" . \
  -x "*.git/*" \
  -x "*/.git/*" \
  -x "READMEFOLDER/*" \
  -x "*/READMEFOLDER/*" \
  -x "backend/.venv/*" \
  -x "backend/data/*" \
  -x "mobile-app/node_modules/*" \
  -x "*/node_modules/*" \
  -x "*/__pycache__/*" \
  -x "*.pyc" \
  -x "backend/.env" \
  -x "backend/.env.*" \
  -x "mobile-app/.env" \
  -x "mobile-app/.env.*" \
  -x "HOCA_ENV.txt" \
  -x ".env.hoca" \
  -x "backend/arda.txt" \
  -x "*.zip" \
  -x ".cursor/*" \
  -x "*/.cursor/*" \
  -x ".vscode/*" \
  -x "*/.vscode/*" \
  -x "hardware/.pio/*" \
  -x "*/.pio/*"

echo "[AirSense] Tamam: ${OUT_PATH}"
echo "[AirSense] Boyut: $(du -h "$OUT_PATH" | cut -f1)"
echo ""
echo "Kontrol listesi:"
echo "  - Zip icinde .env dosyasi OLMAMALI"
echo "  - Gercek Supabase anahtarlari ayri kanaldan (HOCA_ENV.txt) gonderilmeli"
echo "  - Hoca once README.md, sonra SECTORALPROJE.md okuyarak baslasin"
