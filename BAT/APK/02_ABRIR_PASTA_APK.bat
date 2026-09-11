@echo off
setlocal
for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
if not exist "%RAIZ%\APK" mkdir "%RAIZ%\APK"
start "" "%RAIZ%\APK"
