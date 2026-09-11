@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"

cls
echo ============================================================
echo  DELIVERY HUB - TESTAR SOMENTE ABERTURA
echo ============================================================
echo.
echo Este teste NAO envia tracking e NAO confirma entrega.
echo O BAT abre explicitamente a Activity principal e verifica
echo qual pacote ficou em primeiro plano.
echo.

if not defined ADB_EXE (
  echo [ERRO] adb nao encontrado.
  echo Execute BAT\APK\00_PREPARAR_SDK_ANDROID.bat
  pause
  exit /b 1
)

set "TMP_DEVICES=%TEMP%\deliveryhub-devices-%RANDOM%.txt"
"%ADB_EXE%" devices > "%TMP_DEVICES%" 2>&1
set "SERIAL="
for /f "usebackq skip=1 tokens=1,2" %%A in ("%TMP_DEVICES%") do (
  if /I "%%B"=="device" if not defined SERIAL set "SERIAL=%%A"
)
del /q "%TMP_DEVICES%" >nul 2>nul

if not defined SERIAL (
  echo [ERRO] Nenhum celular autorizado foi encontrado.
  pause
  exit /b 1
)

echo 1 - Anjun
echo 2 - iMile
echo 3 - Cancelar
echo.
choice /C 123 /N /M "Escolha: "

if errorlevel 3 exit /b 0
if errorlevel 2 (
  set "PACOTE=com.imile.redelivery"
  set "COMPONENTE=com.imile.redelivery/.MainActivity"
  set "NOME=iMile"
) else (
  set "PACOTE=com.anjun.supplierManagement"
  set "COMPONENTE=com.anjun.supplierManagement/io.dcloud.uniapp.UniAppActivity"
  set "NOME=Anjun"
)

set "TMP_PKG=%TEMP%\deliveryhub-pkg-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell pm path "%PACOTE%" > "%TMP_PKG%" 2>nul
findstr /I /B /C:"package:" "%TMP_PKG%" >nul
del /q "%TMP_PKG%" >nul 2>nul

if errorlevel 1 (
  echo [ERRO] %NOME% nao esta instalado no aparelho.
  pause
  exit /b 1
)

echo.
echo Abrindo %NOME% explicitamente...
"%ADB_EXE%" -s "%SERIAL%" shell am start -W -n "%COMPONENTE%"
if errorlevel 1 (
  echo [ERRO] O Android recusou abrir %COMPONENTE%.
  pause
  exit /b 1
)

timeout /t 2 /nobreak >nul

set "TMP_FOCUS=%TEMP%\deliveryhub-focus-%RANDOM%.txt"
"%ADB_EXE%" -s "%SERIAL%" shell dumpsys activity activities > "%TMP_FOCUS%" 2>nul

echo.
echo Activity em primeiro plano:
findstr /I /C:"mResumedActivity" /C:"topResumedActivity" "%TMP_FOCUS%"

findstr /I /C:"%PACOTE%" "%TMP_FOCUS%" >nul
if errorlevel 1 (
  echo.
  echo [ATENCAO] O comando de abertura foi aceito, mas o pacote
  echo esperado nao apareceu no dump de Activities.
  echo Confira a tela do celular.
) else (
  echo.
  echo [OK] %NOME% identificado no estado de Activities do Android.
)

del /q "%TMP_FOCUS%" >nul 2>nul

echo.
echo Nenhuma baixa foi enviada.
pause
exit /b 0
