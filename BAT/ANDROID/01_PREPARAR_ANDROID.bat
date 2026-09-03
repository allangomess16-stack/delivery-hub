@echo off
setlocal EnableExtensions
call "%~dp0_COMUM_ANDROID.bat"

cls
echo ============================================================
echo  DELIVERY HUB - PREPARAR ANDROID
echo ============================================================
echo.

where java >nul 2>nul
if errorlevel 1 (
  echo [ATENCAO] Java nao foi encontrado no PATH.
  echo O projeto Android pode ser gerado, mas o build nativo exigira JDK/Android Studio.
)

call "%RAIZ%\BAT\02_PREPARAR_AMBIENTE.bat" /interno
if errorlevel 1 (
  echo [ERRO] Dependencias nao preparadas.
  pause
  exit /b 1
)

pushd "%RAIZ%"

echo.
echo [1/4] Build web...
call npm run build
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [2/4] Plataforma Android...
if not exist "%RAIZ%\android\app\src\main\AndroidManifest.xml" (
  call npx cap add android
  if errorlevel 1 (
    popd
    echo [ERRO] Nao foi possivel criar a plataforma Android.
    pause
    exit /b 1
  )
) else (
  echo [OK] Plataforma Android ja existe.
)

echo.
echo [3/4] Sincronizando Capacitor...
call npx cap sync android
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [4/4] Aplicando visibilidade Anjun/iMile...
node "%RAIZ%\scripts\node\aplicar-queries-android.mjs"
if errorlevel 1 (
  popd
  pause
  exit /b 1
)

echo.
echo [OK] Android preparado.
echo Nenhuma Activity interna de transportadora foi configurada automaticamente.
echo.
echo Para diagnosticar os apps no celular:
echo BAT\ANDROID\02_DIAGNOSTICAR_APPS.bat

popd
pause
