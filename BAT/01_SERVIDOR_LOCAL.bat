@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "RAIZ=%~dp0.."
for %%I in ("%RAIZ%") do set "RAIZ=%%~fI"
cd /d "%RAIZ%" || (
  echo [ERRO] Nao foi possivel abrir a pasta do projeto.
  pause
  exit /b 1
)

cls
echo ============================================================
echo   DELIVERY HUB - SERVIDOR LOCAL COMPARTILHADO
echo ============================================================
echo.

where node >nul 2>nul || (
  echo [ERRO] Node.js nao encontrado.
  pause
  exit /b 1
)
where npm >nul 2>nul || (
  echo [ERRO] npm nao encontrado.
  pause
  exit /b 1
)

echo [0/2] Conferindo dependencias...
call "%~dp002_PREPARAR_AMBIENTE.bat" /interno
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel preparar o ambiente.
  pause
  exit /b 1
)

echo.
echo [REDE] Verificando regra do Firewall...
netsh advfirewall firewall show rule name="Delivery Hub - Porta 5173" | findstr /I /C:"Delivery Hub" >nul 2>nul
if errorlevel 1 (
  echo [ATENCAO] A porta 5173 ainda nao possui regra dedicada.
  echo           Se o celular nao abrir, execute:
  echo           BAT\04_CORRIGIR_ACESSO_CELULAR.bat
) else (
  echo [OK] Regra de Firewall encontrada.
)

set "DELIVERY_HUB_DISPLAY_IP="
for /f "tokens=4" %%I in ('route print -4 0.0.0.0 ^| findstr /R /C:"^[ ]*0\.0\.0\.0[ ]*0\.0\.0\.0"') do (
  if not defined DELIVERY_HUB_DISPLAY_IP set "DELIVERY_HUB_DISPLAY_IP=%%I"
)
if defined DELIVERY_HUB_DISPLAY_IP echo [REDE] IP preferencial: !DELIVERY_HUB_DISPLAY_IP!

echo.
echo [1/2] Gerando build...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] Build falhou.
  pause
  exit /b 1
)

echo.
echo [2/2] Iniciando servidor compartilhado...
echo.
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173'" >nul 2>nul
call npm run serve:shared
set "SAIDA=%ERRORLEVEL%"

echo.
echo Servidor encerrado. Codigo: %SAIDA%
pause
exit /b %SAIDA%
