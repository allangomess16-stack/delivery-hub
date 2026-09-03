@echo off
setlocal EnableExtensions EnableDelayedExpansion
call "%~dp0_COMUM_ANDROID.bat"

if not defined ADB_EXE (
  echo [ERRO] adb nao encontrado.
  pause
  exit /b 1
)

cls
echo ============================================================
echo  DELIVERY HUB - EXTRAIR APK INSTALADO
echo ============================================================
echo.
echo 1 - Anjun
echo 2 - iMile
echo 3 - Informar package manualmente
echo 4 - Cancelar
echo.
choice /C 1234 /N /M "Escolha: "

if errorlevel 4 exit /b 0
if errorlevel 3 (
  set /p "PACOTE=Package Android: "
  set "NOME=APP"
) else if errorlevel 2 (
  set "PACOTE=com.imile.redelivery"
  set "NOME=IMILE"
) else (
  set "PACOTE=com.anjun.supplierManagement"
  set "NOME=ANJUN"
)

if not defined PACOTE exit /b 1

set "SAIDA=%RAIZ%\diagnosticos-apk"
if not exist "%SAIDA%" mkdir "%SAIDA%"

set "CAMINHO="
for /f "tokens=2 delims=:" %%P in ('"%ADB_EXE%" shell pm path "%PACOTE%" 2^>nul ^| findstr /I "base.apk"') do (
  set "CAMINHO=%%P"
)

if not defined CAMINHO (
  for /f "tokens=2 delims=:" %%P in ('"%ADB_EXE%" shell pm path "%PACOTE%" 2^>nul ^| findstr /I "package:"') do (
    if not defined CAMINHO set "CAMINHO=%%P"
  )
)

if not defined CAMINHO (
  echo [ERRO] APK nao localizado para %PACOTE%.
  pause
  exit /b 1
)

set "ARQUIVO=%SAIDA%\%NOME%_instalado_base.apk"
echo.
echo Extraindo:
echo %CAMINHO%
echo para:
echo %ARQUIVO%
echo.

"%ADB_EXE%" pull "%CAMINHO%" "%ARQUIVO%"
if errorlevel 1 (
  echo [ERRO] Extracao falhou.
  pause
  exit /b 1
)

echo.
echo [OK] APK extraido.
echo A pasta diagnosticos-apk esta ignorada pelo Git.
pause
