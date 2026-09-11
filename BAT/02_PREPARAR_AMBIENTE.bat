@echo off
setlocal EnableExtensions
set "RAIZ=%~dp0.."
for %%I in ("%RAIZ%") do set "RAIZ=%%~fI"
cd /d "%RAIZ%" || exit /b 1

set "MODO_INTERNO=0"
if /I "%~1"=="/interno" set "MODO_INTERNO=1"

if "%MODO_INTERNO%"=="0" cls
echo ============================================================
echo   DELIVERY HUB - PREPARAR AMBIENTE
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)

echo Node:
node --version
echo npm:
call npm --version
echo.

set "PRECISA_INSTALAR=0"
if not exist "%RAIZ%\node_modules\.bin\vite.cmd" set "PRECISA_INSTALAR=1"
if not exist "%RAIZ%\node_modules\@zxing\browser\package.json" set "PRECISA_INSTALAR=1"
if not exist "%RAIZ%\node_modules\@zxing\library\package.json" set "PRECISA_INSTALAR=1"
if not exist "%RAIZ%\node_modules\firebase\package.json" set "PRECISA_INSTALAR=1"
if not exist "%RAIZ%\node_modules\.bin\firebase.cmd" set "PRECISA_INSTALAR=1"

if "%PRECISA_INSTALAR%"=="0" (
  echo [OK] Dependencias necessarias ja estao instaladas.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 0
)

echo [INFO] Instalando/atualizando dependencias...
echo.
call npm install --include=dev
if errorlevel 1 (
  echo.
  echo [ERRO] npm nao conseguiu instalar as dependencias.
  echo Verifique internet, proxy/firewall e a versao do Node.js.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)

if not exist "%RAIZ%\node_modules\.bin\vite.cmd" (
  echo [ERRO] Vite nao foi encontrado apos a instalacao.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)
if not exist "%RAIZ%\node_modules\@zxing\browser\package.json" (
  echo [ERRO] @zxing/browser nao foi encontrado apos a instalacao.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)
if not exist "%RAIZ%\node_modules\@zxing\library\package.json" (
  echo [ERRO] @zxing/library nao foi encontrado apos a instalacao.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)
if not exist "%RAIZ%\node_modules\firebase\package.json" (
  echo [ERRO] Firebase SDK nao foi encontrado apos a instalacao.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)
if not exist "%RAIZ%\node_modules\.bin\firebase.cmd" (
  echo [ERRO] Firebase CLI local nao foi encontrada apos a instalacao.
  if "%MODO_INTERNO%"=="0" pause
  exit /b 1
)

echo.
echo [OK] Ambiente preparado.
if "%MODO_INTERNO%"=="0" pause
exit /b 0
