@echo off
setlocal EnableExtensions

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR PILOTO V0.5.4
echo ============================================================
echo.
echo POD offline com foto pela camera ou selecao pela galeria.
echo Este processo valida Firebase e gera o APK do piloto atual.
echo.

call "%~dp016_PREPARAR_PILOTO_V053.bat"
set "RESULTADO=%ERRORLEVEL%"

if not "%RESULTADO%"=="0" (
  echo.
  echo [ERRO] O piloto V0.5.4 nao foi preparado.
  pause
)

exit /b %RESULTADO%
