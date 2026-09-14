@echo off
setlocal EnableExtensions

for %%I in ("%~dp0..") do set "RAIZ=%%~fI"
set "VERSAO="
if exist "%RAIZ%\VERSION" set /p "VERSAO="<"%RAIZ%\VERSION"
if not defined VERSAO (
  echo [ERRO] VERSION nao encontrado.
  pause
  exit /b 1
)

cls
echo ============================================================
echo  DELIVERY HUB - PUBLICAR PILOTO V%VERSAO%
echo ============================================================
echo.
echo Este fluxo executa as quatro etapas necessarias:
echo  1. gerar e validar o APK;
echo  2. publicar codigo e Release no GitHub;
echo  3. anexar o APK a Release;
echo  4. publicar o manifesto no Firebase Hosting.
echo.
echo O Firebase nao recebe APK: o plano Spark bloqueia executaveis.
echo.

rem 18 e o preparador generico: le VERSION, portanto nao precisa trocar este BAT a cada release.
call "%RAIZ%\BAT\FIREBASE\18_PREPARAR_PILOTO_V055.bat"
if errorlevel 1 goto :FALHA

call "%RAIZ%\BAT\GITHUB\03_PUBLICAR_VERSAO.bat"
if errorlevel 1 goto :FALHA

call "%RAIZ%\BAT\GITHUB\08_ENVIAR_APK_PARA_RELEASE.bat"
if errorlevel 1 goto :FALHA

call "%RAIZ%\BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat"
if errorlevel 1 goto :FALHA

echo.
echo ============================================================
echo [OK] PILOTO V%VERSAO% PUBLICADO COMPLETAMENTE
echo ============================================================
echo O APK esta na Release GitHub e o manifesto esta no Firebase.
pause
exit /b 0

:FALHA
echo.
echo [ERRO] Publicacao interrompida. Corrija o erro acima e execute novamente.
pause
exit /b 1
