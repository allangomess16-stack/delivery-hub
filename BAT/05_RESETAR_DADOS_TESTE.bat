@echo off
setlocal EnableExtensions
cls
echo ============================================================
echo   DELIVERY HUB - RESETAR DADOS DE TESTE
echo ============================================================
echo.
echo Isto apaga perfis, contas e cargas do servidor local de teste.
echo Dados futuros do Firebase nao sao afetados.
echo.
choice /C SN /N /M "Continuar? [S/N]: "
if errorlevel 2 exit /b 0

set "PASTA_DADOS=%LOCALAPPDATA%\DeliveryHubDev"
if exist "%PASTA_DADOS%\storage.json" del /Q "%PASTA_DADOS%\storage.json"
if exist "%PASTA_DADOS%" rd "%PASTA_DADOS%" 2>nul

echo.
echo [OK] Dados locais de teste removidos.
echo Reinicie BAT\01_SERVIDOR_LOCAL.bat.
pause
