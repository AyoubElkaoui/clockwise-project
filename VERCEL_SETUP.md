# Vercel Frontend Setup - Clockwise Project

## 🎯 Doel
Koppel je Vercel frontend aan je Render backend.

## 📋 Stappen

### 1. Vind je Render Backend URL
In de Render logs screenshot zie ik:
```
Your service is live at https://clockwise-project-1.onrender.com
```

Dit is je **backend URL**! 🎉

### 2. Voeg Environment Variable toe in Vercel

#### Via Vercel Dashboard:
1. Ga naar [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecteer je `clockwise-project` (frontend)
3. Ga naar **Settings** → **Environment Variables**
4. Voeg toe:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://clockwise-project-1.onrender.com`
   - **Environments**: Selecteer `Production`, `Preview`, en `Development`
5. Klik **Save**

**Let op**: De backend gebruikt `/api` prefix voor alle routes. De frontend voegt dit automatisch toe, dus gebruik GEEN `/api` in de environment variable!

#### Of via Vercel CLI (als je die hebt):
```bash
cd frontend
vercel env add NEXT_PUBLIC_API_URL
# Voer in: https://clockwise-project-1.onrender.com
# Selecteer: Production, Preview, Development
```

### 3. Redeploy je Frontend
Na het toevoegen van de environment variable:
1. Ga naar **Deployments** tab in Vercel
2. Klik op de laatste deployment
3. Klik **Redeploy** (rechtsboven met 3 puntjes)
4. Selecteer **Use existing Build Cache** (sneller) of niet (fresh build)

### 4. CORS Configureren op Backend
Je backend moet requests van je Vercel frontend accepteren.

In `backend/Program.cs`, zorg dat CORS goed is ingesteld:

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "https://clockwise-project.vercel.app", // Je Vercel URL
                "https://*.vercel.app" // Alle Vercel preview deployments
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});
```

### 5. Test de Connectie
1. Open je Vercel frontend: `https://clockwise-project.vercel.app`
2. Open browser console (F12)
3. Probeer in te loggen of data te laden
4. Check de console logs:
   ```
   🚀 API Request: GET https://clockwise-project-1.onrender.com/users
   ✅ API Response: 200 /users
   ```

## 🔍 Troubleshooting

### "CORS policy" error
**Probleem**: Backend blokkeert requests van Vercel.

**Oplossing**: 
1. Check `Program.cs` CORS configuratie (zie stap 4)
2. Voeg je Vercel URL toe aan `WithOrigins()`
3. Commit + push naar GitHub
4. Render zal automatisch redeployen

### "Failed to fetch" of "Network Error"
**Probleem**: Backend URL is verkeerd of backend is down.

**Oplossing**:
1. Check of `NEXT_PUBLIC_API_URL` correct is in Vercel
2. Test backend direct: `curl https://clockwise-project-1.onrender.com/users`
3. Check Render logs of backend draait

### "404 Not Found"
**Probleem**: API endpoint bestaat niet.

**Oplossing**:
1. Check welke endpoints beschikbaar zijn in backend
2. Verifieer de URL in `frontend/lib/api.ts`

## 🎨 Lokaal Testen met Render Backend
Als je lokaal wilt testen met de productie backend:

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=https://clockwise-project-1.onrender.com" > .env.local
npm run dev
```

Dan draait je lokale frontend tegen de Render backend!

## 📝 Vercel Environment Variables Overzicht

| Variable | Waarde | Omgeving |
|----------|--------|----------|
| `NEXT_PUBLIC_API_URL` | `https://clockwise-project-1.onrender.com` | Production, Preview, Development |

---

**🎉 Done!** Je frontend op Vercel praat nu met je backend op Render via de database op persistent storage!
