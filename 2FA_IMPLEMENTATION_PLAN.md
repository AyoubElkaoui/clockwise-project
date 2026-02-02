# 2FA (Two-Factor Authentication) Implementatie Plan

## Overzicht
Dit document beschrijft de stappen om 2FA toe te voegen aan de Clockwise applicatie.

## Status Wachtwoord Wijzigen
✅ **Wachtwoord wijzigen is al geïmplementeerd:**
- Frontend: `frontend/app/account/page.tsx`
- Frontend Manager: `frontend/app/manager/settings/page.tsx`
- Backend endpoint: `/users/{userId}/change-password`

## 2FA Implementatie Opties

### Optie 1: TOTP (Time-based One-Time Password) - **AANBEVOLEN**
**Moeilijkheidsgraad:** Gemiddeld (2-3 dagen)

**Voordelen:**
- Geen externe afhankelijkheden of kosten
- Werkt met Google Authenticator, Microsoft Authenticator, Authy, etc.
- Werkt ook offline
- Industrie standaard

**Technische vereisten:**
1. **Backend (.NET/C#):**
   - NuGet package: `OtpNet` (voor TOTP generatie)
   - Database: Nieuwe kolom `TwoFactorSecret` in Users tabel
   - Database: Nieuwe kolom `TwoFactorEnabled` (boolean)
   - Nieuwe endpoints:
     - `POST /auth/2fa/setup` - Genereer QR code
     - `POST /auth/2fa/verify` - Verifieer code
     - `POST /auth/2fa/disable` - Schakel 2FA uit
     - `POST /auth/login/2fa` - Login met 2FA code

2. **Frontend (React/Next.js):**
   - QR code weergave (npm package: `qrcode.react`)
   - 6-cijfer code input veld
   - Setup wizard component
   - 2FA status in account settings

**Implementatie stappen:**
```
1. Database migratie voor 2FA velden
2. Backend service voor TOTP generatie en verificatie
3. Update AuthController met 2FA endpoints
4. Frontend componenten voor setup en verificatie
5. Login flow aanpassen voor 2FA check
6. Backup codes genereren (optioneel maar aanbevolen)
```

### Optie 2: SMS-based 2FA
**Moeilijkheidsgraad:** Gemiddeld (3-4 dagen)

**Voordelen:**
- Gebruiksvriendelijk
- Geen app nodig

**Nadelen:**
- Kosten per SMS (externe service zoals Twilio)
- Minder veilig dan TOTP
- Niet werkbaar zonder mobiel bereik

**Technische vereisten:**
- Twilio account + API key
- Database: kolom voor telefoonnummer verificatie
- SMS templating

### Optie 3: Email-based 2FA
**Moeilijkheidsgraad:** Makkelijk (1-2 dagen)

**Voordelen:**
- Geen extra app nodig
- Makkelijk te implementeren

**Nadelen:**
- Minder veilig (email accounts kunnen gehacked worden)
- Afhankelijk van email leverbetrouwbaarheid
- Niet acceptabel voor hoge security vereisten

## Aanbevolen Implementatie: TOTP

### Backend Code Voorbeeld

```csharp
// Models/User.cs - Toevoegen aan User model
public string? TwoFactorSecret { get; set; }
public bool TwoFactorEnabled { get; set; }

// Services/TwoFactorService.cs
using OtpNet;

public class TwoFactorService
{
    public string GenerateSecret()
    {
        var key = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(key);
    }

    public string GenerateQrCodeUri(string email, string secret, string issuer = "Clockwise")
    {
        return $"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}";
    }

    public bool VerifyCode(string secret, string code)
    {
        var totp = new Totp(Base32Encoding.ToBytes(secret));
        return totp.VerifyTotp(code, out _, new VerificationWindow(2, 2));
    }
}

// Controllers/AuthController.cs - Nieuwe endpoints
[HttpPost("2fa/setup")]
public async Task<IActionResult> Setup2FA()
{
    var userId = GetCurrentUserId();
    var user = await _userRepository.GetByIdAsync(userId);
    
    var secret = _twoFactorService.GenerateSecret();
    user.TwoFactorSecret = secret;
    await _userRepository.UpdateAsync(user);
    
    var qrUri = _twoFactorService.GenerateQrCodeUri(user.Email, secret);
    
    return Ok(new { secret, qrUri });
}

[HttpPost("2fa/verify")]
public async Task<IActionResult> Verify2FA([FromBody] string code)
{
    var userId = GetCurrentUserId();
    var user = await _userRepository.GetByIdAsync(userId);
    
    if (string.IsNullOrEmpty(user.TwoFactorSecret))
        return BadRequest("2FA not configured");
    
    var isValid = _twoFactorService.VerifyCode(user.TwoFactorSecret, code);
    
    if (isValid)
    {
        user.TwoFactorEnabled = true;
        await _userRepository.UpdateAsync(user);
        return Ok("2FA enabled successfully");
    }
    
    return BadRequest("Invalid code");
}
```

### Frontend Code Voorbeeld

```tsx
// components/TwoFactorSetup.tsx
import { useState } from 'react';
import QRCode from 'qrcode.react';

export function TwoFactorSetup() {
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'setup' | 'verify'>('setup');

  const handleSetup = async () => {
    const response = await fetch('/api/auth/2fa/setup', { method: 'POST' });
    const data = await response.json();
    setQrCodeUri(data.qrUri);
    setSecret(data.secret);
    setStep('verify');
  };

  const handleVerify = async () => {
    const response = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationCode)
    });
    
    if (response.ok) {
      alert('2FA succesvol ingeschakeld!');
    }
  };

  if (step === 'setup') {
    return (
      <div>
        <h2>Twee-Factor Authenticatie Instellen</h2>
        <button onClick={handleSetup}>Start Setup</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Scan QR Code</h2>
      <QRCode value={qrCodeUri} size={256} />
      <p>Of voer deze code handmatig in: {secret}</p>
      
      <input
        type="text"
        placeholder="Voer 6-cijfer code in"
        maxLength={6}
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
      />
      <button onClick={handleVerify}>Verifieer</button>
    </div>
  );
}
```

## Database Migratie

```sql
-- Migrations/015_AddTwoFactorAuth.sql
ALTER TABLE MEDEWERKER 
ADD COLUMN TWO_FACTOR_SECRET VARCHAR(100),
ADD COLUMN TWO_FACTOR_ENABLED BOOLEAN DEFAULT FALSE;

-- Optioneel: Backup codes tabel
CREATE TABLE TWO_FACTOR_BACKUP_CODES (
    ID SERIAL PRIMARY KEY,
    MEDEW_GC_ID INTEGER NOT NULL,
    CODE VARCHAR(20) NOT NULL,
    USED BOOLEAN DEFAULT FALSE,
    CREATED_AT TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (MEDEW_GC_ID) REFERENCES MEDEWERKER(MEDEW_GC_ID)
);
```

## Implementatie Checklist

### Backend
- [ ] Installeer OtpNet NuGet package
- [ ] Database migratie voor 2FA velden
- [ ] TwoFactorService implementeren
- [ ] AuthController endpoints toevoegen
- [ ] Login flow updaten voor 2FA check
- [ ] Backup codes generatie (optioneel)
- [ ] Unit tests schrijven

### Frontend
- [ ] Installeer qrcode.react package
- [ ] TwoFactorSetup component maken
- [ ] Account settings pagina updaten
- [ ] Login flow updaten voor 2FA input
- [ ] Error handling en loading states
- [ ] Gebruikersinstructies/help teksten

### Testing
- [ ] Test setup flow
- [ ] Test login met 2FA
- [ ] Test verkeerde codes
- [ ] Test disable 2FA
- [ ] Test backup codes (indien geïmplementeerd)

## Geschatte tijdsinvestering

- **Backend implementatie:** 1-2 dagen
- **Frontend implementatie:** 1 dag
- **Testing en bugfixes:** 0.5-1 dag
- **Documentatie:** 0.5 dag

**Totaal: 3-4.5 dagen**

## Security Overwegingen

1. **Secret Storage:** TwoFactorSecret moet encrypted worden opgeslagen in de database
2. **Rate Limiting:** Limiteer aantal verificatie pogingen per gebruiker
3. **Backup Codes:** Genereer backup codes voor als gebruiker toegang tot authenticator app verliest
4. **Recovery Process:** Duidelijk proces voor 2FA reset door admin
5. **Session Management:** Na 2FA verificatie, sla status op in sessie

## Alternatief: Gefaseerde Rollout

### Fase 1 (Week 1-2): Wachtwoord Beveiliging Versterken
✅ Al geïmplementeerd - Wachtwoord wijzigen werkt

### Fase 2 (Week 3-4): 2FA Optioneel
- Implementeer TOTP 2FA
- Maak het optioneel voor gebruikers
- Alleen in account settings beschikbaar

### Fase 3 (Week 5-6): 2FA Verplicht voor Beheerders
- Forceer 2FA voor admin & manager rollen
- Grace period van 2 weken

### Fase 4 (Week 7+): 2FA voor Iedereen
- Geleidelijke rollout naar alle gebruikers
- Support team klaar staan voor vragen

## Kosten Overzicht

### TOTP (Aanbevolen)
- **Setup kosten:** €0
- **Maandelijkse kosten:** €0
- **Per gebruiker:** €0

### SMS-based
- **Setup kosten:** €0 (Twilio gratis trial)
- **Maandelijkse kosten:** ~€50-200 (afhankelijk van gebruikers)
- **Per SMS:** €0.07-0.15

### Email-based
- **Setup kosten:** €0
- **Maandelijkse kosten:** €0 (als je al email hebt)
- **Per email:** €0

## Conclusie

**Aanbeveling:** Implementeer TOTP-based 2FA met OtpNet.

**Redenen:**
1. Geen extra kosten
2. Hoge security standaard
3. Werkt offline
4. Geen externe afhankelijkheden
5. Gebruiksvriendelijk met populaire authenticator apps
6. Relatief eenvoudig te implementeren (3-4 dagen)

**Next Steps:**
1. Goedkeuring van stakeholders
2. Sprint planning
3. Database migratie runnen
4. Backend implementatie
5. Frontend implementatie
6. Testing
7. User documentation
8. Deployment met gefaseerde rollout
