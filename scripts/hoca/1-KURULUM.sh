#!/usr/bin/env bash
# AirSense — Hoca demo: kurulum + sunucuyu arka planda baslat
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"
if [[ ! -d "$ROOT/backend" || ! -d "$ROOT/mobile-app" ]]; then
  for sub in "$ROOT"/AirSense-hoca-demo-*; do
    if [[ -d "$sub/backend" && -d "$sub/mobile-app" ]]; then
      ROOT="$sub"
      break
    fi
  done
fi
if [[ ! -d "$ROOT/backend" || ! -d "$ROOT/mobile-app" ]]; then
  echo "HATA: Proje kökü bulunamadı (backend/ ve mobile-app/ yok)."
  echo "Zip'i açın: cd AirSense-hoca-demo-YYYYMMDD"
  exit 1
fi
cd "$ROOT"

PID_FILE="$ROOT/.hoca-sunucu.pid"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

echo "=============================================="
echo "  AirSense — Kurulum (Linux)"
echo "  Proje: $ROOT"
echo "=============================================="

if ! command -v python3 >/dev/null 2>&1; then
  echo "HATA: python3 yok. https://www.python.org/downloads/"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "HATA: npm yok. https://nodejs.org/"
  exit 1
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -z "$IP" ]]; then
  IP="127.0.0.1"
  echo "UYARI: Wi-Fi IP bulunamadı; 127.0.0.1 (telefon bağlanmayabilir)."
else
  echo "Bilgisayar IP (telefon): $IP"
fi

cp -f backend/demo.env.example backend/.env
cp -f mobile-app/demo.env.example mobile-app/.env
sed -i "s|EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=http://${IP}:8000|" mobile-app/.env

echo ""
echo "[1/3] Python sanal ortamı..."
(cd backend && chmod +x setup_venv.sh && ./setup_venv.sh)

echo ""
echo "[2/3] Mobil paketler (npm install)..."
(cd mobile-app && npm install)

echo ""
echo "[3/3] Sunucu arka planda başlatılıyor..."
if [[ -f "$PID_FILE" ]]; then
  old_pid=$(cat "$PID_FILE" 2>/dev/null || true)
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "Eski sunucu zaten çalışıyor (PID $old_pid). Atlanıyor."
  else
    rm -f "$PID_FILE"
  fi
fi

if [[ ! -f "$PID_FILE" ]]; then
  # shellcheck source=/dev/null
  (
    cd "$ROOT/backend"
    source .venv/bin/activate
    exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ) >>"$LOG_DIR/sunucu.log" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 2
  if curl -sf "http://127.0.0.1:8000/docs" >/dev/null 2>&1; then
    echo "Sunucu OK — PID $(cat "$PID_FILE"), log: logs/sunucu.log"
    echo "Logda '[DEMO] SQLite modu aktif' görmelisiniz."
  else
    echo "UYARI: Sunucu henüz yanıt vermedi. Log: tail -f logs/sunucu.log"
  fi
fi

echo ""
echo "=============================================="
echo "  Kurulum BİTTİ — Sunucu çalışıyor"
echo "=============================================="
echo "Şimdi 2 ayrı terminal açın (bu klasörde):"
echo ""
echo "  Terminal A:  ./3-TEST-CIHAZ.sh"
echo "  Terminal B:  ./4-EXPO.sh"
echo "               (Expo sorarsa: Enter = Proceed anonymously)"
echo ""
echo "Sunucuyu durdurmak: ./SUNUCU-DURDUR.sh"
echo "Windows: 1-KURULUM.bat kullanın (README)"
echo "Kurulum: README-ZIP.md  |  Ayrinti: SECTORALPROJE.md"
