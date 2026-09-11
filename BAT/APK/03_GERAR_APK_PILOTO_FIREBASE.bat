@echo off
setlocal EnableExtensions
for %%I in ("%~dp0..\..") do set "RAIZ=%%~fI"
set "VERSAO_ATUAL="
if exist "%RAIZ%\VERSION" set /p "VERSAO_ATUAL="<"%RAIZ%\VERSION"
if not defined VERSAO_ATUAL set "VERSAO_ATUAL=atual"

cls
echo ============================================================
echo  DELIVERY HUB - APK PILOTO FIREBASE V%VERSAO_ATUAL%
echo ============================================================
echo.
echo Este gerador usa a configuracao Firebase ja criada no computador.
echo O APK exige login e compartilha cargas/operacoes com o Admin.
echo.

call "%~dp001_GERAR_APK_HOMOLOGACAO.bat" /firebase
exit /b %ERRORLEVEL%
