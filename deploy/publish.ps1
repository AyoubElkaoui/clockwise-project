# Bouwt de backend als Release en zet hem in C:\Clockd\backend (geen dotnet run meer op een bureaublad).
# Gebruik:  powershell -ExecutionPolicy Bypass -File deploy\publish.ps1
# Daarna:   deploy\start-clockd.ps1 (supervisor) of deploy\install-services.ps1 (services, admin)
param(
    [string]$Target = "C:\Clockd\backend"
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$src = Join-Path $repo "backend"

if (-not (Test-Path "C:\Clockd")) { New-Item -ItemType Directory -Path "C:\Clockd" | Out-Null }
if (-not (Test-Path "C:\Clockd\logs")) { New-Item -ItemType Directory -Path "C:\Clockd\logs" | Out-Null }

Write-Host "Publish $src -> $Target"
# Bestaande build vervangen; als de service draait, eerst stoppen zodat de bestanden vrij zijn.
$svc = Get-Service -Name "Clockd.Backend" -ErrorAction SilentlyContinue
$wasRunning = $false
if ($svc -and $svc.Status -eq "Running") { $wasRunning = $true; Stop-Service "Clockd.Backend"; Start-Sleep 2 }

dotnet publish $src -c Release -o $Target --nologo
if ($LASTEXITCODE -ne 0) { throw "dotnet publish mislukt" }

if (-not (Test-Path "C:\Clockd\clockd.env")) {
    Copy-Item (Join-Path $PSScriptRoot "clockd.env.example") "C:\Clockd\clockd.env"
    Write-Warning "C:\Clockd\clockd.env aangemaakt vanuit het voorbeeld: VUL DE WAARDEN IN voordat je start."
}

if ($wasRunning) { Start-Service "Clockd.Backend" }
Write-Host "Klaar. Backend staat in $Target"
