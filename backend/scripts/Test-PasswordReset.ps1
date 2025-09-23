# backend/scripts/Test-PasswordReset.ps1
Param(
  [Parameter(Mandatory = $true)]
  [string]$Email,

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

  # fallback
  return 'http://127.0.0.1:8000/api/v1/'
}

$api = Resolve-ApiBase -BaseUrlParam $BaseUrl
$endpoint = $api + 'auth/password-reset/'

Write-Host "API base: $api"
Write-Host "Disparando recuperação de senha para: $Email"

try {
  try { Invoke-WebRequest -Method Options -Uri $endpoint -TimeoutSec 10 | Out-Null } catch { }

  $headers = @{ 'Accept' = 'application/json' }
  $body = @{ email = $Email } | ConvertTo-Json -Depth 3

  $resp = Invoke-RestMethod -Method Post -Headers $headers -Uri $endpoint -ContentType 'application/json' -Body $body -TimeoutSec 30

  Write-Host "Resposta:" -ForegroundColor Cyan
  $resp | ConvertTo-Json -Depth 5

  Write-Host ""
  Write-Host "DEV (EMAIL_BACKEND=console): veja no console do Django." -ForegroundColor Yellow
  Write-Host "PROD (SMTP2GO API): verifique a caixa de entrada do destinatário." -ForegroundColor Yellow
  exit 0
}
catch {
  Write-Host "Falha ao disparar recuperação:" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errText = $reader.ReadToEnd()
    Write-Host $errText
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}