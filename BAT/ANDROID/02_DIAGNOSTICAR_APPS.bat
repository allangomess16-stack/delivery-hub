@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"

cls
echo ============================================================
echo  DELIVERY HUB - DIAGNOSTICO DOS APPS
echo ============================================================
echo.

if not defined ADB_EXE (
  echo [ERRO] adb nao encontrado.
  echo Instale Android Studio/Platform Tools ou adicione adb ao PATH.
  pause
  exit /b 1
)

"%ADB_EXE%" start-server >nul
"%ADB_EXE%" devices
echo.

for /f "skip=1 tokens=1,2" %%A in ('"%ADB_EXE%" devices') do (
  if "%%B"=="device" set "TEM_DEVICE=1"
)

if not defined TEM_DEVICE (
  echo [ERRO] Nenhum aparelho autorizado foi encontrado.
  echo Ative Depuracao USB e aceite a autorizacao no celular.
  pause
  exit /b 1
)

call :DIAGNOSTICAR "ANJUN" "com.anjun.supplierManagement"
call :DIAGNOSTICAR "IMILE" "com.imile.redelivery"

echo.
echo ============================================================
echo J&T continua aguardando o APK/package operacional correto.
echo ============================================================
pause
exit /b 0

:DIAGNOSTICAR
set "NOME=%~1"
set "PACOTE=%~2"

echo.
echo ------------------------------------------------------------
echo %NOME%
echo %PACOTE%
echo ------------------------------------------------------------

"%ADB_EXE%" shell pm path "%PACOTE%" 2>nul | findstr /I "package:" >nul
if errorlevel 1 (
  echo [NAO INSTALADO]
  goto :eof
)

echo [OK] INSTALADO
echo.

echo Versao:
"%ADB_EXE%" shell dumpsys package "%PACOTE%" | findstr /I /C:"versionName=" /C:"versionCode="

echo.
echo Activity resolvida pelo Android:
"%ADB_EXE%" shell cmd package resolve-activity --brief "%PACOTE%" 2>nul

echo.
echo Caminho APK:
"%ADB_EXE%" shell pm path "%PACOTE%"
goto :eof
