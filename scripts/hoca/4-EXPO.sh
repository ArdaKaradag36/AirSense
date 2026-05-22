#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/mobile-app"

if [[ ! -f .env ]]; then
  echo "Önce bir kez: cd $ROOT && ./1-KURULUM.sh"
  exit 1
fi

echo "=============================================="
echo "  Expo — Telefonda uygulama"
echo "=============================================="
echo "Telefon ve bilgisayar AYNI Wi-Fi'de olmalı."
grep EXPO_PUBLIC_API_BASE_URL .env || true
echo ""
echo ">>> Expo hesap / giriş sorusu çıkarsa:"
echo ">>>   'Proceed anonymously' seçin (genelde Enter yeterli)"
echo ">>> QR kodu Expo Go ile tarayın."
echo "=============================================="
echo ""

export EXPO_NO_TELEMETRY=1
exec npx expo start -c
