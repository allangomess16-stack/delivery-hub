@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.5.1
echo ============================================================
echo.
echo Operacao hibrida: carga importada, scanner livre e Extra Rota.
echo Este processo valida Firebase e gera o APK do piloto atual.
echo.

call "%~dp013_PREPARAR_PILOTO_V050.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.5.1 nao foi preparado.
  pause
)

exit /b %RESULTADO%
