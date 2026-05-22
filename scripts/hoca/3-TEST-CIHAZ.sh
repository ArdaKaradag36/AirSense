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

echo "Sanal sensör — Sunucu ./1-KURULUM.sh ile arka planda başlatılmış olmalı."
echo "Her ~10 sn 'OK:' satırı gelmeli. Kapatmak: Ctrl+C"
echo ""

exec python3 test_device.py
