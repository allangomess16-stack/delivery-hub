@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"
title Delivery Hub - Diagnostico real iMile

cls
echo ============================================================
echo  DELIVERY HUB - DIAGNOSTICO CONTROLADO IMILE
echo ============================================================
echo.
echo Este teste acompanha uma encomenda real sem executar a baixa.
echo Ele registra apenas versoes, Activities, transicoes e erros Android.
echo Tracking e outros codigos longos sao mascarados no relatorio.
echo.
echo REGRA: pare na tela de consulta da iMile.
echo NAO confirme entrega, POD, foto ou assinatura durante o diagnostico.
echo.

if not defined ADB_EXE (
  echo [ERRO] adb.exe nao encontrado.
  echo Execute primeiro BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

"%ADB_EXE%" start-server >nul 2>nul

set "TMP_DEVICES=%TEMP%\deliveryhub-imile-real-devices-%RANDOM%.txt"
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

set "TMP_PACKAGE=%TEMP%\deliveryhub-imile-real-package-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell pm path com.imile.redelivery > "%TMP_PACKAGE%" 2>nul
findstr /I /B /C:"package:" "%TMP_PACKAGE%" >nul
if errorlevel 1 (
  del /q "%TMP_PACKAGE%" >nul 2>nul
  echo [ERRO] iMile nao encontrada: com.imile.redelivery
  pause
  exit /b 1
)
del /q "%TMP_PACKAGE%" >nul 2>nul

echo [OK] Celular e iMile detectados.
echo [INFO] Nenhum aplicativo sera desinstalado ou tera dados apagados.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -File "%RAIZ%\scripts\powershell\android-diagnosticar-fluxo-imile.ps1" ^
  -AdbPath "%ADB_EXE%" ^
  -Serial "%SERIAL%" ^
  -ProjectRoot "%RAIZ%"

if errorlevel 1 (
  echo.
  echo [ERRO] O diagnostico nao foi concluido.
  pause
  exit /b 1
)

echo.
echo [OK] Diagnostico concluido.
pause
exit /b 0
