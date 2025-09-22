# Clockwise Project - Complete Docker Setup

## Voor iedereen - Supersimpel starten

### Stap 1: Docker installeren

**Windows:**

1. Ga naar [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Download en installeer Docker Desktop
3. Herstart Windows
4. Zorg dat Docker Desktop draait (icoontje rechtsonder in systray)

**Mac:**

1. Ga naar [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Download en installeer Docker Desktop
3. Herstart Mac

**Linux (Ubuntu/Debian):**

```bash
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log uit en weer in
```

**Linux (Fedora):**

```bash
sudo dnf install docker docker-compose-plugin
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log uit en weer in
```

---

### Stap 2: Project ophalen en starten

```bash
git clone [jouw-repo-url]
cd clockwise-project
npm run docker:up
```

**Windows gebruikers:** open PowerShell of Command Prompt.

---

### Stap 3: Wachten en gebruiken (2-3 minuten)

* **Website:** [http://localhost:3000](http://localhost:3000)
* **Login:** [ayoub@example.com](mailto:ayoub@example.com)
* **Wachtwoord:** password123

---

### Project stoppen

```bash
npm run docker:down
```

### Handig voor development

```bash
npm run docker:logs      # Bekijk wat er gebeurt
npm run docker:restart   # Herstart alles
npm run docker:clean     # Reset database + volumes
```

---

## Wat gebeurt er automatisch?

### Database Seeding

De database wordt **automatisch gevuld** met testdata elke keer als je het project start. Dit gebeurt in `backend/Program.cs`:

* Database wordt aangemaakt (Firebird)
* Tabellen worden aangemaakt via Entity Framework migrations
* Testdata wordt toegevoegd (gebruikers, projecten, etc.)
* Je kunt direct inloggen met de testgebruikers

**Geen handmatige database setup nodig!**

### Wat draait er?

* **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
* **Backend API (.NET):** [http://localhost:5000](http://localhost:5000)
* **Database (Firebird):** Draait automatisch in container
* **Hot reload:** Code wijzigingen zijn direct zichtbaar

---

## Troubleshooting

### Windows specifiek

* **Docker Desktop moet draaien** (check systray rechtsonder)
* **Permission errors:** Run PowerShell "Als Administrator"
* **Poorten bezet:** Herstart Windows
* **Git niet gevonden:** Installeer [Git for Windows](https://git-scm.com/download/win)

### Algemene problemen

```bash
# Docker werkt niet
docker --version        # Check of Docker werkt
docker ps               # Check draaiende containers

# Project werkt niet  
npm run docker:logs     # Kijk wat er fout gaat
npm run docker:clean    # Reset alles
npm run docker:up       # Start opnieuw

# Poorten bezet
# Stop andere programma's die poort 3000 of 5000 gebruiken
```

### Database problemen

Als login niet werkt:

1. `npm run docker:clean` (reset database)
2. `npm run docker:up` (start opnieuw)
3. Wacht 3 minuten voor seeding
4. Probeer login: `ayoub@example.com / password123`

---

## Voor ontwikkelaars

### Wat je NIET hoeft te installeren

* ❌ .NET SDK
* ❌ Node.js
* ❌ Firebird database
* ❌ Andere dependencies

### Wat je WEL nodig hebt

* ✅ Docker Desktop
* ✅ Git (voor Windows: git-scm.com)
* ✅ Code editor (VS Code aangeraden)

### Development workflow

1. `npm run docker:up` - Start alles
2. Edit code - Changes zijn direct zichtbaar
3. `npm run docker:logs` - Als je errors ziet
4. `npm run docker:down` - Stop als je klaar bent

**Dat is alles! Database, API, Frontend - alles werkt automatisch.**

---

## Technical Details

### Docker Containers

* Firebird 3.0 database → `clockwise-firebird`
* .NET 8.0 API server → `clockwise-backend`
* Next.js 15 development server → `clockwise-frontend`

### Auto-seeding Process

Bij elke start van de backend container:

1. Check database connectie naar Firebird
2. Run Entity Framework migrations (maak tabellen)
3. Run `SeedData.Initialize()` (vul testdata)
4. API is ready voor gebruik
