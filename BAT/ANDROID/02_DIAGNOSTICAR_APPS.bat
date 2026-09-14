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
  echo.
  echo Execute primeiro:
  echo BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

echo [OK] ADB:
echo %ADB_EXE%
if defined SDK_REUTILIZADO (
  echo [INFO] SDK reutilizado de outra versao:
  echo %SDK_REUTILIZADO%
)
echo.

"%ADB_EXE%" start-server >nul 2>nul

set "TMP_DEVICES=%TEMP%\deliveryhub-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>&1

type "%TMP_DEVICES%"
echo.

set "SERIAL="
set "TEM_UNAUTHORIZED="
set "TEM_OFFLINE="

for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP_DEVICES%") do (
  if /I "%%B"=="device" if not defined SERIAL set "SERIAL=%%A"
  if /I "%%B"=="unauthorized" set "TEM_UNAUTHORIZED=1"
  if /I "%%B"=="offline" set "TEM_OFFLINE=1"
)

del /q "%TMP_DEVICES%" >nul 2>nul

if not defined SERIAL (
  if defined TEM_UNAUTHORIZED (
    echo [ATENCAO] O celular foi encontrado, mas ainda nao autorizou este computador.
    echo Desbloqueie a tela e aceite "Permitir depuracao USB?".
    pause
    exit /b 2
  )

  if defined TEM_OFFLINE (
    echo [ATENCAO] O aparelho apareceu como OFFLINE.
    echo Desconecte e reconecte o cabo USB.
    pause
    exit /b 3
  )

  echo [ERRO] Nenhum aparelho autorizado foi encontrado.
  pause
  exit /b 1
)

echo [OK] Aparelho autorizado via ADB.
echo Serial: %SERIAL%

call :DIAGNOSTICAR "ANJUN" "com.anjun.supplierManagement"
call :DIAGNOSTICAR "IMILE" "com.imile.redelivery"

echo.
echo ============================================================
echo J^&T continua aguardando o APK/package operacional correto.
echo ============================================================
echo.
echo Para mapear a tela de scanner da iMile:
echo BAT\ANDROID\05_MAPEAR_IMILE_SCANNER.bat
echo.
pause
exit /b 0

:DIAGNOSTICAR
set "NOME=%~1"
set "PACOTE=%~2"
set "TMP_PKG=%TEMP%\deliveryhub-pkg-%RANDOM%.txt"

echo.
echo ------------------------------------------------------------
echo %NOME%
echo %PACOTE%
echo ------------------------------------------------------------

"%ADB_EXE%" -s "%SERIAL%" shell pm path "%PACOTE%" > "%TMP_PKG%" 2>nul
findstr /I /B /C:"package:" "%TMP_PKG%" >nul
if errorlevel 1 (
  echo [NAO INSTALADO]
  del /q "%TMP_PKG%" >nul 2>nul
  goto :eof
)

echo [OK] INSTALADO
echo.

echo Versao:
"%ADB_EXE%" -s "%SERIAL%" shell dumpsys package "%PACOTE%" | findstr /I /C:"versionName=" /C:"versionCode="

echo.
echo Activity resolvida pelo Android:
"%ADB_EXE%" -s "%SERIAL%" shell cmd package resolve-activity --brief ^
  -a android.intent.action.MAIN ^
  -c android.intent.category.LAUNCHER ^
  "%PACOTE%" 2>nul

echo.
echo Caminho APK:
type "%TMP_PKG%"
del /q "%TMP_PKG%" >nul 2>nul
goto :eof
