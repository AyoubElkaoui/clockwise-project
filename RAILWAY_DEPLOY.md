# Railway Deployment - Clockwise Project

## 🚂 Waarom Railway?
Railway ondersteunt persistent volumes op de free tier, perfect voor Firebird database!

## 📋 Setup Stappen

### 1. Account Aanmaken
1. Ga naar [railway.app](https://railway.app/)
2. Klik **Login** → **Login with GitHub**
3. Authoriseer Railway

### 2. Nieuw Project Maken
1. Klik **New Project**
2. Selecteer **Deploy from GitHub repo**
3. Selecteer `AyoubElkaoui/clockwise-project`
4. Railway detecteert automatisch Dockerfile

### 3. Service Configureren
Railway maakt automatisch een service aan. Nu configureren:

#### A. Root Directory instellen
1. Klik op je service
2. Ga naar **Settings** tab
3. Scroll naar **Source**
4. Bij **Root Directory**: vul in `backend`
5. Bij **Dockerfile Path**: vul in `Dockerfile`
6. Klik **Save**

#### B. Volume toevoegen (voor database)
1. Ga naar **Settings** tab
2. Scroll naar **Volumes**
3. Klik **+ Add Volume**
4. Vul in:
   - **Mount Path**: `/data`
   - **Size**: 1GB (default)
5. Klik **Add Volume**

#### C. Environment Variables
1. Ga naar **Variables** tab
2. Klik **+ New Variable**
3. Voeg toe:
   ```
   ASPNETCORE_ENVIRONMENT=Production
   PORT=8080
   ```
4. Railway genereert automatisch andere vars

### 4. Deploy
1. Railway deployed automatisch bij elke push naar GitHub
2. Of klik **Deploy** (rechtsboven)
3. Wacht ~3-5 minuten

### 5. Check Logs
1. Ga naar **Deployments** tab
2. Klik op de laatste deployment
3. Check de logs, je zou moeten zien:
   ```
   🔧 Copying initial database to /data...
   ✅ Database initialized in /data
   Now listening on: http://[::]:8080
   ```

### 6. Vind je URL
1. Ga naar **Settings** tab
2. Scroll naar **Networking**
3. Klik **Generate Domain**
4. Je krijgt een URL zoals: `clockwise-project-production.up.railway.app`

## 🔗 Vercel Koppelen
Na deploy:
1. Kopieer je Railway URL
2. Ga naar Vercel Dashboard
3. Settings → Environment Variables
4. Add: `NEXT_PUBLIC_API_URL` = `https://clockwise-project-production.up.railway.app`
5. Redeploy Vercel

## 💰 Kosten
Railway Free Tier:
- $5 gratis credits per maand
- ~500 uur uptime (ongeveer 20 dagen non-stop)
- Genoeg voor development/demo!

Als je meer nodig hebt:
- Hobby plan: $5/maand voor onbeperkt

## 🔍 Troubleshooting

### "No /data mount detected"
- Check of Volume correct is toegevoegd met mount path `/data`
- Redeploy na volume toevoegen

### Build fails
- Check of Root Directory = `backend`
- Check of Dockerfile Path = `Dockerfile`

### Database errors
- Railway volumes zijn persistent, data blijft bestaan!
- Check logs voor database initialisatie

## 🎉 Klaar!
Je Firebird database draait nu op Railway met persistent storage!

---

**Alternatief**: Fly.io heeft ook free tier met volumes, maar is iets complexer te setup.
