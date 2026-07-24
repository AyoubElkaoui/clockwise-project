"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

function getFaqs(t: (key: string) => string) {
  return [
    {
      category: t("faq.categories.hoursRegistration"),
      items: [
        {
          q: t("faq.questions.howToRegister"),
          a: t("faq.answers.howToRegister"),
        },
        {
          q: t("faq.questions.multipleProjects"),
          a: t("faq.answers.multipleProjects"),
        },
        {
          q: t("faq.questions.description"),
          a: t("faq.answers.description"),
        },
      ],
    },
    {
      category: t("faq.categories.hoursApproval"),
      items: [
        {
          q: t("faq.questions.editHours"),
          a: t("faq.answers.editHours"),
        },
        {
          q: t("faq.questions.statuses"),
          a: t("faq.answers.statuses"),
        },
        {
          q: t("faq.questions.rejected"),
          a: t("faq.answers.rejected"),
        },
      ],
    },
    {
      category: t("faq.categories.hoursOverview"),
      items: [
        {
          q: t("faq.questions.viewHours"),
          a: t("faq.answers.viewHours"),
        },
        {
          q: t("faq.questions.export"),
          a: t("faq.answers.export"),
        },
        {
          q: t("faq.questions.approved"),
          a: t("faq.answers.approved"),
        },
      ],
    },
    {
      category: t("faq.categories.vacationRequests"),
      items: [
        {
          q: t("faq.questions.requestVacation"),
          a: t("faq.answers.requestVacation"),
        },
        {
          q: t("faq.questions.vacationDays"),
          a: t("faq.answers.vacationDays"),
        },
        {
          q: t("faq.questions.modifyVacation"),
          a: t("faq.answers.modifyVacation"),
        },
      ],
    },
    {
      category: t("faq.categories.support"),
      items: [
        {
          q: t("faq.questions.login"),
          a: t("faq.answers.login"),
        },
        {
          q: t("faq.questions.missingProject"),
          a: t("faq.answers.missingProject"),
        },
        {
          q: t("faq.questions.slowSystem"),
          a: t("faq.answers.slowSystem"),
        },
      ],
    },
  ];
}

export default function FAQPage() {
  const { t } = useTranslation();
  const faqs = getFaqs(t);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 style={{ font: "700 22px 'Geist'", letterSpacing: "-.015em", color: "var(--text)" }}>{t("faq.title")}</h1>
        <p style={{ font: "400 13.5px 'Geist'", color: "var(--muted)", marginTop: 5 }}>{t("faq.subtitle")}</p>
      </div>

      <div style={{ maxWidth: 820 }} className="flex flex-col gap-[22px]">
        {faqs.map((section, si) => (
          <div key={si}>
            <div style={{ font: "600 13px 'Geist'", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              {section.category}
            </div>
            <div className="flex flex-col gap-[9px]">
              {section.items.map((item, ii) => {
                const id = `${si}-${ii}`;
                const isOpen = open === id;
                return (
                  <div key={id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 11, boxShadow: "var(--shadow)", overflow: "hidden" }}>
                    <button
                      onClick={() => setOpen(isOpen ? null : id)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "15px 18px", border: "none", background: "transparent", color: "var(--text)", font: "600 14px 'Geist'", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>{item.q}</span>
                      <span style={{ flex: "none", color: "var(--muted)", fontSize: 18, lineHeight: 1 }}>{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 18px 16px", font: "400 13.5px/1.6 'Geist'", color: "var(--text-2)" }}>{item.a}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
