# Windows Setup Guide

Deze guide helpt je om de Clockwise applicatie op Windows te draaien.

## Vereisten

1. **.NET 8.0 SDK** - Download van https://dotnet.microsoft.com/download
2. **Node.js 18+** - Download van https://nodejs.org/
3. **Firebird Database** - Download van https://firebirdsql.org/

## Stap 1: Backend Setup

### Firebird Database Installeren

1. Download Firebird 4.0+ voor Windows
2. Installeer Firebird (kies "Classic Server")
3. Onthoud het SYSDBA wachtwoord (standaard: `masterkey`)

### Database Aanmaken

Open Command Prompt als Administrator:

```cmd
cd backend
dotnet tool restore
dotnet ef database update
```

### Backend Starten

```cmd
cd backend
dotnet run --urls "http://localhost:5000"
```

Of met hot-reload:

```cmd
cd backend
dotnet watch run --urls "http://localhost:5000"
```

De backend is nu beschikbaar op: http://localhost:5000

## Stap 2: Frontend Setup

### Dependencies Installeren

Open een nieuwe Command Prompt:

```cmd
cd frontend
npm install
```

### Environment Variables

Kopieer `.env.example` naar `.env.local`:

```cmd
copy .env.example .env.local
```

Controleer dat `.env.local` bevat:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Frontend Starten

```cmd
cd frontend
npm run dev
```

De frontend is nu beschikbaar op: http://localhost:3000

## Stap 3: Testen

1. Open browser: http://localhost:3000
2. Login met test account:
   - Email: `admin@clockwise.nl`
   - Password: `Admin123!`

## Veelvoorkomende Problemen

### "Cannot connect to backend"

**Oplossing 1: Firewall**
- Windows Firewall kan poort 5000 blokkeren
- Ga naar Windows Defender Firewall → Allow an app
- Voeg `dotnet.exe` toe met port 5000

**Oplossing 2: CORS Errors**
- Check of backend draait op exact `http://localhost:5000`
- Check of frontend draait op `http://localhost:3000` of `3001`
- Kijk in browser console (F12) voor CORS errors

**Oplossing 3: Port al in gebruik**

Als poort 5000 bezet is:

```cmd
# Check welk proces poort gebruikt
netstat -ano | findstr :5000

# Stop proces (vervang PID)
taskkill /PID <nummer> /F
```

### "Database connection failed"

Check `backend/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "User=SYSDBA;Password=masterkey;Database=C:\\path\\to\\CLOCKWISE.FDB;DataSource=localhost;Port=3050;Charset=UTF8"
  }
}
```

Pas het pad aan naar jouw Firebird database locatie.

### "npm ERR! code ELIFECYCLE"

1. Verwijder `node_modules` en `package-lock.json`:
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

2. Als dat niet werkt, gebruik yarn:
   ```cmd
   npm install -g yarn
   yarn install
   yarn dev
   ```

## Docker Alternative (Optioneel)

Als je Docker Desktop hebt:

```cmd
# In project root
docker-compose up
```

Dit start automatisch:
- Backend op http://localhost:5000
- Frontend op http://localhost:3000
- Firebird database

## Tips voor Windows Development

1. **Use Windows Terminal** - Mooiere terminal met tabs
2. **Use VSCode** - Beste editor voor dit project
3. **Git Bash** - Unix commands in Windows (optioneel)
4. **WSL2** - Windows Subsystem for Linux (advanced, maar beter voor dev)

## Hulp Nodig?

Check de console logs:
- Backend: In terminal waar `dotnet run` draait
- Frontend: In terminal waar `npm run dev` draait
- Browser: F12 → Console tab
