# Supervisor voor Clockd: start de backend, wacht tot /api/health OK is, start dan de Cloudflare-tunnel,
# en herstart beide automatisch als ze stoppen. Werkt ZONDER adminrechten (bij aanmelden via taak).
# Met adminrechten: gebruik install-services.ps1, dan is dit script niet nodig.
#
# Verwacht:
#   C:\Clockd\backend\backend.dll          (uit publish.ps1)
#   C:\Clockd\clockd.env                   (uit clockd.env.example)
#   C:\Clockd\cloudflared\cloudflared.exe  (kopie van cloudflared-windows-amd64.exe)
#   %USERPROFILE%\.cloudflared\config.yml + credentials-json (bestaande tunnelconfig)
param(
    [string]$Root = "C:\Clockd",
    [int]$Port = 5000
)
$ErrorActionPreference = "Continue"
$logDir = Join-Path $Root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir "supervisor.log"

function Log($msg) {
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    $line | Tee-Object -FilePath $log -Append
}

function Load-Env {
    $envFile = Join-Path $Root "clockd.env"
    if (-not (Test-Path $envFile)) { throw "Ontbreekt: $envFile (kopieer deploy\clockd.env.example)" }
    Get-Content $envFile | ForEach-Object {
        $l = $_.Trim()
        if ($l -eq "" -or $l.StartsWith("#")) { return }
        $i = $l.IndexOf("=")
        if ($i -lt 1) { return }
        $name = $l.Substring(0, $i).Trim(); $value = $l.Substring($i + 1).Trim()
        if ($value -like "VUL_IN*") { throw "clockd.env: $name is nog niet ingevuld" }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Test-Health {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200
    } catch { return $false }
}

function Start-Backend {
    $dll = Join-Path $Root "backend\backend.dll"
    if (-not (Test-Path $dll)) { throw "Ontbreekt: $dll (draai deploy\publish.ps1)" }
    Log "Backend starten..."
    $p = Start-Process -FilePath "dotnet" -ArgumentList "`"$dll`"" -WorkingDirectory (Join-Path $Root "backend") `
        -RedirectStandardOutput (Join-Path $logDir "backend.out.log") -RedirectStandardError (Join-Path $logDir "backend.err.log") `
        -PassThru -WindowStyle Hidden
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
        if ($p.HasExited) { Log "Backend is direct gestopt (exit $($p.ExitCode)) - zie logs\backend.err.log"; return $null }
        if (Test-Health) { Log "Backend gezond op poort $Port"; return $p }
        Start-Sleep 3
    }
    Log "Backend niet gezond binnen 3 minuten (zie logs); tunnel wordt toch gestart, health blijft gecontroleerd"
    return $p
}

function Start-Tunnel {
    $exe = Join-Path $Root "cloudflared\cloudflared.exe"
    if (-not (Test-Path $exe)) { throw "Ontbreekt: $exe (kopieer cloudflared-windows-amd64.exe hierheen)" }
    Log "Cloudflare-tunnel starten..."
    return Start-Process -FilePath $exe -ArgumentList "tunnel run" `
        -RedirectStandardOutput (Join-Path $logDir "cloudflared.out.log") -RedirectStandardError (Join-Path $logDir "cloudflared.err.log") `
        -PassThru -WindowStyle Hidden
}

# Voorkom twee supervisors tegelijk
$mutex = New-Object System.Threading.Mutex($false, "Global\ClockdSupervisor")
if (-not $mutex.WaitOne(0)) { Log "Er draait al een supervisor - stoppen"; exit 0 }

try {
    Load-Env
    Log "Supervisor gestart (root $Root, poort $Port)"
    $backend = $null; $tunnel = $null; $unhealthySince = $null
    while ($true) {
        if ($null -eq $backend -or $backend.HasExited) {
            if ($backend) { Log "Backend gestopt (exit $($backend.ExitCode)) - herstart over 10s"; Start-Sleep 10 }
            $backend = Start-Backend
            if ($null -eq $backend) { Start-Sleep 30; continue }
        }
        if ($null -eq $tunnel -or $tunnel.HasExited) {
            if ($tunnel) { Log "Tunnel gestopt (exit $($tunnel.ExitCode)) - herstart over 10s"; Start-Sleep 10 }
            $tunnel = Start-Tunnel
        }
        # Backend die wel draait maar 5 minuten lang niet gezond is: hard herstarten
        if (Test-Health) { $unhealthySince = $null }
        elseif ($null -eq $unhealthySince) { $unhealthySince = Get-Date }
        elseif ((Get-Date) -gt $unhealthySince.AddMinutes(5)) {
            Log "Backend al 5 minuten niet gezond - geforceerde herstart"
            try { $backend.Kill() } catch {}
            $unhealthySince = $null
        }
        Start-Sleep 15
    }
}
finally { $mutex.ReleaseMutex() | Out-Null }
