@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"
title Delivery Hub - Diagnostico real Anjun

cls
echo ============================================================
echo  DELIVERY HUB - DIAGNOSTICO CONTROLADO ANJUN NIVEL 1
echo ============================================================
echo.
echo O teste le uma etiqueta Anjun e registra somente Activities e respostas.
echo Nenhuma baixa, foto, assinatura ou tela interna sera automatizada.
echo.

if not defined ADB_EXE (
  echo [ERRO] adb.exe nao encontrado. Execute BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

"%ADB_EXE%" start-server >nul 2>nul
set "TMP=%TEMP%\deliveryhub-anjun-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP%" 2>&1
set "SERIAL="
set "CONTAGEM=0"
for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP%") do if /I "%%B"=="device" (
  set /a CONTAGEM+=1
  set "SERIAL=%%A"
)
del /q "%TMP%" >nul 2>nul

if not "%CONTAGEM%"=="1" (
  echo [ERRO] Conecte exatamente um celular autorizado. Detectados: %CONTAGEM%
  pause
  exit /b 1
)

"%ADB_EXE%" -s "%SERIAL%" shell pm path com.anjun.supplierManagement | findstr /I /B /C:"package:" >nul
if errorlevel 1 (
  echo [ERRO] Anjun nao encontrada: com.anjun.supplierManagement
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -File "%RAIZ%\scripts\powershell\android-diagnosticar-fluxo-anjun.ps1" ^
  -AdbPath "%ADB_EXE%" ^
  -Serial "%SERIAL%" ^
  -ProjectRoot "%RAIZ%"

if errorlevel 1 (
  echo [ERRO] O diagnostico nao foi concluido.
  pause
  exit /b 1
)
echo [OK] Diagnostico concluido.
pause
exit /b 0
