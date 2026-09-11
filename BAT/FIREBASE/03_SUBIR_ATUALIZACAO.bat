@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

if not exist "%PROJETO_ENV%" (
  echo [ERRO] Projeto Firebase nao configurado.
  echo Execute 01_CRIAR_E_CONFIGURAR.bat primeiro.
  pause
  exit /b 1
)

call "%RAIZ%\BAT\02_PREPARAR_AMBIENTE.bat" /interno
if errorlevel 1 (
  echo [ERRO] Dependencias do projeto nao foram preparadas.
  pause
  exit /b 1
)

call "%RAIZ%\BAT\FIREBASE\07_USAR_MODO_FIREBASE.bat" /silencioso
if errorlevel 1 exit /b 1

set "PROJECT_ID="
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJETO_ENV%") do (
  if /I "%%A"=="PROJECT_ID" set "PROJECT_ID=%%B"
)

pushd "%RAIZ%"
call npm run check
if errorlevel 1 (
  popd
  echo.
  echo [ERRO] Validacao falhou. Nada foi publicado.
  pause
  exit /b 1
)
popd

echo.
echo Publicando Authentication, regras Realtime e Hosting...
call "%FIREBASE_CMD%" deploy --only auth,database,hosting ^
  --config "%CONFIG_FIREBASE%" ^
  --project "%PROJECT_ID%"

if errorlevel 1 (
  echo.
  echo [ERRO] Deploy Firebase falhou.
  pause
  exit /b 1
)

echo.
echo [OK] Atualizacao publicada.
pause
