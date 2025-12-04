# Database Setup & Migrations

## Probleem: "Column unknown u.ManagerId"

Als je deze fout krijgt bij het inloggen, betekent dit dat je database schema niet up-to-date is.

## Oplossing: Automatisch (Aanbevolen)

De database migrations draaien nu **automatisch** bij elke start van de backend:

```bash
# Stop alle containers
docker compose down

# Verwijder de oude database (optioneel, alleen bij problemen)
docker volume rm clockwise-project_firebird_data

# Start opnieuw
docker compose up -d

# Check logs
docker logs clockwise-backend
```

Je zou moeten zien:
```
Database succesvol geseed (startup).
```

## Oplossing: Handmatig (Als automatisch niet werkt)

### Optie 1: SQL Direct in Database

```bash
# Open Firebird SQL shell
docker exec -it clockwise-firebird /usr/local/firebird/bin/isql \
  -user SYSDBA -password masterkey /firebird/data/CLOCKWISE.FDB

# Voer uit:
ALTER TABLE "Users" ADD "ManagerId" INTEGER;
COMMIT;
EXIT;
```

### Optie 2: Via .NET Migrations

```bash
# Ga naar backend folder
cd backend

# Run migrations
dotnet ef database update

# Of via Docker
docker exec -it clockwise-backend dotnet ef database update
```

## Hoe werkt het?

1. **Migrations**: Alle database wijzigingen zitten in `backend/Migrations/`
2. **Auto-run**: Bij opstarten draait `context.Database.Migrate()` alle pending migrations
3. **Seeding**: Test data wordt ook automatisch toegevoegd via `SeedData.Initialize()`

## ENV Variable

De automatische migrations worden geactiveerd door:

```yaml
environment:
  - SEED_ON_START=true
```

Dit staat al in `docker-compose.yml`.

## Veelvoorkomende Problemen

### "Migration already applied"
Database is al up-to-date. Geen actie nodig.

### "Table already exists"
Je hebt de tabel handmatig aangemaakt. Migrations kunnen conflicteren.

**Fix:**
```bash
# Reset database compleet
docker compose down
docker volume rm clockwise-project_firebird_data
docker compose up -d
```

### Fresh Install

Bij een nieuwe checkout:
```bash
git pull origin New-Design
docker compose down
docker compose up --build -d
```

Migrations + seeding draaien automatisch!

## Voor Developers

### Nieuwe migration maken

```bash
cd backend
dotnet ef migrations add MijnMigrationNaam
```

### Migration verwijderen (laatste)

```bash
dotnet ef migrations remove
```

### Database schema bekijken

```bash
docker exec clockwise-firebird /usr/local/firebird/bin/isql \
  -user SYSDBA -password masterkey /firebird/data/CLOCKWISE.FDB << EOF
SHOW TABLES;
SHOW TABLE Users;
EXIT;
EOF
```

## Git Workflow

Na een pull met nieuwe migrations:
```bash
git pull origin New-Design
docker compose restart backend
```

Backend ziet nieuwe migration files en draait ze automatisch!
