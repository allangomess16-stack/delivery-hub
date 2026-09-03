@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

cls
echo ============================================================
echo  DELIVERY HUB - VALIDAR FIREBASE
echo ============================================================
echo.

if not exist "%PROJETO_ENV%" (
  echo [ERRO] firebase\projeto.local.env nao existe.
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

echo Projeto:  !PROJECT_ID!
echo Database: !DB_INSTANCE!
echo Web App:  !WEB_APP_ID!
echo.

echo [1] Firebase CLI
if not exist "%FIREBASE_CMD%" (
  echo [ERRO] Firebase CLI local nao encontrada.
) else (
  call "%FIREBASE_CMD%" --version
)

echo.
echo [2] Projeto
call "%FIREBASE_CMD%" projects:list | findstr /I /C:"!PROJECT_ID!" >nul
if errorlevel 1 (
  echo [ERRO] Projeto nao apareceu na conta Firebase ativa.
) else (
  echo [OK] Projeto acessivel.
)

echo.
echo [3] Realtime Database
call "%FIREBASE_CMD%" database:instances:list --project "!PROJECT_ID!" | findstr /I /C:"!DB_INSTANCE!" >nul
if errorlevel 1 (
  echo [ERRO] Instancia Realtime nao encontrada.
) else (
  echo [OK] Realtime Database encontrado.
)

echo.
echo [4] App Web
call "%FIREBASE_CMD%" apps:list WEB --project "!PROJECT_ID!" | findstr /I /C:"!WEB_APP_ID!" >nul
if errorlevel 1 (
  echo [ATENCAO] App ID nao apareceu na listagem textual.
) else (
  echo [OK] App Web encontrado.
)

echo.
echo [5] Runtime config
if exist "%RAIZ%\public\firebase-config.json" (
  echo [OK] public\firebase-config.json existe.
) else (
  echo [ERRO] public\firebase-config.json ausente.
)

echo.
echo [6] Build
pushd "%RAIZ%"
call npm run build
set "RET_BUILD=!ERRORLEVEL!"
popd
if "!RET_BUILD!"=="0" (
  echo [OK] Build concluido.
) else (
  echo [ERRO] Build falhou.
)

echo.
echo ============================================================
pause
