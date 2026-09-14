@echo off
if defined DELIVERY_HUB_ANDROID_COMUM exit /b 0
set "DELIVERY_HUB_ANDROID_COMUM=1"

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
for %%I in ("%RAIZ%\..") do set "PAI_PROJETO=%%~fI"
for %%I in ("%PAI_PROJETO%\..") do set "PAI_GERAL=%%~fI"

set "FERRAMENTAS=%RAIZ%\.ferramentas"
set "SDK_LOCAL=%FERRAMENTAS%\android-sdk"
set "ENV_ANDROID=%FERRAMENTAS%\android-local.env"

if exist "%ENV_ANDROID%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_ANDROID%") do (
    if /I "%%A"=="ANDROID_HOME" set "ANDROID_HOME=%%B"
    if /I "%%A"=="ANDROID_SDK_ROOT" set "ANDROID_SDK_ROOT=%%B"
    if /I "%%A"=="JAVA_HOME" set "JAVA_HOME=%%B"
    if /I "%%A"=="ADB_EXE" set "ADB_EXE=%%B"
  )
)

if defined ADB_EXE if not exist "%ADB_EXE%" if /I not "%ADB_EXE%"=="adb.exe" set "ADB_EXE="

if not defined ADB_EXE if exist "%SDK_LOCAL%\platform-tools\adb.exe" (
  set "ADB_EXE=%SDK_LOCAL%\platform-tools\adb.exe"
)

if not defined ADB_EXE (
  where adb.exe >nul 2>nul
  if not errorlevel 1 set "ADB_EXE=adb.exe"
)

if not defined ADB_EXE if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
  set "ADB_EXE=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)

if not defined ADB_EXE if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
  set "ADB_EXE=%ANDROID_HOME%\platform-tools\adb.exe"
)

if not defined ADB_EXE if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
  set "ADB_EXE=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
)

rem Versoes extraidas diretamente lado a lado.
if not defined ADB_EXE (
  for /d %%D in ("%PAI_PROJETO%\delivery-hub-v*") do (
    if not defined ADB_EXE if exist "%%~fD\.ferramentas\android-sdk\platform-tools\adb.exe" (
      set "ADB_EXE=%%~fD\.ferramentas\android-sdk\platform-tools\adb.exe"
      set "SDK_REUTILIZADO=%%~fD\.ferramentas\android-sdk"
    )
  )
)

rem Estrutura comum do Downloads:
rem Downloads\DeliveryHub-Vx.x.x-COMPLETO\delivery-hub-vx.x.x
if not defined ADB_EXE (
  for /d %%D in ("%PAI_GERAL%\DeliveryHub-V*-COMPLETO\delivery-hub-v*") do (
    if not defined ADB_EXE if exist "%%~fD\.ferramentas\android-sdk\platform-tools\adb.exe" (
      set "ADB_EXE=%%~fD\.ferramentas\android-sdk\platform-tools\adb.exe"
      set "SDK_REUTILIZADO=%%~fD\.ferramentas\android-sdk"
    )
  )
)

exit /b 0
