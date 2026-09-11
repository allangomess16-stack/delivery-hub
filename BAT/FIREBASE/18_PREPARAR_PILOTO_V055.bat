@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO ATUAL
echo ============================================================
echo.
echo Este nome antigo continua aceito por compatibilidade.
echo A versao real sera lida de VERSION/package.json antes de gerar o APK.
echo.

call "%~dp010_PREPARAR_PILOTO_V048.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto atual nao foi preparado.
  pause
)

exit /b %RESULTADO%
