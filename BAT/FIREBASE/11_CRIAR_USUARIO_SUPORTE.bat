@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

if not exist "%PROJETO_ENV%" (
  echo [ERRO] Firebase ainda nao foi configurado.
  echo Execute primeiro BAT\FIREBASE\01_CRIAR_E_CONFIGURAR.bat.
  pause
  exit /b 1
)

call "%RAIZ%\BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat" /silencioso
if errorlevel 1 exit /b 1

set "PROJECT_ID="
set "DB_INSTANCE="
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJETO_ENV%") do (
  if /I "%%A"=="PROJECT_ID" set "PROJECT_ID=%%B"
  if /I "%%A"=="DATABASE_INSTANCE" set "DB_INSTANCE=%%B"
)

if not defined PROJECT_ID (
  echo [ERRO] PROJECT_ID ausente.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ^
  "%RAIZ%\scripts\powershell\firebase-bootstrap-admin.ps1" ^
  -ConfigPath "%RAIZ%\public\firebase-config.json" ^
  -FirebaseCmd "%FIREBASE_CMD%" ^
  -ProjectId "%PROJECT_ID%" ^
  -DatabaseInstance "%DB_INSTANCE%" ^
  -PerfilTipo "SUPORTE"

if errorlevel 1 (
  echo.
  echo [ERRO] Usuario de suporte nao foi criado.
  pause
  exit /b 1
)

echo.
echo [OK] Use essa conta somente na pagina de suporte do Delivery Hub.
pause
