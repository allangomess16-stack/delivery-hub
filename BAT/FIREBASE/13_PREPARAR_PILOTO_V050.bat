@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.5.0
echo ============================================================
echo.
echo POD Universal offline com assinatura e encaminhamento por transportadora.
echo.

call "%~dp010_PREPARAR_PILOTO_V048.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.5.0 nao foi preparado.
  pause
)

exit /b %RESULTADO%
