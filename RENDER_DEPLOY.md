# Render Deployment Instructies voor Clockwise

## 🎯 Probleem
Firebird is een **file-based database** die schrijfrechten nodig heeft. Op Render gaan wijzigingen in het container-filesystem verloren bij herstart, tenzij je een **Persistent Disk** gebruikt.

## ✅ Oplossing: Render Disk toevoegen

### Stap 1: Maak de Web Service aan (als je dit nog niet hebt gedaan)
1. Ga naar [Render Dashboard](https://dashboard.render.com/)
2. Klik **New +** → **Web Service**
3. Connect je GitHub repository: `AyoubElkaoui/clockwise-project`
4. Configureer:
   - **Name**: `clockwise-backend` (of andere naam)
   - **Region**: `Frankfurt (EU Central)` (dichtst bij NL)
   - **Branch**: `main`
   - **Root Directory**: laat leeg (auto-detect)
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `backend/Dockerfile` (✅ belangrijk!)
   - **Docker Build Context Directory**: `.` (de root van je repo)
   - **Instance Type**: `Free`

### Stap 2: Voeg een Persistent Disk toe 🔥 BELANGRIJK
1. Ga naar je web service in Render
2. Klik op **Settings** (linker sidebar)
3. Scroll naar beneden naar **Disks**
4. Klik **Add Disk**:
   - **Name**: `firebird-data` (of andere naam)
   - **Mount Path**: `/data` (✅ exact dit pad!)
   - **Size**: `1 GB` (gratis tier maximum)
5. Klik **Create**

### Stap 3: Environment Variables (optioneel)
In **Environment** tab, voeg toe:
- `ASPNETCORE_ENVIRONMENT`: `Production`
- `NEED_ON_START`: `true` (optioneel, forceert start healthcheck)

### Stap 4: Deploy
1. Klik **Manual Deploy** → **Deploy latest commit**
2. Wacht tot de build + deploy klaar is (~3-5 minuten)
3. Check de logs voor:
   ```
   🔧 Copying initial database to /data...
   ✅ Database initialized in /data
   ```

## 📝 Wat er nu gebeurt
1. De Dockerfile bouwt je backend met Firebird-ondersteuning
2. De database `CLOCKWISE.FDB` wordt als template (`CLOCKWISE.FDB.initial`) in de image gestopt
3. Bij de eerste start kopieert `entrypoint.sh` deze naar `/data/CLOCKWISE.FDB`
4. `/data` is gemount als persistent disk → **data blijft bestaan bij herstart!**

## 🔍 Troubleshooting

### "Failed to initialize database"
- Check of de Disk correct is aangemaakt met mount path `/data`
- Herstart de service: **Manual Deploy** → **Clear build cache & deploy**

### "Could not open database"
Logs bekijken:
```bash
# In Render dashboard → Logs tab
# Zoek naar:
⚠️  No /data mount detected
```
→ Dit betekent dat de disk nog niet is gemount. Voeg de disk toe en deploy opnieuw.

### "Database locked" of "Database is already in use"
Firebird Embedded heeft soms moeite met concurrent gebruik:
- Zet `Pooling=false` in connection string (✅ al gedaan)
- Herstart de service

## 🎨 Frontend op Render deployen

Voor de frontend (Next.js):

### Stap 1: Maak een Static Site aan
1. **New +** → **Static Site**
2. Repository: `AyoubElkaoui/clockwise-project`
3. Configureer:
   - **Name**: `clockwise-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `.next` (Next.js gebruikt server-side rendering)

**Let op**: Voor Next.js met API routes heb je eigenlijk een **Web Service** nodig, geen Static Site!

### Stap 2: Als Web Service (aanbevolen voor Next.js)
1. **New +** → **Web Service**
2. Repository: `AyoubElkaoui/clockwise-project`
3. Configureer:
   - **Name**: `clockwise-frontend`
   - **Region**: `Frankfurt (EU Central)`
   - **Branch**: `main`
   - **Root Directory**: laat leeg
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `frontend/Dockerfile`
   - **Docker Build Context Directory**: `.`

### Stap 3: Environment Variables voor frontend
```
NEXT_PUBLIC_API_URL=https://clockwise-backend.onrender.com
```
(vervang door je backend URL)

## 🚀 Resultaat
- **Backend**: `https://clockwise-backend.onrender.com`
- **Frontend**: `https://clockwise-frontend.onrender.com`
- **Database**: Persistent opgeslagen in `/data` op de backend service

---

**🎉 Klaar!** Je applicatie draait nu op Render met een persistent Firebird database.
