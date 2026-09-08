# Zonder adminrechten: registreert een geplande taak die de supervisor (start-clockd.ps1) start
# zodra jouw account zich aanmeldt, verborgen, en hem opnieuw start als hij stopt.
# Dit vervangt het batch-script. Werkt alleen zolang er een aangemelde sessie is;
# voor 24/7 zonder login is install-services.ps1 (admin) nodig.
# Gebruik: powershell -ExecutionPolicy Bypass -File deploy\install-logon-task.ps1
param([string]$Root = "C:\Clockd")
$ErrorActionPreference = "Stop"
$script = Join-Path $Root "deploy\start-clockd.ps1"
if (-not (Test-Path (Split-Path $script))) { New-Item -ItemType Directory -Path (Split-Path $script) | Out-Null }
Copy-Item (Join-Path $PSScriptRoot "start-clockd.ps1") $script -Force

$taskName = "Clockd Supervisor"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host "Taak '$taskName' geregistreerd en gestart. Log: $Root\logs\supervisor.log"
