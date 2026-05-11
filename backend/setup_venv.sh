#!/usr/bin/env bash
# AirSense backend: Python sanal ortamı oluşturur, bağımlılıkları yükler.
# Kullanım:
#   ./setup_venv.sh          — sadece venv + pip install
#   ./setup_venv.sh run      — aynı + uvicorn’u başlatır (geliştirme sunucusu)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
VENV="$ROOT/.venv"

if [[ ! -d "$VENV" ]]; then
  echo "[AirSense] Sanal ortam oluşturuluyor: $VENV"
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"

python -m pip install --upgrade pip
pip install -r requirements.txt

if [[ "${1:-}" == "run" ]]; then
  echo "[AirSense] API: http://0.0.0.0:8000"
  exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
fi

echo "[AirSense] Hazır. Manuel çalıştırma:"
echo "  source $VENV/bin/activate"
echo "  cd $ROOT && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "Tek komut:"
echo "  $ROOT/setup_venv.sh run"
