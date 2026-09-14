param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$FirebaseCmd,
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$DatabaseInstance,
  [ValidateSet("ADMIN", "SUPORTE")][string]$PerfilTipo = "ADMIN"
)

$ErrorActionPreference = "Stop"

function Get-FirebaseErrorCode {
  param([Parameter(Mandatory=$true)]$ErrorRecord)

  $details = [string]$ErrorRecord.ErrorDetails.Message
  if ([string]::IsNullOrWhiteSpace($details) -and $null -ne $ErrorRecord.Exception.Response) {
    try {
      $stream = $ErrorRecord.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      try { $details = $reader.ReadToEnd() } finally { $reader.Dispose() }
    }
    catch {
      $details = ""
    }
  }

  if ([string]::IsNullOrWhiteSpace($details)) { return "HTTP_400" }

  try {
    $json = $details | ConvertFrom-Json
    $message = [string]$json.error.message
    if (-not [string]::IsNullOrWhiteSpace($message)) {
      return (($message -split '[: ]')[0] -replace '[^A-Z0-9_\-]', '')
    }
  }
  catch {}

  $match = [regex]::Match($details, '"message"\s*:\s*"([A-Z0-9_\-]+)')
  if ($match.Success) { return $match.Groups[1].Value }
  return "HTTP_400"
}

$config = Get-Content -Raw -Encoding UTF8 $ConfigPath | ConvertFrom-Json
$apiKey = $config.firebase.apiKey

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "apiKey nao encontrada em $ConfigPath"
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DELIVERY HUB - PERFIL $PerfilTipo FIREBASE"
Write-Host "============================================================"
Write-Host ""

$rotuloPerfil = if ($PerfilTipo -eq "SUPORTE") { "suporte" } else { "administrador" }
$nome = Read-Host "Nome do $rotuloPerfil"
$email = (Read-Host "Email do $rotuloPerfil").Trim().ToLowerInvariant()
$secure = Read-Host "Senha inicial (minimo 6 caracteres)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

try {
  $senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ($senha.Length -lt 6) {
    throw "A senha precisa ter pelo menos 6 caracteres."
  }

  $body = @{
    email = $email
    password = $senha
    returnSecureToken = $true
  } | ConvertTo-Json

  $contaCriadaAgora = $false

  try {
    $resposta = Invoke-RestMethod `
      -Method Post `
      -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" `
      -ContentType "application/json" `
      -Body $body
    $contaCriadaAgora = $true
  }
  catch {
    $codigo = Get-FirebaseErrorCode -ErrorRecord $_
    if ($codigo -eq "EMAIL_EXISTS") {
      try {
        $resposta = Invoke-RestMethod `
          -Method Post `
          -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$apiKey" `
          -ContentType "application/json" `
          -Body $body
      }
      catch {
        throw "Este email ja existe, mas a senha informada nao confirmou a conta."
      }
    }
    else {
      switch ($codigo) {
        "OPERATION_NOT_ALLOWED" {
          throw "O login Email/Senha ainda nao esta ativo. Execute BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat."
        }
        "CONFIGURATION_NOT_FOUND" {
          throw "O Firebase Authentication ainda nao foi inicializado. Execute BAT\FIREBASE\03_SUBIR_ATUALIZACAO.bat."
        }
        "INVALID_EMAIL" { throw "O email informado nao e valido." }
        "WEAK_PASSWORD" { throw "A senha informada nao atende aos requisitos do Firebase." }
        "API_KEY_INVALID" { throw "A configuracao do App Web Firebase nao e valida." }
        "TOO_MANY_ATTEMPTS_TRY_LATER" {
          throw "Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente."
        }
        default { throw "Firebase Authentication recusou a criacao ($codigo)." }
      }
    }
  }

  $uid = $resposta.localId
  if ([string]::IsNullOrWhiteSpace($uid)) {
    throw "Firebase nao retornou o UID do $rotuloPerfil."
  }

  $perfilExistenteRaw = ((& $FirebaseCmd database:get "/usuarios/$uid" `
    --project $ProjectId `
    --instance $DatabaseInstance 2>$null) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Nao foi possivel verificar se a conta ja possui outro perfil."
  }

  $perfilExistente = $null
  if (-not [string]::IsNullOrWhiteSpace($perfilExistenteRaw) -and $perfilExistenteRaw -ne "null") {
    try { $perfilExistente = $perfilExistenteRaw | ConvertFrom-Json }
    catch { throw "O perfil existente retornou um formato invalido." }

    if (-not [string]::IsNullOrWhiteSpace([string]$perfilExistente.tipo) -and
        [string]$perfilExistente.tipo -ne $PerfilTipo) {
      throw "Este email ja pertence ao perfil $($perfilExistente.tipo). Use outro email para $PerfilTipo."
    }
  }

  $agora = [DateTime]::UtcNow.ToString("o")
  $registro = @{
    email = $email
    nome = $nome
    tipo = $PerfilTipo
    ativo = $true
    criadoEm = if ($null -ne $perfilExistente -and $perfilExistente.criadoEm) {
      [string]$perfilExistente.criadoEm
    } else {
      $agora
    }
    atualizadoEm = $agora
  }

  $arquivoTemp = Join-Path $env:TEMP ("delivery-hub-perfil-" + [Guid]::NewGuid().ToString("N") + ".json")
  $jsonRegistro = $registro | ConvertTo-Json -Depth 8 -Compress
  $utf8SemBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllText($arquivoTemp, $jsonRegistro, $utf8SemBom)

  try {
    Get-Content -Raw -Encoding UTF8 $arquivoTemp | ConvertFrom-Json | Out-Null
  }
  catch {
    Remove-Item -Force -ErrorAction SilentlyContinue $arquivoTemp
    throw "O perfil $PerfilTipo nao gerou um JSON local valido."
  }

  try {
    & $FirebaseCmd database:set "/usuarios/$uid" $arquivoTemp `
      --project $ProjectId `
      --instance $DatabaseInstance `
      --force

    if ($LASTEXITCODE -ne 0) {
      if ($contaCriadaAgora -and -not [string]::IsNullOrWhiteSpace([string]$resposta.idToken)) {
        try {
          $deleteBody = @{ idToken = $resposta.idToken } | ConvertTo-Json
          Invoke-RestMethod `
            -Method Post `
            -Uri "https://identitytoolkit.googleapis.com/v1/accounts:delete?key=$apiKey" `
            -ContentType "application/json" `
            -Body $deleteBody | Out-Null
        }
        catch {}
      }
      throw "Nao foi possivel gravar o perfil $PerfilTipo no Realtime Database."
    }
  }
  finally {
    Remove-Item -Force -ErrorAction SilentlyContinue $arquivoTemp
  }

  Write-Host ""
  Write-Host "[OK] Perfil $PerfilTipo criado."
  Write-Host "UID: $uid"
  Write-Host "Email: $email"
  Write-Host ""
}
finally {
  if ($ptr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
  $senha = $null
  $body = $null
  $resposta = $null
  $jsonRegistro = $null
}
