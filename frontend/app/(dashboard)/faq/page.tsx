import FaqAccordion from "./FaqAccordion";

// ✅ MODERN shell gebruiken (niet de oude)
import ModernLayout from "@/components/ModernLayout";

export const metadata = {
  title: "FAQ | Clockwise",
};

const faqs = [
  {
    category: "Urenregistratie",
    items: [
      {
        q: "Hoe registreer ik uren?",
        a: "Ga naar 'Uren Registreren', kies een project en vul je uren in. Klik op Opslaan.",
      },
      {
        q: "Kan ik uren op meerdere projecten op één dag boeken?",
        a: "Ja, je kunt meerdere regels toevoegen en je uren verdelen over de juiste projecten.",
      },
      {
        q: "Wat moet ik invullen bij omschrijving/opmerking?",
        a: "Schrijf kort wat je hebt gedaan, bijvoorbeeld: 'administratie', 'project X' of 'training'.",
      },
    ],
  },
  {
    category: "Uren aanpassen & goedkeuren",
    items: [
      {
        q: "Kan ik uren achteraf aanpassen?",
        a: "Ja, zolang ze nog niet zijn goedgekeurd. Dit kan via 'Uren Overzicht'.",
      },
      {
        q: "Wat betekenen de statussen In behandeling / Goedgekeurd / Afgekeurd?",
        a: "In behandeling betekent dat je manager nog moet kijken. Goedgekeurd is definitief. Afgekeurd betekent dat je het moet aanpassen en opnieuw indienen.",
      },
      {
        q: "Waarom zijn mijn uren afgekeurd?",
        a: "Meestal omdat het verkeerde project is gekozen of tijden niet kloppen. Pas het aan volgens de opmerking van je manager.",
      },
    ],
  },
  {
    category: "Uren overzicht",
    items: [
      {
        q: "Waar kan ik mijn uren per week of maand bekijken?",
        a: "Ga naar 'Uren Overzicht' en filter op week of maand om je totaaluren te zien.",
      },
      {
        q: "Kan ik mijn uren exporteren?",
        a: "Als export is ingeschakeld, kun je in 'Uren Overzicht' je uren downloaden als PDF of Excel.",
      },
      {
        q: "Hoe zie ik of mijn uren al zijn goedgekeurd?",
        a: "In het overzicht staat per dag of regel de status. Goedgekeurd betekent dat het vaststaat.",
      },
    ],
  },
  {
    category: "Vakantie aanvragen",
    items: [
      {
        q: "Hoe vraag ik vakantie aan?",
        a: "Open 'Vakantie', kies je periode en klik op Aanvragen. Je manager krijgt een melding.",
      },
      {
        q: "Hoeveel vakantiedagen heb ik nog?",
        a: "Bovenaan de pagina 'Vakantie' zie je hoeveel dagen je beschikbaar hebt.",
      },
      {
        q: "Kan ik een vakantieaanvraag wijzigen of intrekken?",
        a: "Ja, zolang de aanvraag nog niet is goedgekeurd kun je deze aanpassen of intrekken.",
      },
    ],
  },
  {
    category: "Problemen / support",
    items: [
      {
        q: "Ik kan niet inloggen, wat moet ik doen?",
        a: "Controleer je e-mailadres en wachtwoord of gebruik 'Wachtwoord vergeten'. Lukt het niet, neem contact op met HR/admin.",
      },
      {
        q: "Een project ontbreekt in de lijst, wat nu?",
        a: "Meld dit bij je manager of admin zodat het project toegevoegd kan worden.",
      },
      {
        q: "Het systeem werkt traag of laadt niet goed.",
        a: "Probeer een harde refresh (Ctrl+F5) of een andere browser. Blijft het probleem, meld het bij support.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <ModernLayout>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Veelgestelde vragen
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Antwoorden op de meest gestelde vragen over Clockwise.
        </p>

        <div className="mt-8">
          <FaqAccordion sections={faqs} />
        </div>
      </div>
    </ModernLayout>
  );
}
