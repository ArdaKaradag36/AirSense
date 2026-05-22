@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==============================================
echo   AirSense - Kurulum (Windows)
echo ==============================================

if not exist "backend\demo.env.example" (
  echo HATA: backend\demo.env.example yok. Dogru klasorde misiniz?
  pause
  exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
  echo HATA: Python yok. https://www.python.org/downloads/
  echo Kurulumda "Add Python to PATH" isaretleyin.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo HATA: Node.js / npm yok. https://nodejs.org/
  pause
  exit /b 1
)

echo.
echo [1/4] Ortam dosyalari...
copy /Y backend\demo.env.example backend\.env >nul
copy /Y mobile-app\demo.env.example mobile-app\.env >nul

echo [2/4] Wi-Fi IP (mobil .env)...
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command ^
  "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.InterfaceAlias -match 'Wi-Fi|WLAN|Wireless' -and $_.IPAddress -notlike '169.*' } ^| Select-Object -First 1 -ExpandProperty IPAddress)"`) do set LAN_IP=%%I
if not defined LAN_IP for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set "LAN_IP=%%a"
  goto :gotip
)
:gotip
if defined LAN_IP (
  set "LAN_IP=%LAN_IP: =%"
  echo Bilgisayar IP: %LAN_IP%
  powershell -NoProfile -Command "(Get-Content 'mobile-app\.env') -replace 'EXPO_PUBLIC_API_BASE_URL=.*', 'EXPO_PUBLIC_API_BASE_URL=http://%LAN_IP%:8000' | Set-Content 'mobile-app\.env'"
) else (
  echo UYARI: IP bulunamadi. mobile-app\.env icinde IP'yi elle duzenleyin.
)

echo [3/4] Python sanal ortami...
cd backend
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip -q
pip install -r requirements.txt -q
cd ..

echo [4/4] Mobil paketler (npm install)...
cd mobile-app
call npm install
cd ..

echo.
echo [5/5] Sunucu yeni pencerede baslatiliyor...
start "AirSense Sunucu" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo ==============================================
echo   Kurulum BITTI - Sunucu ayri pencerede acik
echo ==============================================
echo Simdi 2 ayri terminal / pencere acin:
echo.
echo   Pencere A:  3-TEST-CIHAZ.bat
echo   Pencere B:  4-EXPO.bat
echo.
echo Expo sorarsa: Proceed anonymously (Enter)
echo Kurulum: README-ZIP.md  ^|  Ayrinti: SECTORALPROJE.md
echo.
pause
