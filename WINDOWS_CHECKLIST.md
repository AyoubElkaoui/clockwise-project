# Windows Setup Checklist voor je Vriend

## ✅ Pre-Setup Checklist

Voordat je begint, download en installeer:

- [ ] **.NET 8.0 SDK** - https://dotnet.microsoft.com/download/dotnet/8.0
- [ ] **Node.js 18+** - https://nodejs.org/ (LTS versie)
- [ ] **Git voor Windows** - https://git-scm.com/download/win
- [ ] **VS Code** (optioneel maar aanbevolen) - https://code.visualstudio.com/

## 📥 Stap 1: Project Ophalen

```cmd
git clone https://github.com/YOUR_USERNAME/clockwise-project.git
cd clockwise-project
```

## 🔧 Stap 2: Backend Setup (5 minuten)

### A. Test .NET installatie
```cmd
dotnet --version
```
Moet 8.0.x tonen

### B. Start Backend
```cmd
cd backend
dotnet restore
dotnet run --urls "http://localhost:5000"
```

**Verwachte output:**
```
Now listening on: http://localhost:5000
Application started. Press Ctrl+C to shut down.
```

### C. Test Backend (nieuwe Command Prompt)
```cmd
curl http://localhost:5000/health
```

**Moet tonen:** `{"status":"ok"}`

✅ **Backend werkt!** Laat dit terminal venster open.

## 🎨 Stap 3: Frontend Setup (5 minuten)

Open **nieuwe** Command Prompt:

### A. Test Node installatie
```cmd
node --version
npm --version
```

### B. Installeer Dependencies
```cmd
cd frontend
npm install
```

Dit duurt 2-3 minuten...

### C. Maak .env.local file

**Optie 1: Via command line**
```cmd
echo NEXT_PUBLIC_API_URL=http://localhost:5000/api > .env.local
```

**Optie 2: Handmatig**
- Maak nieuw bestand `frontend\.env.local`
- Voeg toe: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### D. Start Frontend
```cmd
npm run dev
```

**Verwachte output:**
```
▲ Next.js 15.1.7
- Local:        http://localhost:3000
```

✅ **Frontend werkt!**

## 🌐 Stap 4: Testen

1. Open browser: **http://localhost:3000**

2. Login met test account:
   - Email: `admin@clockwise.nl`
   - Password: `Admin123!`

3. Als je data ziet laden → **SUCCESS!** 🎉

## ❌ Problemen Oplossen

### "Backend draait niet"

**Check 1: Port conflict**
```cmd
netstat -ano | findstr :5000
```
Als je output ziet, is port bezet. Kill proces:
```cmd
taskkill /PID <nummer> /F
```

**Check 2: Firewall**
- Windows kan vragen om toegang → Klik **"Allow"**

**Check 3: Verkeerde directory**
```cmd
cd C:\pad\naar\clockwise-project\backend
dotnet run --urls "http://localhost:5000"
```

### "Frontend laadt geen data"

**Check 1: .env.local bestaat**
```cmd
cd frontend
type .env.local
```
Moet tonen: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

**Check 2: Backend draait echt**
Open http://localhost:5000/health in browser
→ Moet tonen: `{"status":"ok"}`

**Check 3: Browser console errors**
- Druk **F12** in browser
- Ga naar **Console** tab
- Zie je rode errors? Stuur screenshot!

**Check 4: CORS error?**
Als je in console ziet: `CORS policy: No 'Access-Control-Allow-Origin'`

Betekent: Backend accepteert je frontend port niet.

**Fix:**
1. Check op welke port frontend draait (staat in terminal, bijv. 3001)
2. Backend ondersteunt: 3000, 3001, 3002
3. Als je andere port hebt, herstart frontend met:
   ```cmd
   npm run dev -- -p 3000
   ```

### "npm install failed"

**Fix 1: Clear cache**
```cmd
npm cache clean --force
rmdir /s /q node_modules
del package-lock.json
npm install
```

**Fix 2: Run als Administrator**
- Right-click Command Prompt
- "Run as Administrator"
- Probeer opnieuw

### "Database errors"

Default gebruikt de applicatie een Firebird database die al klaarstaat.

Als je database errors krijgt:
1. Check of `database/CLOCKWISE.FDB` bestaat
2. Zo niet:
   ```cmd
   cd backend
   dotnet ef database update
   ```

## 📸 Screenshot Checklist

Als je hulp nodig hebt, stuur screenshots van:

1. **Backend terminal** - waar `dotnet run` draait
2. **Frontend terminal** - waar `npm run dev` draait  
3. **Browser console** (F12) - met eventuele errors
4. **Browser Network tab** (F12 → Network) - laat API calls zien

## 🎯 Snelle Test Commands

Test alles in één keer:

**Terminal 1 (Backend):**
```cmd
cd backend && dotnet run --urls "http://localhost:5000"
```

**Terminal 2 (Frontend):**
```cmd
cd frontend && npm run dev
```

**Terminal 3 (Test):**
```cmd
curl http://localhost:5000/health
start http://localhost:3000
```

## ✨ Je bent klaar!

Als alles werkt:
- Backend draait op port 5000
- Frontend draait op port 3000
- Je ziet data in browser
- Je kunt inloggen

**Happy coding!** 🚀

## 💬 Vragen?

Stuur me:
1. Terminal output van backend
2. Terminal output van frontend
3. Browser console screenshot (F12)
4. Exact welke stap lukt niet
