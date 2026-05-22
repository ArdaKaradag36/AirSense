@echo off
chcp 65001 >nul
cd /d "%~dp0mobile-app"
if not exist .env (
  echo Once 1-KURULUM.bat calistirin.
  pause
  exit /b 1
)

echo ==============================================
echo   Expo - Telefonda uygulama
echo ==============================================
echo Telefon ve bilgisayar AYNI Wi-Fi.
echo.
echo ^>^>^> Expo hesap sorusu cikarsa:
echo ^>^>^>   Proceed anonymously secin (Enter)
echo ^>^>^> QR kodu Expo Go ile tarayin.
echo ==============================================
echo.

set EXPO_NO_TELEMETRY=1
call npx expo start -c
pause
