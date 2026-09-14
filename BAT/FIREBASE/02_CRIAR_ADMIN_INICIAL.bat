@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

if not exist "%PROJETO_ENV%" (
  echo [ERRO] Firebase ainda nao foi configurado.
  echo Execute primeiro:
  echo BAT\FIREBASE\01_CRIAR_E_CONFIGURAR.bat
  pause
  exit /b 1
)

call "%RAIZ%\BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat" /silencioso
if errorlevel 1 exit /b 1

node "%RAIZ%\scripts\node\firebase-validar-runtime-config.mjs" "%RAIZ%\public\firebase-config.json"
if errorlevel 1 (
  echo [ERRO] A configuracao Firebase nao contem firebase.apiKey.
  echo Execute BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat e tente novamente.
  pause
  exit /b 1
)

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

echo.
echo Verificando provedor Email/Senha...
call "%FIREBASE_CMD%" deploy --only auth --config "%CONFIG_FIREBASE%" --project "%PROJECT_ID%"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel ativar o Firebase Authentication.
  echo Abra o Console Firebase, ative Email/Senha e execute este BAT novamente.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ^
  "%RAIZ%\scripts\powershell\firebase-bootstrap-admin.ps1" ^
  -ConfigPath "%RAIZ%\public\firebase-config.json" ^
  -FirebaseCmd "%FIREBASE_CMD%" ^
  -ProjectId "%PROJECT_ID%" ^
  -DatabaseInstance "%DB_INSTANCE%"

if errorlevel 1 (
  echo.
  echo [ERRO] Administrador inicial nao foi criado.
  pause
  exit /b 1
)

echo.
echo [OK] Use esse email/senha na tela de login do Delivery Hub.
pause
