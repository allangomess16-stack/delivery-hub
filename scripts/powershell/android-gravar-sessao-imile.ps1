param(
  [Parameter(Mandatory = $true)]
  [string]$AdbPath,

  [Parameter(Mandatory = $true)]
  [string]$Serial,

  [Parameter(Mandatory = $true)]
  [string]$ProjectRoot
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputDirectory = Join-Path $ProjectRoot "diagnosticos-apk\imile-sessao-$Timestamp"
$RemoteVideo = "/sdcard/deliveryhub-imile-sessao-$Timestamp.mp4"
$LocalVideo = Join-Path $OutputDirectory "sessao-tela.mp4"
$RawLog = Join-Path $env:TEMP "deliveryhub-imile-session-$Timestamp.log"
$RawError = Join-Path $env:TEMP "deliveryhub-imile-session-$Timestamp.err"
$EventsFile = Join-Path $OutputDirectory "eventos-android-mascarados.txt"
$ReportFile = Join-Path $OutputDirectory "RESUMO-SESSAO.txt"
$LogProcess = $null
$VideoProcess = $null

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Protect-SensitiveText {
  param([AllowEmptyString()][string]$Text)

  if ($null -eq $Text) { return "" }
  $protected = $Text -replace '(?i)(requestCode=)[A-Za-z0-9_-]{1,128}', '$1[MASCARADO]'
  $protected = $protected -replace '(?i)\bAJ[0-9]{10,20}\b', '[TRACKING_MASCARADO]'
  $protected = $protected -replace '\b[0-9]{12,20}\b', '[CODIGO_MASCARADO]'
  $protected = $protected -replace '(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', '[EMAIL_MASCARADO]'
  $protected = $protected -replace '(?i)(Bearer\s+)[A-Za-z0-9._~-]+', '$1[TOKEN_MASCARADO]'
  $protected = $protected -replace '(?i)((auth|token|idToken|refreshToken)=)[^&\s]+', '$1[MASCARADO]'
  $protected = $protected -replace '(?i)("(?:firebaseAuthenticationToken|authorization|idToken|refreshToken|accessToken|token)"\s*:\s*")[^"]+', '$1[MASCARADO]'
  $protected = $protected -replace '\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b', '[JWT_MASCARADO]'
  return $protected
}

function Invoke-AdbText {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  $result = & $AdbPath -s $Serial @Arguments 2>&1 | Out-String
  return (Protect-SensitiveText $result.Trim())
}

function Save-State {
  param([string]$FileName, [string]$Title)

  $activity = Invoke-AdbText shell dumpsys activity activities
  $window = Invoke-AdbText shell dumpsys window windows
  $activityLines = $activity -split "`r?`n" |
    Where-Object {
      $_ -match 'topResumedActivity|mResumedActivity|ResumedActivity|com\.imile\.redelivery|com\.deliveryhub\.(app|homologacao)'
    } |
    Select-Object -First 220
  $windowLines = $window -split "`r?`n" |
    Where-Object { $_ -match 'mCurrentFocus|mFocusedApp' } |
    Select-Object -First 30

  @(
    "DELIVERY HUB - $Title",
    "Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')",
    "",
    "ACTIVITIES",
    ($activityLines -join "`r`n"),
    "",
    "JANELA EM FOCO",
    ($windowLines -join "`r`n")
  ) -join "`r`n" |
    ForEach-Object { Protect-SensitiveText $_ } |
    Set-Content -LiteralPath (Join-Path $OutputDirectory $FileName) -Encoding UTF8
}

function Stop-RemoteScreenRecord {
  $remotePids = (& $AdbPath -s $Serial shell pidof screenrecord 2>$null | Out-String).Trim()
  foreach ($remotePid in ($remotePids -split '\s+')) {
    if ($remotePid -match '^\d+$') {
      & $AdbPath -s $Serial shell kill -2 $remotePid 2>$null | Out-Null
    }
  }
}

try {
  $model = Invoke-AdbText shell getprop ro.product.model
  $androidVersion = Invoke-AdbText shell getprop ro.build.version.release
  $imileDump = Invoke-AdbText shell dumpsys package com.imile.redelivery
  $imileVersion = ($imileDump -split "`r?`n" |
    Where-Object { $_ -match 'versionName=|versionCode=' } |
    Select-Object -First 4) -join "`r`n"

  Save-State "01-estado-inicial.txt" "ESTADO INICIAL"
  & $AdbPath -s $Serial logcat -c 2>$null

  $LogProcess = Start-Process -FilePath $AdbPath `
    -ArgumentList @("-s", $Serial, "logcat", "-v", "threadtime") `
    -RedirectStandardOutput $RawLog `
    -RedirectStandardError $RawError `
    -PassThru `
    -WindowStyle Hidden

  $VideoProcess = Start-Process -FilePath $AdbPath `
    -ArgumentList @("-s", $Serial, "shell", "screenrecord", "--time-limit", "180", $RemoteVideo) `
    -PassThru `
    -WindowStyle Hidden

  Start-Sleep -Seconds 1
  Write-Host "============================================================"
  Write-Host " GRAVACAO ATIVA - LIMITE DE 3 MINUTOS"
  Write-Host "============================================================"
  Write-Host ""
  Write-Host "Navegue manualmente pelo fluxo que deseja compreender."
  Write-Host "Voce pode iniciar no Delivery Hub, escanear e percorrer a iMile."
  Write-Host ""
  Write-Host "NAO abra senha, documento, foto ou assinatura."
  Write-Host "NAO confirme uma baixa que nao deva ser efetivada."
  Write-Host ""
  Write-Host "Quando terminar, volte ao computador e pressione ENTER."
  Read-Host | Out-Null

  Stop-RemoteScreenRecord
  if ($VideoProcess -and -not $VideoProcess.HasExited) {
    $VideoProcess.WaitForExit(15000) | Out-Null
  }
  if ($LogProcess -and -not $LogProcess.HasExited) {
    $LogProcess.Kill()
    $LogProcess.WaitForExit()
  }

  Save-State "02-estado-final.txt" "ESTADO FINAL"

  Write-Host "[1/3] Copiando gravacao do celular..."
  & $AdbPath -s $Serial pull $RemoteVideo $LocalVideo 2>$null | Out-Null
  $videoOk = Test-Path -LiteralPath $LocalVideo
  if ($videoOk) {
    & $AdbPath -s $Serial shell rm $RemoteVideo 2>$null | Out-Null
  }

  Write-Host "[2/3] Filtrando eventos Android..."
  $eventPattern = 'ActivityTaskManager|ActivityManager|WindowManager|InputDispatcher|AndroidRuntime|Capacitor|NativeBridge|flutter|DartVM|com\.imile\.redelivery|com\.deliveryhub\.(app|homologacao)|crredelivery|requestCode'
  $events = if (Test-Path -LiteralPath $RawLog) {
    Get-Content -LiteralPath $RawLog -ErrorAction SilentlyContinue |
      Where-Object { $_ -match $eventPattern } |
      ForEach-Object { Protect-SensitiveText $_ } |
      Select-Object -Last 5000
  } else {
    @("Logcat nao produziu saida.")
  }
  $events | Set-Content -LiteralPath $EventsFile -Encoding UTF8

  @(
    "DELIVERY HUB - SESSAO EXPLORATORIA IMILE",
    "Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')",
    "Aparelho: $model",
    "Android: $androidVersion",
    "",
    "IMILE",
    $imileVersion,
    "",
    "CAPTURAS",
    "Video criado: $videoOk",
    "Duracao maxima: 180 segundos",
    "Log textual: eventos-android-mascarados.txt",
    "Estado inicial: 01-estado-inicial.txt",
    "Estado final: 02-estado-final.txt",
    "",
    "IMPORTANTE",
    "O log textual mascara tracking, e-mail e tokens reconheciveis.",
    "O VIDEO NAO E MASCARADO e pode exibir dados operacionais reais.",
    "Revise o video antes de compartilha-lo.",
    "A captura nao automatizou cliques nem confirmou entregas."
  ) -join "`r`n" |
    Set-Content -LiteralPath $ReportFile -Encoding UTF8

  Write-Host "[3/3] Sessao salva em:"
  Write-Host $OutputDirectory
  Write-Host ""
  Write-Host "Revise o video e envie a pasta inteira para analise."
  Start-Process explorer.exe -ArgumentList @($OutputDirectory)
} finally {
  Stop-RemoteScreenRecord
  if ($VideoProcess -and -not $VideoProcess.HasExited) {
    $VideoProcess.Kill()
  }
  if ($LogProcess -and -not $LogProcess.HasExited) {
    $LogProcess.Kill()
  }
  Remove-Item -LiteralPath $RawLog -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $RawError -Force -ErrorAction SilentlyContinue
}
