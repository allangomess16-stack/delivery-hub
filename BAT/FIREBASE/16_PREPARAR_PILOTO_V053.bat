@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.5.3
echo ============================================================
echo.
echo Lobby operacional, Cockpit hibrido e retomada segura de POD.
echo Este processo valida Firebase e gera o APK do piloto atual.
echo.

call "%~dp015_PREPARAR_PILOTO_V052.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.5.3 nao foi preparado.
  pause
)

exit /b %RESULTADO%
