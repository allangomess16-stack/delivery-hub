@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 exit /b 1

if not exist "%PROJETO_ENV%" (
  echo Projeto Firebase ainda nao configurado.
  pause
  exit /b 1
)

set "PROJECT_ID="
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJETO_ENV%") do (
  if /I "%%A"=="PROJECT_ID" set "PROJECT_ID=%%B"
)

start "" "https://console.firebase.google.com/project/%PROJECT_ID%/overview"
exit /b 0
