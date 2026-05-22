#!/usr/bin/env bash
# AirSense — hocaya gonderilecek zip (kucuk demo paketi, max sikistirma)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d)"
PKG_NAME="AirSense-hoca-demo-${STAMP}"
OUT_NAME="${PKG_NAME}.zip"
OUT_PATH="${ROOT}/${OUT_NAME}"

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

STAGING="${BUILD_DIR}/${PKG_NAME}"
mkdir -p "$STAGING"

echo "[AirSense] Demo paketi hazirlaniyor (sadece gerekli dosyalar): ${PKG_NAME}/"

# Hoca demo icin GEREKSIZ (buyuk / kullanilmayan) disarida birakilir:
rsync -a \
  --exclude='.git/' \
  --exclude='READMEFOLDER/' \
  --exclude='docs/' \
  --exclude='hardware/' \
  --exclude='supabase/' \
  --exclude='tests/' \
  --exclude='node_modules/' \
  --exclude='mobile-app/node_modules/' \
  --exclude='mobile-app/.expo/' \
  --exclude='backend/.venv/' \
  --exclude='backend/data/' \
  --exclude='backend/.env' \
  --exclude='backend/serial_dashboard.py' \
  --exclude='backend/usb_bridge.py' \
  --exclude='mobile-app/.env' \
  --exclude='backend/arda.txt' \
  --exclude='*.zip' \
  --exclude='.cursor/' \
  --exclude='.vscode/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='ngrok.exe' \
  --exclude='PROJE DÖKÜMANI AIRSENSE – AKILLI HAVA KALİTESİ İZLEME SİSTEM.pdf' \
  --exclude='/package.json' \
  --exclude='/package-lock.json' \
  --exclude='/tsconfig.json' \
  --exclude='/.expo/' \
  "$ROOT/" "$STAGING/"

echo "[AirSense] Baslatma scriptleri..."
for s in "$ROOT/scripts/hoca/"*.sh; do
  cp "$s" "$STAGING/$(basename "$s")"
  chmod +x "$STAGING/$(basename "$s")"
done
for s in "$ROOT/scripts/hoca/"*.bat; do
  cp "$s" "$STAGING/$(basename "$s")"
done

# Zip icinde hoca yalnizca README-ZIP + SECTORALPROJE okur (repo README.md geliştirici icin kalir)
cp -f "$ROOT/README-ZIP.md" "$STAGING/README-ZIP.md"
test -f "$ROOT/SECTORALPROJE.md" || { echo "HATA: SECTORALPROJE.md yok"; exit 1; }

if ! grep -q 'BASE_URL}/demo/history' "$STAGING/mobile-app/services/apiService.ts"; then
  echo "HATA: apiService.ts demo URL duzeltmesi eksik."
  exit 1
fi

UNCOMPRESSED=$(du -sb "$STAGING" | cut -f1)
echo "[AirSense] Paket icerigi (sikistirilmadan): $(du -sh "$STAGING" | cut -f1)"

cd "$BUILD_DIR"
# -9 = maksimum deflate; demo bozulmaz, sadece daha kucuk zip
zip -rq9 "$OUT_PATH" "$PKG_NAME"

echo "[AirSense] Zip: ${OUT_PATH}"
echo "[AirSense] Boyut: $(du -h "$OUT_PATH" | cut -f1) (sikistirma: zip -9)"
echo "  Haric: docs/, hardware/, supabase/, tests/, node_modules/, .expo cache"
echo ""
echo "Hoca: ./1-KURULUM.sh veya 1-KURULUM.bat  ->  ./3-TEST-CIHAZ  +  ./4-EXPO"
echo ""

ZIP_LIST="$(zipinfo -1 "$OUT_PATH")"
if echo "$ZIP_LIST" | grep -qE 'node_modules/|READMEFOLDER/|/docs/'; then
  echo "UYARI: Zip icinde istenmeyen dosya."
  exit 1
fi
for need in \
  "${PKG_NAME}/backend/demo.env.example" \
  "${PKG_NAME}/mobile-app/demo.env.example" \
  "${PKG_NAME}/1-KURULUM.sh" \
  "${PKG_NAME}/1-KURULUM.bat" \
  "${PKG_NAME}/README-ZIP.md" \
  "${PKG_NAME}/SECTORALPROJE.md"; do
  case "$ZIP_LIST" in
    *"$need"*) ;;
    *)
      echo "HATA: Zip icinde eksik: $need"
      exit 1
      ;;
  esac
done
echo "[AirSense] Zip kontrolu OK"
