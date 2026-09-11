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

call "%RAIZ%\BAT\02_PREPARAR_AMBIENTE.bat" /interno
if errorlevel 1 (
  echo [ERRO] Dependencias do projeto nao foram preparadas.
  pause
  exit /b 1
)

set "FALHOU=0"
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
call "%FIREBASE_CMD%" --version
if errorlevel 1 set "FALHOU=1"

echo.
echo [2] Projeto
call "%FIREBASE_CMD%" projects:list | findstr /I /C:"!PROJECT_ID!" >nul
if errorlevel 1 (
  echo [ERRO] Projeto nao apareceu na conta Firebase ativa.
  set "FALHOU=1"
) else (
  echo [OK] Projeto acessivel.
)

echo.
echo [3] Realtime Database
call "%FIREBASE_CMD%" database:instances:list --project "!PROJECT_ID!" | findstr /I /C:"!DB_INSTANCE!" >nul
if errorlevel 1 (
  echo [ERRO] Instancia Realtime nao encontrada.
  set "FALHOU=1"
) else (
  echo [OK] Realtime Database encontrado.
)

echo.
echo [4] App Web
call "%FIREBASE_CMD%" apps:list WEB --project "!PROJECT_ID!" | findstr /I /C:"!WEB_APP_ID!" >nul
if errorlevel 1 (
  echo [ERRO] App ID nao apareceu na conta Firebase ativa.
  set "FALHOU=1"
) else (
  echo [OK] App Web encontrado.
)

echo.
echo [5] Runtime config
if exist "%RAIZ%\public\firebase-config.json" (
  node "%RAIZ%\scripts\node\firebase-validar-runtime-config.mjs" "%RAIZ%\public\firebase-config.json"
  if errorlevel 1 set "FALHOU=1"
) else (
  echo [ERRO] public\firebase-config.json ausente.
  set "FALHOU=1"
)

echo.
echo [6] Arquivos de deploy
if not exist "%CONFIG_FIREBASE%" (
  echo [ERRO] firebase.json da raiz ausente.
  set "FALHOU=1"
) else if not exist "%FIREBASE_DIR%\database.rules.json" (
  echo [ERRO] firebase\database.rules.json ausente.
  set "FALHOU=1"
) else (
  echo [OK] Configuracao e regras encontradas sem caminho duplicado.
)

echo.
echo [7] Build
pushd "%RAIZ%"
call npm run build
set "RET_BUILD=!ERRORLEVEL!"
popd
if "!RET_BUILD!"=="0" (
  echo [OK] Build concluido.
) else (
  echo [ERRO] Build falhou.
  set "FALHOU=1"
)

echo.
echo ============================================================
if "!FALHOU!"=="0" (
  echo [OK] CONFIGURACAO FIREBASE VALIDADA
) else (
  echo [ERRO] VALIDACAO FIREBASE INCOMPLETA
)
echo ============================================================
pause
exit /b !FALHOU!
