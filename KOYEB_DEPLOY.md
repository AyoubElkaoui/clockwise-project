# Koyeb Deployment - Clockwise Backend met Firebird

## 🎯 Waarom Koyeb?
- ✅ **100% Altijd gratis** (geen expiring credits!)
- ✅ **2GB Persistent Volumes** gratis (perfect voor Firebird)
- ✅ Automatic deploys vanaf GitHub
- ✅ **Geen creditcard nodig**

Je had hier al een deployment draaien!

## 📋 Setup Stappen

### 1. Login
1. Ga naar [koyeb.com](https://www.koyeb.com/)
2. Login met GitHub account

### 2. Nieuw Service Maken
1. Klik **Create App** of **New Service**
2. Selecteer **GitHub**
3. Connect repository: `AyoubElkaoui/clockwise-project`
4. Kies **branch**: `main`

### 3. Build Configuratie
1. **Builder**: Selecteer `Dockerfile`
2. **Dockerfile path**: `backend/Dockerfile`
3. **Docker build context**: `.` (root van repo)

### 4. Environment Variables
Voeg toe:
```
ASPNETCORE_ENVIRONMENT=Production
PORT=8000
```

### 5. Persistent Volume Toevoegen 🔥 BELANGRIJK!
1. Scroll naar **Persistent Volumes**
2. Klik **Add Volume**
3. Vul in:
   - **Mount path**: `/data`
   - **Size**: 1 GB (je krijgt 2GB gratis)
4. Klik **Create**

### 6. Region & Instance
1. **Region**: Frankfurt (dichtstbij NL)
2. **Instance**: Nano (gratis tier)

### 7. Deploy!
1. Klik **Deploy**
2. Wacht ~3-5 minuten voor build + deploy
3. Check logs voor:
   ```
   🔧 Copying initial database to /data...
   ✅ Database initialized in /data
   ```

### 8. Vind je Public URL
Na deploy zie je de URL, bijvoorbeeld:
```
https://peculiar-lauralee-akws-d0439e43.koyeb.app
```

## 🔗 Vercel Updaten
1. Ga naar Vercel Dashboard
2. Je project → Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL`:
   ```
   https://jouw-app-naam.koyeb.app
   ```
4. Redeploy Vercel frontend

## ✅ Checklist na Deploy

- [ ] Backend draait op Koyeb
- [ ] Volume is mounted op `/data`
- [ ] Database is geïnitialiseerd
- [ ] Endpoints werken: `curl https://jouw-url.koyeb.app/api/users`
- [ ] CORS is geconfigureerd voor Vercel
- [ ] Vercel gebruikt nieuwe Koyeb URL

## 🔍 Troubleshooting

### "No /data mount detected"
**Probleem**: Volume niet correct toegevoegd.
**Fix**: 
1. Ga naar je service settings
2. Voeg Volume toe met mount path `/data`
3. Redeploy

### "Database cannot be created"
**Probleem**: Permissies of volume niet beschrijfbaar.
**Fix**: De entrypoint.sh script handelt dit af, check logs.

### CORS Errors
**Fix**: Backend Program.cs heeft al Vercel toegevoegd, maar check of je domain klopt.

## 💰 Kosten
**Gratis tier**:
- 2GB persistent volumes
- ~100 uur compute/maand
- Genoeg voor development + klein gebruik!

Als je meer nodig hebt:
- Eco: $5.50/maand voor meer compute hours

## 🎉 Voordelen t.o.v. Render
✅ Persistent volumes op free tier!
✅ Geen expiring credits
✅ Simpelere setup
✅ Je had het al gebruikt!

---

**Let op**: Zorg dat je Volume toevoegt VOOR de eerste deploy, of redeploy na volume toevoegen!
