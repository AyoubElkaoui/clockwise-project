"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "nl" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  nl: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.hours": "Uren Registreren",
    "nav.overview": "Uren Overzicht",
    "nav.vacation": "Vakantie",
    "nav.calendar": "Kalender",
    "nav.notifications": "Notificaties",
    "nav.account": "Mijn Account",
    "nav.settings": "Instellingen",
    "nav.faq": "FAQ",
    "nav.logout": "Uitloggen",
    
    // Dashboard
    "dashboard.greeting.morning": "Goedemorgen",
    "dashboard.greeting.afternoon": "Goedemiddag",
    "dashboard.greeting.evening": "Goedenavond",
    "dashboard.subtitle": "Hier is je overzicht voor vandaag",
    "dashboard.thisWeek": "Deze Week",
    "dashboard.thisMonth": "Deze Maand",
    "dashboard.vacationDays": "Vakantiedagen",
    "dashboard.available": "Nog beschikbaar",
    "dashboard.pending": "In Behandeling",
    "dashboard.waitingApproval": "Wacht op goedkeuring",
    "dashboard.recentEntries": "Recente Registraties",
    "dashboard.viewAll": "Bekijk alles",
    "dashboard.noEntries": "Nog geen uren geregistreerd",
    "dashboard.startRegistering": "Start met registreren",
    
    // Time Entry
    "hours.title": "Uren Registreren",
    "hours.subtitle": "Registreer je gewerkte uren per project",
    "hours.project": "Project",
    "hours.selectProject": "Selecteer project",
    "hours.date": "Datum",
    "hours.hours": "Uren",
    "hours.km": "Kilometers",
    "hours.expenses": "Onkosten",
    "hours.notes": "Opmerkingen",
    "hours.save": "Opslaan",
    "hours.saving": "Opslaan...",
    
    // Overview
    "overview.title": "Uren Overzicht",
    "overview.subtitle": "Bekijk en beheer al je tijdregistraties",
    "overview.export": "Exporteren",
    "overview.previous": "Vorige",
    "overview.next": "Volgende",
    "overview.today": "Vandaag",
    "overview.week": "Week",
    "overview.month": "Maand",
    "overview.total": "Totaal Uren",
    "overview.approved": "Goedgekeurd",
    "overview.pending": "In Behandeling",
    "overview.search": "Zoek project, bedrijf of opmerkingen...",
    "overview.allStatuses": "Alle Statussen",
    "overview.noEntries": "Geen registraties",
    "overview.tryOtherFilters": "Probeer andere filters",
    
    // Vacation
    "vacation.title": "Vakantie Aanvragen",
    "vacation.subtitle": "Vraag vakantie aan en bekijk je saldo",
    "vacation.request": "Vakantie Aanvragen",
    "vacation.startDate": "Startdatum",
    "vacation.endDate": "Einddatum",
    "vacation.reason": "Reden (optioneel)",
    "vacation.submit": "Aanvraag Indienen",
    "vacation.myRequests": "Mijn Aanvragen",
    "vacation.status": "Status",
    "vacation.days": "Dagen",
    
    // Account
    "account.title": "Mijn Account",
    "account.subtitle": "Beheer je persoonlijke gegevens",
    "account.firstName": "Voornaam",
    "account.lastName": "Achternaam",
    "account.email": "E-mail",
    "account.phone": "Telefoonnummer",
    "account.save": "Wijzigingen Opslaan",
    "account.saving": "Opslaan...",
    
    // Settings
    "settings.title": "Instellingen",
    "settings.theme": "Thema",
    "settings.light": "Licht",
    "settings.dark": "Donker",
    "settings.notifications": "Notificaties Beheer",
    "settings.clearBadge": "Wis de notificatie badge in de navigatiebar",
    "settings.clearButton": "Wis Notificatie Badge",
    "settings.clearing": "Wissen...",
    
    // FAQ
    "faq.title": "Veelgestelde vragen",
    "faq.subtitle": "Antwoorden op de meest gestelde vragen over Clockwise",
    
    // Status
    "status.approved": "Goedgekeurd",
    "status.pending": "In Behandeling",
    "status.rejected": "Afgekeurd",
    "status.draft": "Concept",
    
    // Common
    "common.loading": "Laden...",
    "common.save": "Opslaan",
    "common.cancel": "Annuleren",
    "common.delete": "Verwijderen",
    "common.edit": "Bewerken",
    "common.close": "Sluiten",
    "common.search": "Zoeken",
    "common.filter": "Filteren",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.hours": "Register Hours",
    "nav.overview": "Hours Overview",
    "nav.vacation": "Vacation",
    "nav.calendar": "Calendar",
    "nav.notifications": "Notifications",
    "nav.account": "My Account",
    "nav.settings": "Settings",
    "nav.faq": "FAQ",
    "nav.logout": "Logout",
    
    // Dashboard
    "dashboard.greeting.morning": "Good morning",
    "dashboard.greeting.afternoon": "Good afternoon",
    "dashboard.greeting.evening": "Good evening",
    "dashboard.subtitle": "Here's your overview for today",
    "dashboard.thisWeek": "This Week",
    "dashboard.thisMonth": "This Month",
    "dashboard.vacationDays": "Vacation Days",
    "dashboard.available": "Still available",
    "dashboard.pending": "Pending",
    "dashboard.waitingApproval": "Waiting for approval",
    "dashboard.recentEntries": "Recent Entries",
    "dashboard.viewAll": "View all",
    "dashboard.noEntries": "No hours registered yet",
    "dashboard.startRegistering": "Start registering",
    
    // Time Entry
    "hours.title": "Register Hours",
    "hours.subtitle": "Register your worked hours per project",
    "hours.project": "Project",
    "hours.selectProject": "Select project",
    "hours.date": "Date",
    "hours.hours": "Hours",
    "hours.km": "Kilometers",
    "hours.expenses": "Expenses",
    "hours.notes": "Notes",
    "hours.save": "Save",
    "hours.saving": "Saving...",
    
    // Overview
    "overview.title": "Hours Overview",
    "overview.subtitle": "View and manage all your time entries",
    "overview.export": "Export",
    "overview.previous": "Previous",
    "overview.next": "Next",
    "overview.today": "Today",
    "overview.week": "Week",
    "overview.month": "Month",
    "overview.total": "Total Hours",
    "overview.approved": "Approved",
    "overview.pending": "Pending",
    "overview.search": "Search project, company or notes...",
    "overview.allStatuses": "All Statuses",
    "overview.noEntries": "No entries",
    "overview.tryOtherFilters": "Try other filters",
    
    // Vacation
    "vacation.title": "Request Vacation",
    "vacation.subtitle": "Request vacation and view your balance",
    "vacation.request": "Request Vacation",
    "vacation.startDate": "Start Date",
    "vacation.endDate": "End Date",
    "vacation.reason": "Reason (optional)",
    "vacation.submit": "Submit Request",
    "vacation.myRequests": "My Requests",
    "vacation.status": "Status",
    "vacation.days": "Days",
    
    // Account
    "account.title": "My Account",
    "account.subtitle": "Manage your personal information",
    "account.firstName": "First Name",
    "account.lastName": "Last Name",
    "account.email": "Email",
    "account.phone": "Phone Number",
    "account.save": "Save Changes",
    "account.saving": "Saving...",
    
    // Settings
    "settings.title": "Settings",
    "settings.theme": "Theme",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.notifications": "Notifications Management",
    "settings.clearBadge": "Clear the notification badge in the navigation bar",
    "settings.clearButton": "Clear Notification Badge",
    "settings.clearing": "Clearing...",
    
    // FAQ
    "faq.title": "Frequently Asked Questions",
    "faq.subtitle": "Answers to the most common questions about Clockwise",
    
    // Status
    "status.approved": "Approved",
    "status.pending": "Pending",
    "status.rejected": "Rejected",
    "status.draft": "Draft",
    
    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.close": "Close",
    "common.search": "Search",
    "common.filter": "Filter",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("nl");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage && (savedLanguage === "nl" || savedLanguage === "en")) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
