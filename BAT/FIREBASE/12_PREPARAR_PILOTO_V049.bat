@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.4.9
echo ============================================================
echo.
echo Scanner Universal com Firebase e NativeBridge.
echo.

call "%~dp010_PREPARAR_PILOTO_V048.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.4.9 nao foi preparado.
  pause
)

exit /b %RESULTADO%
