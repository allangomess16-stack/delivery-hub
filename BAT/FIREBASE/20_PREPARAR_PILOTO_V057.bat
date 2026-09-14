@echo off
setlocal EnableExtensions

rem Atalho da V0.5.7. O preparador abaixo le VERSION e permanece valido nas proximas versoes.
call "%~dp018_PREPARAR_PILOTO_V055.bat"
exit /b %ERRORLEVEL%
