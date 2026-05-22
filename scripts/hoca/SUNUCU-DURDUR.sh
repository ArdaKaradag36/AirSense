#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT/.hoca-sunucu.pid"
if [[ ! -f "$PID_FILE" ]]; then
  echo "Sunucu PID dosyası yok (kurulum script çalıştırılmamış olabilir)."
  exit 0
fi
PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID" 2>/dev/null || true
  sleep 1
  kill -9 "$PID" 2>/dev/null || true
  echo "Sunucu durduruldu (PID $PID)."
else
  echo "Sunucu zaten kapalı."
fi
rm -f "$PID_FILE"
