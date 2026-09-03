@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_ANDROID.bat"

if not defined ADB_EXE (
  echo [ERRO] adb nao encontrado.
  pause
  exit /b 1
)

cls
echo ============================================================
echo  DELIVERY HUB - TESTAR SOMENTE ABERTURA
echo ============================================================
echo.
echo Este teste NAO envia tracking e NAO abre Activity interna.
echo Apenas pede ao Android para abrir o app pelo launcher.
echo.
echo 1 - Anjun
echo 2 - iMile
echo 3 - Cancelar
echo.
choice /C 123 /N /M "Escolha: "

if errorlevel 3 exit /b 0
if errorlevel 2 (
  set "PACOTE=com.imile.redelivery"
  set "NOME=iMile"
) else (
  set "PACOTE=com.anjun.supplierManagement"
  set "NOME=Anjun"
)

"%ADB_EXE%" shell pm path "%PACOTE%" 2>nul | findstr /I "package:" >nul
if errorlevel 1 (
  echo [ERRO] %NOME% nao esta instalado no aparelho.
  pause
  exit /b 1
)

echo.
echo Abrindo %NOME%...
"%ADB_EXE%" shell monkey -p "%PACOTE%" -c android.intent.category.LAUNCHER 1

echo.
echo Confira visualmente se o aplicativo correto abriu.
echo Nenhuma baixa foi enviada.
pause
