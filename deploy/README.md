# Clockd op de klantserver

Doel: backend en Cloudflare-tunnel draaien altijd, starten vanzelf na een herstart, en herstellen zichzelf.

## Mappen op de server

```
C:\Clockd\backend\            gepubliceerde backend (publish.ps1)
C:\Clockd\clockd.env          configuratie en wachtwoorden (nooit in git)
C:\Clockd\cloudflared\cloudflared.exe
C:\Clockd\logs\               supervisor.log, backend.*.log, cloudflared.*.log
```

## Eerste keer

1. Repo op de server bijwerken: `git pull`
2. `powershell -ExecutionPolicy Bypass -File deploy\publish.ps1`
3. `C:\Clockd\clockd.env` invullen (wordt aangemaakt uit `clockd.env.example`)
4. `cloudflared-windows-amd64.exe` kopiëren naar `C:\Clockd\cloudflared\cloudflared.exe`
5. Kies:
   - **Met adminrechten (24/7, aanbevolen):** `deploy\install-services.ps1` als administrator. Maakt de services `Clockd.Backend` en `Cloudflared`, wachten op Firebird, herstarten bij een crash.
   - **Zonder adminrechten:** `deploy\install-logon-task.ps1`. Start de supervisor bij aanmelden; die start backend, wacht op `/api/health`, start dan de tunnel en herstart beide als ze stoppen.

## Update uitrollen

```
git pull
powershell -ExecutionPolicy Bypass -File deploy\publish.ps1
```
Met services: publish stopt en start `Clockd.Backend` zelf. Met de supervisor: de backend-taak beëindigen (Taakbeheer, `dotnet.exe` van C:\Clockd\backend) of afmelden/aanmelden; de supervisor start hem opnieuw.

## Controleren

- `http://localhost:5000/api/health` geeft 200 met `firebird: ok` en `postgres: ok`. Bij 503 staat de reden erbij.
- De backend weigert te starten bij een onvolledige configuratie en zegt precies welke variabele ontbreekt.
- Bij een onbereikbare database blijft de backend draaien en probeert het elke minuut opnieuw; de tunnel krijgt 503 in plaats van "connection refused".
