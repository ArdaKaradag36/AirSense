@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
if not exist .env (
  echo Once 1-KURULUM.bat calistirin.
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
echo Sunucu: http://0.0.0.0:8000  -  [DEMO] SQLite modu aktif gormelisiniz.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
