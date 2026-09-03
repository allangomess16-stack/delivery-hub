@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 exit /b 1

if not exist "%RAIZ%\public" mkdir "%RAIZ%\public"

(
  echo {
  echo   "habilitado": false
  echo }
) > "%RAIZ%\public\firebase-config.json"

echo [OK] Modo local ativado.
echo O BAT\01_SERVIDOR_LOCAL.bat voltara a usar o servidor local de desenvolvimento.
pause
