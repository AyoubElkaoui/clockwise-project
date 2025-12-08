# Run this script as Administrator on Windows Server 2022
# This will set up the Clockwise Backend as a Windows Service

$serviceName = "ClockwiseBackend"
$serviceDisplayName = "Clockwise Backend API"
$serviceDescription = "Clockwise time tracking backend API with Firebird database"
$installPath = "C:\clockwise\backend"
$exePath = "$installPath\backend.exe"

Write-Host "=== Clockwise Backend Service Setup ===" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    exit 1
}

# Stop and remove existing service if it exists
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    sc.exe delete $serviceName
    Start-Sleep -Seconds 2
}

# Check if executable exists
if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: Backend executable not found at: $exePath" -ForegroundColor Red
    Write-Host "Please copy the published files to $installPath first!" -ForegroundColor Yellow
    exit 1
}

# Create the service
Write-Host "Creating Windows Service..." -ForegroundColor Green
New-Service -Name $serviceName `
    -BinaryPathName $exePath `
    -DisplayName $serviceDisplayName `
    -Description $serviceDescription `
    -StartupType Automatic

# Configure service recovery options (restart on failure)
Write-Host "Configuring service recovery options..." -ForegroundColor Green
sc.exe failure $serviceName reset= 86400 actions= restart/60000/restart/60000/restart/60000

# Start the service
Write-Host "Starting service..." -ForegroundColor Green
Start-Service -Name $serviceName

# Check status
Start-Sleep -Seconds 3
$service = Get-Service -Name $serviceName
Write-Host ""
Write-Host "=== Service Status ===" -ForegroundColor Cyan
Write-Host "Name: $($service.Name)"
Write-Host "Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Red' })
Write-Host "Startup Type: $($service.StartType)"
Write-Host ""
Write-Host "Backend should be running on: http://localhost:8080" -ForegroundColor Green
Write-Host "To view logs, check Windows Event Viewer > Application" -ForegroundColor Yellow
