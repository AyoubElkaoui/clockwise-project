# 🚀 Clockwise - Modern Time Registration System

## ✨ Nieuwe Features - October 2025 Update

### 🎨 Modern Design System
- **Light & Dark Theme** - Volledig thema systeem met instant switch
- **Modern UI Components** - Complete component library met:
  - Cards met variants (elevated, gradient, ghost)
  - Buttons met loading states
  - Input fields met icons en errors
  - Badges voor status indicators
  - Stat cards voor metrics
- **Smooth Animations** - Framer Motion integraties
- **Responsive Design** - Werkt perfect op desktop, tablet en mobiel

### 📱 Moderne Sidebar Navigation
- **Collapsible Sidebar** - Inklapbaar voor meer werkruimte
- **Icon-based Navigation** - Duidelijke iconografie
- **Notification Badges** - Real-time meldingen
- **Theme Toggle** - Snel wisselen tussen light/dark
- **User Profile** - Avatar en rol weergave
- **Active State** - Visuele feedback van huidige pagina

### 🏠 Dashboard
- **Quick Stats Cards**:
  - Gewone uren deze week
  - Totaal uren deze maand
  - Vakantiedagen resterend
- **Uren Invoeren Widget** - Direct uren registreren
- **Progress Bar** - Visuele voortgang van week
- **Week Overzicht** - Dag-voor-dag overzicht met status
- **Recent Registraties** - Laatste tijdregistraties

### ⏰ Tijd Registratie
- **Intuitive Form** - Eenvoudig uren invoeren
- **Real-time Berekening** - Auto-calculate gewerkte uren
- **Project Selectie** - Dropdown met alle projecten
- **Datum Picker** - Kalender interface
- **Start/Eind Tijd** - Time pickers
- **Pauze Registratie** - Automatische aftrek
- **Beschrijving** - Rich text voor details

### 📊 Uren Overzicht
- **Filter & Search** - Zoek in tijdregistraties
- **Status Overview** - Totaal, goedgekeurd, in behandeling
- **Export Functie** - Download als CSV/Excel
- **List View** - Chronologisch overzicht
- **Quick Stats** - Instant metrics

### 🏖️ Vakantie Management
- **Balance Display** - Visuele weergave van saldo
  - Totaal dagen
  - Goedgekeurde dagen
  - In behandeling
  - Beschikbaar
- **Aanvraag Lijst** - Al je vakantieaanvragen
- **Status Badges** - Color-coded statussen
- **Type Filtering** - Jaarlijks, dokter, etc.
- **Nieuwe Aanvraag** - Quick action button

### 🔔 Notificaties Systeem
- **Real-time Meldingen** - Instant updates
- **Priority Levels** - Urgent, normaal, laag
- **Type Categories**:
  - Urenstaat inleveren
  - Vakantie goedkeuring
  - Nieuwe projecten
  - Team meetings
  - Systeem updates
- **Mark as Read** - Bulk actions
- **Delete Options** - Per notificatie of bulk

### 👤 Mijn Account
- **Profiel Informatie**:
  - Avatar met initials
  - Naam, email, telefoon
  - Afdeling en functie
  - Locatie
- **Beveiliging**:
  - Wachtwoord wijzigen
  - Security validation
- **Voorkeuren**:
  - E-mail notificaties
  - Browser notificaties
  - Dagelijkse herinneringen
  - Wekelijkse rapporten
  - Vakantie herinneringen

### ⚙️ Instellingen
- **Algemene Instellingen**:
  - Standaard werkuren per dag (slider)
  - Begin van de week
  - Tijd format (24u/12u)
  - Datum format
- **Tijd Automatisering**:
  - Auto-afronden toggle
  - Beschrijving verplicht
  - Overwerk toestaan
  - Pauze herinneringen
- **Data Beheer**:
  - Exporteren (CSV/Excel)
  - Importeren
  - Reset functie

### 📅 Kalender View
- **Maand Overzicht** - Visuele kalender
- **Dag Indicators** - Uren per dag weergave
- **Status Colors** - Goedgekeurd/in behandeling
- **Navigation** - Prev/Next maand
- **Today Button** - Spring naar vandaag
- **Month Summary** - Statistieken onderaan

## 🛠️ Tech Stack Updates

### Frontend
- **Next.js 15** - Latest React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Modern icon set
- **Zustand** - State management
- **React Query** - Data fetching
- **Framer Motion** - Animations
- **Radix UI** - Headless components
- **class-variance-authority** - Component variants

### Design System
- **Design Tokens** - Centralized theming
- **Dark Mode** - Full dark theme support
- **Theme Context** - React context for theme
- **Utility Functions** - Date formatting, calculations
- **Custom Hooks** - Reusable logic

## 🚀 Quick Start

```bash
# Clone repository
git clone [your-repo]
cd clockwise-project

# Start with Docker
npm run docker:up

# Access application
open http://localhost:3000
```

**Default Login:**
- Email: `ayoub@example.com`
- Password: `password123`

## 📱 Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Main overview with stats |
| `/tijd-registratie` | Tijd Registratie | Register working hours |
| `/uren-overzicht` | Uren Overzicht | View all time entries |
| `/vakantie` | Vakantie | Vacation management |
| `/notificaties` | Notificaties | Notification center |
| `/account` | Mijn Account | Profile settings |
| `/instellingen` | Instellingen | App settings |
| `/kalender` | Kalender | Calendar view |

## 🎨 Theme System

### Light Theme
- Clean, modern look
- High contrast for readability
- Blue accent color (#3b82f6)
- White backgrounds

### Dark Theme
- Easy on the eyes
- Slate-900 background
- Slate-800 cards
- Adjusted contrast ratios

### Toggle Theme
Click the sun/moon icon in sidebar to switch instantly!

## 🔧 Component Library

All components in `/frontend/components/ui/`:

- `button.tsx` - Multiple variants with loading states
- `card.tsx` - Container with hover effects
- `input.tsx` - Form inputs with icons
- `badge.tsx` - Status indicators
- `stat-card.tsx` - Dashboard metrics
- `theme-toggle.tsx` - Theme switcher

## 📊 Features Status

| Feature | Status | Priority |
|---------|--------|----------|
| ✅ Modern Design | Complete | High |
| ✅ Light/Dark Theme | Complete | High |
| ✅ Dashboard | Complete | High |
| ✅ Tijd Registratie | Complete | High |
| ✅ Uren Overzicht | Complete | High |
| ✅ Vakantie Systeem | Complete | High |
| ✅ Notificaties | Complete | Medium |
| ✅ Account Beheer | Complete | Medium |
| ✅ Instellingen | Complete | Medium |
| ✅ Kalender View | Complete | Medium |
| 🔄 API Integration | In Progress | High |
| ⏳ Email System | Planned | Medium |
| ⏳ Rapporten | Planned | Low |

## 🎯 Next Steps

### Immediate (This Week)
1. **Connect to Real API** - Replace mock data
2. **Form Validation** - Client & server side
3. **Error Handling** - Toast notifications
4. **Loading States** - Skeleton loaders

### Short Term (Next 2 Weeks)
1. **Syntess Sync** - Automate to Firebird
2. **Email Notifications** - Setup triggers
3. **Export Functions** - CSV/Excel generation
4. **Advanced Filtering** - Multi-criteria filters

### Medium Term (Next Month)
1. **Rapporten & Analytics** - Charts, trends
2. **Team Features** - Manager views
3. **Mobile App** - React Native consideration
4. **Offline Support** - PWA features

## 💡 Tips voor Gebruik

### Voor Gebruikers
- Registreer uren dagelijks voor nauwkeurigheid
- Gebruik beschrijvingen voor duidelijkheid
- Check notificaties regelmatig
- Vraag vakantie tijdig aan

### Voor Developers
- Gebruik de design tokens voor consistency
- Follow component patterns
- Test in beide themes
- Keep accessibility in mind

## 🤝 Contributing

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes & commit
git commit -m "Add: your feature"

# Push & create PR
git push origin feature/your-feature
```

## 📞 Support

Vragen? Contact:
- **Developer**: Ayoub
- **Company**: Elmar Services
- **Project**: Clockwise Time Registration

---

**Built with ❤️ for Elmar Services**

*Last Updated: October 30, 2025*
