# Clockwise Backend - Windows Server 2022 Deployment

## Prerequisites
1. Windows Server 2022
2. .NET 8.0 ASP.NET Core Runtime (Windows Hosting Bundle)
   - Download: https://dotnet.microsoft.com/download/dotnet/8.0

## Deployment Steps

### 1. Prepare Files Locally (on your development machine)

From the `backend` folder, run:
```bash
dotnet publish -c Release -r win-x64 --self-contained false -o ./publish
```

### 2. Create Folder Structure on Windows Server

Create these folders on your Windows Server:
```
C:\clockwise\
├── backend\          (published backend files)
└── database\         (Firebird database file)
```

### 3. Copy Files to Server

Copy these to the server:
- `backend/publish/*` → `C:\clockwise\backend\`
- `database/CLOCKWISE.FDB` → `C:\clockwise\database\`
- `backend/appsettings.WindowsServer.json` → `C:\clockwise\backend\appsettings.Production.json`

### 4. Configure Firewall

Open port 8080 in Windows Firewall:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Clockwise Backend API" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8080 `
    -Action Allow
```

### 5. Install as Windows Service

Copy `setup-service.ps1` to the server and run as Administrator:
```powershell
# Run as Administrator
.\setup-service.ps1
```

### 6. Verify Service

Check service status:
```powershell
Get-Service ClockwiseBackend
```

Test API:
```powershell
curl http://localhost:8080/api/users
```

## Service Management

### Start/Stop Service
```powershell
# Start
Start-Service ClockwiseBackend

# Stop
Stop-Service ClockwiseBackend

# Restart
Restart-Service ClockwiseBackend

# Check status
Get-Service ClockwiseBackend
```

### View Logs
- Windows Event Viewer → Application logs
- Or check: `C:\clockwise\backend\logs\` (if file logging is enabled)

## Frontend Configuration

Update your Vercel frontend environment variable:
- `NEXT_PUBLIC_API_BASE_URL` = `http://YOUR_SERVER_IP:8080`

Or if you set up a domain:
- `NEXT_PUBLIC_API_BASE_URL` = `https://api.clockwise.yourdomain.com`

## Troubleshooting

### Service won't start
1. Check Event Viewer for errors
2. Verify .NET 8 Runtime is installed
3. Check database file exists at `C:\clockwise\database\CLOCKWISE.FDB`
4. Run manually first to test:
   ```cmd
   cd C:\clockwise\backend
   set ASPNETCORE_ENVIRONMENT=Production
   backend.exe
   ```

### Port already in use
Edit `appsettings.Production.json` and change the port:
```json
"Urls": "http://0.0.0.0:8081"
```

### Database connection errors
- Verify database path in `appsettings.Production.json`
- Check file permissions (service account needs read/write)
- Ensure `ServerType=1` (embedded mode) in connection string

## Optional: Setup HTTPS with IIS

If you want HTTPS and a proper domain:
1. Install IIS on Windows Server
2. Use IIS as reverse proxy to the backend
3. Configure SSL certificate
4. Set up domain name

## Database Backups

Schedule regular backups:
```powershell
# Example backup script
Copy-Item "C:\clockwise\database\CLOCKWISE.FDB" `
    -Destination "C:\clockwise\backups\CLOCKWISE_$(Get-Date -Format 'yyyyMMdd_HHmmss').FDB"
```
