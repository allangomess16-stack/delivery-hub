@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

if not exist "%PROJETO_ENV%" (
  echo [ERRO] Projeto Firebase nao configurado.
  pause
  exit /b 1
)

set "PROJECT_ID="
set "DB_INSTANCE="
set "DB_URL="
set "WEB_APP_ID="
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJETO_ENV%") do (
  if /I "%%A"=="PROJECT_ID" set "PROJECT_ID=%%B"
  if /I "%%A"=="DATABASE_INSTANCE" set "DB_INSTANCE=%%B"
  if /I "%%A"=="DATABASE_URL" set "DB_URL=%%B"
  if /I "%%A"=="WEB_APP_ID" set "WEB_APP_ID=%%B"
)

set "SDK_RAW=%FIREBASE_DIR%\web-sdk-config.raw.json"
call "%FIREBASE_CMD%" apps:sdkconfig WEB "%WEB_APP_ID%" --project "%PROJECT_ID%" --json > "%SDK_RAW%"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel obter SDK config.
  pause
  exit /b 1
)

node "%RAIZ%\scripts\node\firebase-gerar-runtime-config.mjs" ^
  "%SDK_RAW%" ^
  "%RAIZ%\public\firebase-config.json" ^
  "%PROJECT_ID%" ^
  "%DB_INSTANCE%" ^
  "%DB_URL%"

if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo [OK] Modo Firebase ativado.
pause
