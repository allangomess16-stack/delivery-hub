@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"
title Delivery Hub - Sessao exploratoria iMile

cls
echo ============================================================
echo  DELIVERY HUB - GRAVAR SESSAO EXPLORATORIA IMILE
echo ============================================================
echo.
echo Captura por ate 3 minutos:
echo - video da tela e dos movimentos;
echo - transicoes entre telas/Activities;
echo - Logcat Android filtrado;
echo - versoes instaladas e estado inicial/final.
echo.
echo ATENCAO: o video pode mostrar tracking, nomes e enderecos.
echo Feche notificacoes e nao abra senha, documento, foto ou assinatura.
echo Nenhum clique sera automatizado pelo computador.
echo.

if not defined ADB_EXE (
  echo [ERRO] adb.exe nao encontrado.
  echo Execute primeiro BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

"%ADB_EXE%" start-server >nul 2>nul
set "TMP_DEVICES=%TEMP%\deliveryhub-imile-session-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>&1

set "SERIAL="
set "DEVICE_COUNT=0"
set "TEM_UNAUTHORIZED="
for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP_DEVICES%") do (
  if /I "%%B"=="device" (
    set /a DEVICE_COUNT+=1
    set "SERIAL=%%A"
  )
  if /I "%%B"=="unauthorized" set "TEM_UNAUTHORIZED=1"
)
del /q "%TMP_DEVICES%" >nul 2>nul

if defined TEM_UNAUTHORIZED (
  echo [ERRO] Autorize a depuracao USB na tela do celular.
  pause
  exit /b 2
)

if not "%DEVICE_COUNT%"=="1" (
  echo [ERRO] Conecte exatamente um celular autorizado. Detectados: %DEVICE_COUNT%
  pause
  exit /b 1
)

set "TMP_PACKAGE=%TEMP%\deliveryhub-imile-session-package-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell pm path com.imile.redelivery > "%TMP_PACKAGE%" 2>nul
findstr /I /B /C:"package:" "%TMP_PACKAGE%" >nul
if errorlevel 1 (
  del /q "%TMP_PACKAGE%" >nul 2>nul
  echo [ERRO] iMile nao encontrada: com.imile.redelivery
  pause
  exit /b 1
)
del /q "%TMP_PACKAGE%" >nul 2>nul

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -File "%RAIZ%\scripts\powershell\android-gravar-sessao-imile.ps1" ^
  -AdbPath "%ADB_EXE%" ^
  -Serial "%SERIAL%" ^
  -ProjectRoot "%RAIZ%"

if errorlevel 1 (
  echo.
  echo [ERRO] A sessao nao foi concluida.
  pause
  exit /b 1
)

echo.
echo [OK] Sessao registrada.
pause
exit /b 0
