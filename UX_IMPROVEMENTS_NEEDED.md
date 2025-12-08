# User Experience Verbeteringen Nodig

## 🚨 Kritieke Problemen Voor Gebruikers

### 1. **Alert() Popups** ⭐ HOOGSTE PRIORITEIT
**Probleem:** Verouderde `alert()` dialogen blokkeren de hele pagina
**Locaties:**
- `admin/users/create/page.tsx` - Bij aanmaken gebruiker
- `(dashboard)/register-time/page.tsx` - Bij uren opslaan  
- `admin/settings/page.tsx` - Bij backup

**Oplossing:** Modern toast notification systeem (✅ GEMAAKT: `components/ui/toast.tsx`)

**Gebruik:**
```typescript
import { showToast } from "@/components/ui/toast";

// Succes
showToast("Gebruiker aangemaakt!", "success");

// Error
showToast("Er ging iets mis", "error");

// Info
showToast("Let op: ...", "info");

// Warning  
showToast("Waarschuwing!", "warning");
```

---

### 2. **Geen Loading States** ⭐ HOOGSTE PRIORITEIT
**Probleem:** Gebruiker ziet niet of data aan het laden is
**Effect:** Gebruiker klikt meerdere keren, denkt dat app niet werkt

**Locaties waar loading mist:**
- `manager/approve/page.tsx` - Bij laden uren
- `manager/dashboard/page.tsx` - Bij laden dashboard
- `admin/page.tsx` - Bij laden statistieken  
- `account/page.tsx` - Bij laden profiel
- Alle pages met `useEffect(() => { loadData(); }, [])`

**Oplossing Nodig:**
```typescript
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function load() {
    setIsLoading(true);
    try {
      const data = await fetchData();
      setData(data);
    } finally {
      setIsLoading(false);
    }
  }
  load();
}, []);

if (isLoading) {
  return <LoadingSpinner />;  // ← Maak deze component
}
```

---

### 3. **Generieke Error Messages** ⭐ HOGE PRIORITEIT
**Probleem:** "Er is een fout opgetreden" helpt gebruiker niet
**Locaties:** Overal waar `console.error()` wordt gebruikt

**Betere Errors:**
```typescript
// ❌ SLECHT
catch (error) {
  console.error("Failed to load:", error);
  // Gebruiker ziet niks!
}

// ✅ GOED
catch (error) {
  const message = error instanceof Error 
    ? error.message 
    : "Er ging iets mis bij het laden van de gegevens";
  showToast(message, "error");
}
```

---

### 4. **LocalStorage Zonder Checks** ⚠️ GEMIDDELDE PRIORITEIT
**Probleem:** App crasht als gebruiker niet ingelogd is
**Locaties:** 30+ plekken waar `localStorage.getItem("userId")` direct wordt gebruikt

**Oplossing Nodig:**
```typescript
// Maak helper functie
export function getUserId(): number | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("userId");
  return id ? Number(id) : null;
}

// Gebruik overal
const userId = getUserId();
if (!userId) {
  router.push("/login");
  return;
}
```

---

### 5. **Ontbrekende Feedback Bij Acties** ⚠️ GEMIDDELDE PRIORITEIT
**Probleem:** Knoppen geven geen feedback na klikken

**Voorbeelden:**
- Goedkeuren/Afwijzen buttons - geen loading state
- Opslaan buttons - geen disabled tijdens save
- Verwijder buttons - geen confirmatie

**Oplossing:**
```typescript
const [isSaving, setIsSaving] = useState(false);

async function handleApprove() {
  setIsSaving(true);
  try {
    await approveEntry(entryId);
    showToast("Goedgekeurd!", "success");
  } catch (error) {
    showToast("Goedkeuren mislukt", "error");
  } finally {
    setIsSaving(false);
  }
}

<button 
  disabled={isSaving}
  className={isSaving ? "opacity-50 cursor-not-allowed" : ""}
>
  {isSaving ? "Bezig..." : "Goedkeuren"}
</button>
```

---

## 📱 Mobiele Problemen

### 6. **Sidebar Niet Responsive**
**Probleem:** Sidebar staat altijd open op mobiel
**Oplossing Nodig:** Hamburger menu voor klein scherm

---

### 7. **Tabel Overflow Op Mobiel**  
**Probleem:** Tabellen scrollen niet horizontaal
**Locaties:** Admin/Manager overview pages

**Oplossing:**
```tsx
<div className="overflow-x-auto">
  <table className="min-w-[800px]">
    {/* tabel content */}
  </table>
</div>
```

---

## 🎨 Visuele Problemen

### 8. **Inconsistente Error Styling**
- Sommige errors zijn rood
- Sommige alleen in console
- Sommige als alert()

**Oplossing:** Overal toast gebruiken met consistent type

---

### 9. **Geen Empty States**
**Probleem:** Lege tabellen tonen niks
**Locaties:** Overal waar `.map()` wordt gebruikt

**Oplossing:**
```tsx
{entries.length === 0 ? (
  <div className="text-center py-12 text-gray-500">
    <p>Geen uren gevonden</p>
    <button>Voeg eerste uur toe</button>
  </div>
) : (
  entries.map(entry => <EntryRow key={entry.id} entry={entry} />)
)}
```

---

## 🔒 Security & Auth Problemen

### 10. **Geen Auth Protection**
**Probleem:** Gebruiker kan direct naar admin pages zonder login
**Oplossing Nodig:** Middleware of layout check

---

### 11. **Wachtwoord In Plain Text Visible**
**Probleem:** Login page toont wachtwoord bij "Toon Wachtwoord"
**Status:** Dit is OK, maar moet toggle hebben

---

## 🚀 Te Maken Components

### LoadingSpinner Component
```tsx
// components/ui/loading-spinner.tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
```

### EmptyState Component
```tsx
// components/ui/empty-state.tsx
export function EmptyState({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description?: string; 
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-gray-500 mt-2">{description}</p>}
      {action && (
        <button 
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

### ConfirmDialog Component
```tsx
// components/ui/confirm-dialog.tsx
// Voor "Weet je zeker dat je wilt verwijderen?" acties
```

---

## 📝 Actie Plan (Prioriteit)

1. ✅ **Toast System** - KLAAR
2. ⏳ **Replace alle alert() calls** - IN UITVOERING
3. ⏳ **LoadingSpinner component maken**
4. ⏳ **Loading states toevoegen aan alle data fetch pages**
5. ⏳ **Error handling verbeteren** (overal waar console.error is)
6. ⏳ **LocalStorage helper functies maken**
7. ⏳ **Button loading states toevoegen**
8. ⏳ **Empty states toevoegen**
9. ⏳ **Mobile responsive fixes**
10. ⏳ **Auth protection toevoegen**

---

## 🎯 Wat Betekent Dit Voor Gebruikers?

### Voor:
- ❌ Irritante alert() popups
- ❌ "Is het aan het laden?" onzekerheid
- ❌ Cryptische foutmeldingen
- ❌ App crasht als je niet ingelogd bent
- ❌ Geen feedback bij knoppen

### Na Fixes:
- ✅ Moderne, mooie notificaties
- ✅ Duidelijke loading indicators
- ✅ Begrijpelijke foutmeldingen
- ✅ Graceful error handling
- ✅ Instant button feedback

---

## 💡 Extra Suggesties

### Keyboard Shortcuts
- `Ctrl+S` voor opslaan
- `Escape` voor annuleren  
- `Enter` in forms voor submit

### Autosave
- Tijd registratie auto-opslaan elke 30 sec
- Draft vakantie aanvragen

### Offline Support
- Service Worker voor offline beschikbaarheid
- Sync wanneer online komt

### Performance
- Lazy loading van tabellen (pagination)
- Image optimization (Next.js Image)
- Code splitting per route

---

## 🔄 Testing Checklist

- [ ] Login werkt op mobiel
- [ ] Sidebar werkt op klein scherm
- [ ] Alle knoppen geven feedback
- [ ] Errors zijn begrijpelijk
- [ ] Loading states overal zichtbaar
- [ ] Lege tabellen tonen empty state
- [ ] Toasts verdwijnen automatisch
- [ ] Geen console.errors meer zichtbaar
- [ ] LocalStorage errors worden opgevangen
- [ ] Auth redirect werkt correct
