# backend/scripts/Confirm-PasswordReset.ps1
Param(
  [Parameter(Mandatory = $true)]
  [string]$Uid,

  [Parameter(Mandatory = $true)]
  [string]$Token,

  # Opção A (recomendada): peça a senha interativamente
  [switch]$Prompt,

  # Opção B: aceite SecureString via parâmetro (pode vir de Get-Credential/Read-Host -AsSecureString)
  [SecureString]$NewPassword,

  # Opcional: force a base URL. Ex.: https://api.seuservidor.com/api/v1/
  [string]$BaseUrl
)

# Forçar saída UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Resolve-ApiBase {
  param([string]$BaseUrlParam)

  if ($BaseUrlParam) { return ($BaseUrlParam.TrimEnd('/') + '/') }

  $envModule = $env:DJANGO_SETTINGS_MODULE
  if ($envModule -and $envModule.ToLower().EndsWith('.dev')) {
    return 'http://127.0.0.1:8000/api/v1/'
  }
  if ($envModule -and $envModule.ToLower().EndsWith('.prod')) {
    if ($env:BACKEND_API_URL) { return ($env:BACKEND_API_URL.TrimEnd('/') + '/') }
    Write-Warning "DJANGO_SETTINGS_MODULE indica PROD, mas BACKEND_API_URL não está definido. Informe -BaseUrl."
  }
  return 'http://127.0.0.1:8000/api/v1/'
}

function Read-PasswordTwiceSecure {
  while ($true) {
    $p1 = Read-Host "Nova senha" -AsSecureString
    $p2 = Read-Host "Confirmar nova senha" -AsSecureString
    if ((ConvertFrom-SecureString -SecureString $p1) -eq (ConvertFrom-SecureString -SecureString $p2)) {
      return $p1
    }
    Write-Host "As senhas não coincidem. Tente novamente." -ForegroundColor Yellow
  }
}

function SecureToPlain {
  param([SecureString]$Sec)
  if (-not $Sec) { return "" }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Sec)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringUni($bstr)
  }
  finally {
    if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  }
}

$api = Resolve-ApiBase -BaseUrlParam $BaseUrl
$endpoint = $api + 'auth/password-reset/confirm/'

Write-Host "API base: $api"
Write-Host "Confirmando redefinição para uid=$Uid"

# Se -Prompt foi usado, ler a senha interativamente
if ($Prompt) {
  $NewPassword = Read-PasswordTwiceSecure
} elseif (-not $NewPassword) {
  throw "Forneça -Prompt para digitar a senha ou passe -NewPassword como SecureString."
}

# Converte para texto claro apenas em memória (necessário para a API)
$plain = SecureToPlain -Sec $NewPassword

try {
  $headers = @{ 'Accept' = 'application/json' }
  $body = @{
    uid = $Uid
    token = $Token
    new_password  = $plain
    new_password2 = $plain
  } | ConvertTo-Json -Depth 5

  $resp = Invoke-RestMethod -Method Post -Headers $headers -Uri $endpoint -ContentType 'application/json' -Body $body -TimeoutSec 30

  Write-Host "✅ Senha redefinida com sucesso." -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 5
  exit 0
}
catch {
  Write-Host "Falha na confirmação:" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errText = $reader.ReadToEnd()
    Write-Host $errText
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}
finally {
  # Esforço extra: sobrepõe a variável $plain para reduzir janela de exposição em memória
  $plain = $null
}