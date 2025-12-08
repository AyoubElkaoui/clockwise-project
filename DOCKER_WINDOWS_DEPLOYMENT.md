# Clockwise Backend - Docker Deployment on Windows Server 2022

## Voordelen van Docker op Windows Server

✅ **Makkelijker te beheren** - Simpele start/stop/restart commands  
✅ **Isolatie** - Alles zit in een container  
✅ **Updates** - Gewoon nieuwe image builden en herstarten  
✅ **Portability** - Werkt overal waar Docker draait  
✅ **Resource management** - CPU/Memory limits instellen  
✅ **Goede performance** - Niet traag op Windows Server 2022  

## Prerequisites

1. **Windows Server 2022** met Docker Desktop of Docker Engine
2. **Git** (om repo te clonen)

### Installeer Docker op Windows Server 2022

**Optie A: Docker Desktop** (Makkelijkste)
- Download: https://www.docker.com/products/docker-desktop/
- Installeer en restart

**Optie B: Docker Engine** (Headless server)
```powershell
# Run as Administrator
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
Install-Package -Name docker -ProviderName DockerMsftProvider -Force
Restart-Computer -Force
```

## Quick Start

### 1. Clone Repository op Windows Server

```powershell
cd C:\
git clone https://github.com/AyoubElkaoui/clockwise-project.git
cd clockwise-project
```

### 2. Bouw en Start de Container

```powershell
# Build image
docker build -f backend/Dockerfile.windows -t clockwise-backend .

# Run container
docker run -d `
  --name clockwise-backend `
  -p 8080:8080 `
  -v ${PWD}/database:C:/app/database `
  -e ASPNETCORE_ENVIRONMENT=Production `
  -e SEED_ON_START=true `
  --restart unless-stopped `
  clockwise-backend
```

### 3. Of gebruik Docker Compose (Aangeraden)

```powershell
docker-compose -f docker-compose.windows.yml up -d
```

### 4. Controleer of het werkt

```powershell
# Check container status
docker ps

# View logs
docker logs clockwise-backend

# Test API
curl http://localhost:8080/api/users
```

## Container Management

### Start/Stop/Restart
```powershell
# Stop
docker stop clockwise-backend

# Start
docker start clockwise-backend

# Restart
docker restart clockwise-backend

# Remove
docker rm -f clockwise-backend
```

### Logs bekijken
```powershell
# Laatste logs
docker logs clockwise-backend

# Follow logs (live)
docker logs -f clockwise-backend

# Laatste 100 regels
docker logs --tail 100 clockwise-backend
```

### Update naar nieuwe versie
```powershell
# Pull latest code
git pull

# Rebuild image
docker build -f backend/Dockerfile.windows -t clockwise-backend .

# Recreate container
docker stop clockwise-backend
docker rm clockwise-backend
docker run -d `
  --name clockwise-backend `
  -p 8080:8080 `
  -v ${PWD}/database:C:/app/database `
  -e ASPNETCORE_ENVIRONMENT=Production `
  -e SEED_ON_START=true `
  --restart unless-stopped `
  clockwise-backend
```

Of met Docker Compose:
```powershell
docker-compose -f docker-compose.windows.yml down
docker-compose -f docker-compose.windows.yml build
docker-compose -f docker-compose.windows.yml up -d
```

## Firewall Configuratie

Open port 8080:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Clockwise Backend API (Docker)" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8080 `
    -Action Allow
```

## Auto-start bij Server Reboot

Docker container met `--restart unless-stopped` start automatisch op als:
- De server herstart
- Docker service herstart
- Container crashed

Zorg dat Docker service auto-start is:
```powershell
Set-Service docker -StartupType Automatic
```

## Database Backups

```powershell
# Manual backup
docker exec clockwise-backend cmd /c copy C:\app\database\CLOCKWISE.FDB C:\app\database\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').FDB

# Of direct van host
Copy-Item "C:\clockwise-project\database\CLOCKWISE.FDB" `
    -Destination "C:\clockwise-project\backups\CLOCKWISE_$(Get-Date -Format 'yyyyMMdd_HHmmss').FDB"
```

## Resource Limits (Optioneel)

Als je resource limits wilt instellen:
```powershell
docker run -d `
  --name clockwise-backend `
  -p 8080:8080 `
  --memory="2g" `
  --cpus="2.0" `
  -v ${PWD}/database:C:/app/database `
  -e ASPNETCORE_ENVIRONMENT=Production `
  -e SEED_ON_START=true `
  --restart unless-stopped `
  clockwise-backend
```

## Frontend Configuratie (Vercel)

Update environment variable op Vercel:
```
NEXT_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP:8080
```

Of met domain:
```
NEXT_PUBLIC_API_BASE_URL=https://api.clockwise.yourdomain.com
```

## Troubleshooting

### Container start niet
```powershell
# Check logs
docker logs clockwise-backend

# Check container inspect
docker inspect clockwise-backend

# Run interactive voor debugging
docker run -it --rm clockwise-backend cmd
```

### Port 8080 already in use
```powershell
# Check wat er op port 8080 draait
netstat -ano | findstr :8080

# Of gebruik andere port
docker run -d -p 8081:8080 ...
```

### Performance issues
Windows containers op Windows Server 2022 zijn native en snel. Als je toch problemen hebt:
- Check CPU/Memory usage: `docker stats`
- Verhoog resource limits
- Check Windows Server updates

## Vergelijking: Docker vs Windows Service

| Feature | Docker | Windows Service |
|---------|--------|-----------------|
| Setup | ⭐⭐⭐⭐⭐ Simpel | ⭐⭐⭐ Meer stappen |
| Updates | ⭐⭐⭐⭐⭐ Rebuild & restart | ⭐⭐⭐ Files vervangen |
| Isolatie | ⭐⭐⭐⭐⭐ Volledig geïsoleerd | ⭐⭐⭐ Deelt systeem |
| Logs | ⭐⭐⭐⭐⭐ `docker logs` | ⭐⭐⭐ Event Viewer |
| Performance | ⭐⭐⭐⭐⭐ Native Windows containers | ⭐⭐⭐⭐⭐ Native |
| Portability | ⭐⭐⭐⭐⭐ Overal | ⭐⭐⭐ Alleen Windows |

**Aanbeveling: Gebruik Docker** - Het is makkelijker te beheren en even snel.
