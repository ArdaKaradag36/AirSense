#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/backend"

if [[ ! -f .env ]]; then
  echo "Önce bir kez: cd $ROOT && ./1-KURULUM.sh"
  exit 1
fi
if [[ ! -d .venv ]]; then
  echo "Önce bir kez: cd $ROOT && ./1-KURULUM.sh"
  exit 1
fi

# shellcheck source=/dev/null
source .venv/bin/activate

echo "Sunucu başlıyor: http://0.0.0.0:8000"
echo "Şunu görmelisiniz: [DEMO] SQLite modu aktif"
echo "Kapatmak: Ctrl+C"
echo ""

exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
