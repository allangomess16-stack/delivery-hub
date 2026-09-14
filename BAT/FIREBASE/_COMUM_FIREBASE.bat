@echo off
if defined DELIVERY_HUB_FIREBASE_COMUM exit /b 0
set "DELIVERY_HUB_FIREBASE_COMUM=1"

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
set "FIREBASE_DIR=%RAIZ%\firebase"
set "CONFIG_FIREBASE=%RAIZ%\firebase.json"
set "PROJETO_ENV=%FIREBASE_DIR%\projeto.local.env"
set "FIREBASE_CMD=%RAIZ%\node_modules\.bin\firebase.cmd"

if not exist "%RAIZ%\package.json" (
  echo [ERRO] package.json nao encontrado em:
  echo %RAIZ%
  exit /b 1
)

exit /b 0
