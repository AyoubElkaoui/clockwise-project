# Installeert Clockd als twee Windows-services (ADMIN VEREIST, eenmalig):
#   Clockd.Backend  - de .NET backend uit C:\Clockd\backend, met de variabelen uit C:\Clockd\clockd.env
#   Cloudflared     - de Cloudflare-tunnel (cloudflared service install)
# Beide starten automatisch bij het opstarten van de server, zonder ingelogde gebruiker, en herstarten bij een crash.
#
# Vooraf: deploy\publish.ps1 gedraaid, C:\Clockd\clockd.env ingevuld,
#         C:\Clockd\cloudflared\cloudflared.exe aanwezig en de tunnelconfig in %USERPROFILE%\.cloudflared.
# Gebruik (als administrator): powershell -ExecutionPolicy Bypass -File deploy\install-services.ps1
param(
    [string]$Root = "C:\Clockd",
    [string]$TunnelConfigDir = (Join-Path $env:USERPROFILE ".cloudflared")
)
$ErrorActionPreference = "Stop"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Dit script moet als administrator draaien." }

$backendDir = Join-Path $Root "backend"
$dll = Join-Path $backendDir "backend.dll"
$envFile = Join-Path $Root "clockd.env"
$cfExe = Join-Path $Root "cloudflared\cloudflared.exe"
foreach ($f in @($dll, $envFile, $cfExe)) { if (-not (Test-Path $f)) { throw "Ontbreekt: $f" } }

# ---- 1. Clockd.Backend ----
$svcName = "Clockd.Backend"
$dotnet = (Get-Command dotnet).Source
if (Get-Service $svcName -ErrorAction SilentlyContinue) {
    Write-Host "Service $svcName bestaat al - stoppen en verwijderen"
    Stop-Service $svcName -ErrorAction SilentlyContinue
    sc.exe delete $svcName | Out-Null
    Start-Sleep 2
}
$binPath = "`"$dotnet`" `"$dll`""
New-Service -Name $svcName -DisplayName "Clockd Backend" -Description "Clockd urenregistratie (Syntess Atrium koppeling)" `
    -BinaryPathName $binPath -StartupType Automatic | Out-Null

# Variabelen uit clockd.env als service-omgeving (REG_MULTI_SZ 'Environment')
$envLines = Get-Content $envFile | Where-Object { $_.Trim() -ne "" -and -not $_.Trim().StartsWith("#") } | ForEach-Object { $_.Trim() }
foreach ($l in $envLines) { if ($l -like "*=VUL_IN*") { throw "clockd.env is niet volledig ingevuld: $l" } }
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$svcName"
New-ItemProperty -Path $regPath -Name "Environment" -PropertyType MultiString -Value $envLines -Force | Out-Null

# Wachten op Firebird bij boot, automatisch herstarten bij crash, vertraagde start
sc.exe config $svcName depend= "FirebirdServerDefaultInstance" | Out-Null
sc.exe config $svcName start= delayed-auto | Out-Null
sc.exe failure $svcName reset= 86400 actions= restart/10000/restart/30000/restart/60000 | Out-Null
sc.exe failureflag $svcName 1 | Out-Null

# ---- 2. Cloudflared ----
# De service draait als LocalSystem en leest zijn config uit het systeemprofiel; kopieer de tunnelconfig daarheen.
$sysCf = "C:\Windows\System32\config\systemprofile\.cloudflared"
if (-not (Test-Path $sysCf)) { New-Item -ItemType Directory -Path $sysCf | Out-Null }
Get-ChildItem $TunnelConfigDir -File | ForEach-Object { Copy-Item $_.FullName $sysCf -Force }
$cfg = Join-Path $sysCf "config.yml"
if (-not (Test-Path $cfg)) { throw "Geen config.yml gevonden in $TunnelConfigDir" }
# credentials-file in config.yml naar het systeemprofiel laten wijzen
(Get-Content $cfg) -replace [regex]::Escape($TunnelConfigDir), $sysCf | Set-Content $cfg -Encoding UTF8
if (Get-Service "Cloudflared" -ErrorAction SilentlyContinue) { & $cfExe service uninstall | Out-Null; Start-Sleep 2 }
& $cfExe service install
sc.exe config Cloudflared depend= "$svcName" | Out-Null
sc.exe config Cloudflared start= delayed-auto | Out-Null
sc.exe failure Cloudflared reset= 86400 actions= restart/10000/restart/30000/restart/60000 | Out-Null

# ---- 3. Starten en controleren ----
Start-Service $svcName
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep 3
    try { $r = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch {}
}
if (-not $ok) { Write-Warning "Backend nog niet gezond na 2 minuten; controleer met: Get-EventLog -LogName Application -Source $svcName -Newest 20" }
Start-Service Cloudflared
Write-Host ""
Write-Host "Klaar. Services:"
Get-Service $svcName, Cloudflared | Format-Table Name, Status, StartType -AutoSize
Write-Host "Health: http://localhost:5000/api/health"
