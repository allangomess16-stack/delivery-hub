@echo off
if defined DELIVERY_HUB_ANDROID_COMUM exit /b 0
set "DELIVERY_HUB_ANDROID_COMUM=1"

for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"

set "ADB_EXE="
where adb >nul 2>nul
if not errorlevel 1 set "ADB_EXE=adb"

if not defined ADB_EXE if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
  set "ADB_EXE=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)

if not defined ADB_EXE if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
  set "ADB_EXE=%ANDROID_HOME%\platform-tools\adb.exe"
)

exit /b 0
