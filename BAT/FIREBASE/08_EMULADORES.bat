@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_FIREBASE.bat"
if errorlevel 1 ( pause & exit /b 1 )

call "%RAIZ%\BAT\02_PREPARAR_AMBIENTE.bat"
if errorlevel 1 ( pause & exit /b 1 )

echo.
echo Emulator UI: http://localhost:4000
echo Hosting:     http://localhost:5000
echo Auth:        localhost:9099
echo Database:    localhost:9000
echo.
call "%FIREBASE_CMD%" emulators:start --config "%CONFIG_FIREBASE%"
pause
