@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.5.6
echo ============================================================
echo.
echo Galeria no campo auxiliar do scanner e Anjun nivel 1 seguro.
echo O APK continua sendo publicado pela Release GitHub; o Firebase recebe o manifesto.
echo.

call "%~dp018_PREPARAR_PILOTO_V055.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.5.6 nao foi preparado.
  pause
)

exit /b %RESULTADO%
