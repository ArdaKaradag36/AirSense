@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
if not exist .env (
  echo Once 1-KURULUM.bat calistirin.
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
echo Sanal sensor - Sunucu penceresi (1-KURULUM) acik olmali.
echo Her ~10 sn OK satiri gelmeli.
python test_device.py
pause
