# Backend Configuration (.NET)

## Windows Setup

### 1. Installeer Dependencies
- .NET 8.0 SDK: https://dotnet.microsoft.com/download
- Firebird Database: https://firebirdsql.org/

### 2. Database Setup

De applicatie gebruikt Firebird. De database file staat in `database/CLOCKWISE.FDB`.

**Windows Path**: Update `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "User=SYSDBA;Password=masterkey;Database=C:\\path\\to\\clockwise-project\\database\\CLOCKWISE.FDB;DataSource=localhost;Port=3050;Charset=UTF8"
  }
}
```

### 3. Start Backend

```cmd
cd backend
dotnet restore
dotnet run --urls "http://localhost:5000"
```

Of met hot-reload:

```cmd
dotnet watch run --urls "http://localhost:5000"
```

### 4. Test API

Open browser: http://localhost:5000/health

Should return: `{"status":"ok"}`

## CORS Configuration

Backend staat de volgende origins toe:
- http://localhost:3000 (Next.js default)
- http://localhost:3001 (Next.js alternatief)
- http://127.0.0.1:3000
- http://127.0.0.1:3001

Extra origins via environment variable:
```cmd
set CORS_ORIGINS=http://localhost:4000,http://192.168.1.100:3000
dotnet run
```

## Environment Variables

| Variable | Beschrijving | Default |
|----------|--------------|---------|
| `DefaultConnection` | Firebird connection string | appsettings.json |
| `CORS_ORIGINS` | Extra CORS origins (comma separated) | - |
| `ASPNETCORE_URLS` | Listen URLs | http://localhost:5000 |

## Troubleshooting

### Port 5000 al in gebruik?

```cmd
# Windows: Check welk proces
netstat -ano | findstr :5000

# Kill proces
taskkill /PID <nummer> /F

# Of gebruik andere port
dotnet run --urls "http://localhost:5001"
```

### Firebird Connection Errors

1. Check of Firebird server draait (services.msc → Firebird)
2. Controleer database path in connection string
3. Test connectie: `isql -user SYSDBA -password masterkey localhost:database/CLOCKWISE.FDB`

### CORS Errors in Browser

Als je CORS errors ziet in browser console:

1. Check of frontend URL in toegestane origins lijst staat
2. Check of backend daadwerkelijk draait
3. Restart backend na CORS wijzigingen
