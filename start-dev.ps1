param(
  [ValidateSet("dev", "prod")][string]$Env = "dev",
  [bool]$StartFrontend = $true,
  [bool]$StartMobile = $false
)

# =========================
# Paths
# =========================
$ProjectRoot = "C:\Dev\camaleao"
$Backend = "$ProjectRoot\backend"
$Frontend = "$ProjectRoot\frontend"
$Mobile = "$ProjectRoot\mobile"

$BackendEnv = if ($Env -eq "dev") { "$Backend\.env.development" } else { "$Backend\.env.prod" }
$FrontendEnv = if ($Env -eq "dev") { "$Frontend\.env.development" } else { "$Frontend\.env.production" }
$MobileEnv = if ($Env -eq "dev") { "$Mobile\.env.dev" } else { "$Mobile\.env.prod" }

$UserTemp = [System.IO.Path]::GetTempPath()
$CloudflaredOut = Join-Path $UserTemp "cf_out.txt"
$CloudflaredErr = Join-Path $UserTemp "cf_err.txt"

# =========================
# Helpers
# =========================
function Set-EnvVarInFile {
  param(
    [string]$File,
    [string]$Key,
    [string]$Value
  )
  if (-not (Test-Path $File)) {
    New-Item -ItemType File -Path $File -Force | Out-Null
  }

  # Lê todas as linhas (preservando estrutura)
  $lines = Get-Content -Path $File -ErrorAction SilentlyContinue
  $escaped = [regex]::Escape($Key)
  $found = $false
  $newLines = @()

  foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") {
      # Substitui apenas a linha correspondente
      $newLines += "$Key=$Value"
      $found = $true
    }
    else {
      $newLines += $line
    }
  }

  # Se a chave não existir, adiciona no final (sem linha em branco extra)
  if (-not $found) {
    if ($newLines.Count -gt 0) {
      $newLines[-1] = $newLines[-1].TrimEnd()
    }
    $newLines += "$Key=$Value"
  }

  # Grava o arquivo sem adicionar quebras adicionais
  Set-Content -Path $File -Value ($newLines -join "`n") -Encoding UTF8
}


function Start-NewWindow {
  param($Title, $Cmd)
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '[$Title]'; $Cmd" -WindowStyle Normal
}

Write-Host "Starting environment $Env..."

# =========================
# 1) Cloudflared first
# =========================
Write-Host "Creating Cloudflare quick tunnel..."
if (Test-Path $CloudflaredOut) { Remove-Item $CloudflaredOut -ErrorAction SilentlyContinue }
if (Test-Path $CloudflaredErr) { Remove-Item $CloudflaredErr -ErrorAction SilentlyContinue }

# Prefer user-local installation
$CloudflaredPath = $null
$CloudflaredUser = Join-Path $env:USERPROFILE ".cloudflared\cloudflared.exe"
if (Test-Path $CloudflaredUser) {
  $CloudflaredPath = $CloudflaredUser
}
else {
  try { $CloudflaredPath = (Get-Command cloudflared -ErrorAction Stop).Source }
  catch {
    Write-Host "ERROR: cloudflared.exe not found. Please install Cloudflared and try again."
    exit 1
  }
}

$cfArgs = @("tunnel", "--url", "http://127.0.0.1:8000")
$CloudflaredProc = Start-Process -FilePath $CloudflaredPath -ArgumentList $cfArgs `
  -RedirectStandardOutput $CloudflaredOut -RedirectStandardError $CloudflaredErr `
  -PassThru

Write-Host "Waiting tunnel URL..."
$Url = $null
$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline -and -not $Url) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $CloudflaredOut) {
    $txt = Get-Content -Path $CloudflaredOut -Raw -ErrorAction SilentlyContinue
    if ($txt -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { $Url = $Matches[0]; break }
  }
  if (-not $Url -and (Test-Path $CloudflaredErr)) {
    $err = Get-Content -Path $CloudflaredErr -Raw -ErrorAction SilentlyContinue
    if ($err -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { $Url = $Matches[0]; break }
  }
}

if (-not $Url) {
  Write-Host "ERROR: could not capture Cloudflare tunnel URL."
  Stop-Process -Id $CloudflaredProc.Id -Force
  exit 1
}

Write-Host "Tunnel is up: $Url"
$HostOnly = $Url -replace '^https://', ''

# =========================
# 2) Update .env files cleanly
# =========================
Set-EnvVarInFile $BackendEnv  "ALLOWED_HOSTS" "127.0.0.1,localhost,$HostOnly"
Set-EnvVarInFile $BackendEnv  "BACKEND_URL"   $Url
Set-EnvVarInFile $FrontendEnv "VITE_API_URL"  $Url
Set-EnvVarInFile $MobileEnv   "API_URL"       "$Url/api/v1/"

Write-Host "Updated env files:"
Write-Host " - $BackendEnv"
Write-Host " - $FrontendEnv"
Write-Host " - $MobileEnv"

# =========================
# 3) Start backend (after tunnel)
# =========================
$venv = "$Backend\venv\Scripts\Activate"
if (Test-Path $venv) {
  $djangoCmd = "cd `"$Backend`"; . `"$venv`"; `$env:DJANGO_SETTINGS_MODULE='camaleao.settings.$Env'; python manage.py runserver 127.0.0.1:8000"
}
else {
  $djangoCmd = "cd `"$Backend`"; `$env:DJANGO_SETTINGS_MODULE='camaleao.settings.$Env'; python manage.py runserver 127.0.0.1:8000"
}
Start-NewWindow "Django ($Env)" $djangoCmd
Start-Sleep -Seconds 5

# =========================
# 4) Optionally start frontend/mobile
# =========================
if ($StartFrontend) {
  $fe = "cd `"$Frontend`"; npm run dev"
  Start-NewWindow "Frontend ($Env)" $fe
}
if ($StartMobile) {
  $mob = "cd `"$Mobile`"; npm run dev"
  Start-NewWindow "Mobile ($Env)" $mob
}

# =========================
# 5) Status
# =========================
Write-Host ""
Write-Host "All set!"
Write-Host "Public URL: $Url"
Write-Host "DJANGO_SETTINGS_MODULE=camaleao.settings.$Env"
Write-Host "Press CTRL + C to stop the tunnel."

# Keep Cloudflare alive
Wait-Process -Id $CloudflaredProc.Id
