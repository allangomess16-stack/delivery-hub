param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$FirebaseCmd,
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$DatabaseInstance
)

$ErrorActionPreference = "Stop"

$config = Get-Content -Raw -Encoding UTF8 $ConfigPath | ConvertFrom-Json
$apiKey = $config.firebase.apiKey

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "apiKey nao encontrada em $ConfigPath"
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DELIVERY HUB - ADMIN INICIAL FIREBASE"
Write-Host "============================================================"
Write-Host ""

$nome = Read-Host "Nome do administrador"
$email = (Read-Host "Email do administrador").Trim().ToLowerInvariant()
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

  try {
    $resposta = Invoke-RestMethod `
      -Method Post `
      -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey" `
      -ContentType "application/json" `
      -Body $body
  }
  catch {
    $mensagem = $_.ErrorDetails.Message
    if ($mensagem -match "EMAIL_EXISTS") {
      throw "Este email ja possui uma conta Firebase. Use outro email para o bootstrap inicial ou vincule a conta manualmente."
    }
    throw
  }

  $uid = $resposta.localId
  if ([string]::IsNullOrWhiteSpace($uid)) {
    throw "Firebase nao retornou o UID do administrador."
  }

  $agora = [DateTime]::UtcNow.ToString("o")
  $registro = @{
    email = $email
    nome = $nome
    tipo = "ADMIN"
    ativo = $true
    criadoEm = $agora
    atualizadoEm = $agora
  }

  $arquivoTemp = Join-Path $env:TEMP ("delivery-hub-admin-" + [Guid]::NewGuid().ToString("N") + ".json")
  $registro | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $arquivoTemp

  try {
    & $FirebaseCmd database:set "/usuarios/$uid" $arquivoTemp `
      --project $ProjectId `
      --instance $DatabaseInstance `
      --confirm

    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel gravar o perfil ADMIN no Realtime Database."
    }
  }
  finally {
    Remove-Item -Force -ErrorAction SilentlyContinue $arquivoTemp
  }

  Write-Host ""
  Write-Host "[OK] Administrador criado."
  Write-Host "UID: $uid"
  Write-Host "Email: $email"
  Write-Host ""
}
finally {
  if ($ptr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
  $senha = $null
}
