@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.5.2
echo ============================================================
echo.
echo Matriz de capacidades POD e ponte iMile resiliente.
echo Este processo valida Firebase e gera o APK do piloto atual.
echo.

call "%~dp014_PREPARAR_PILOTO_V051.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.5.2 nao foi preparado.
  pause
)

exit /b %RESULTADO%
