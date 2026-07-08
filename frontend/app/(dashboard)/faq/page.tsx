"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

function getFaqs(t: (key: string) => string) {
  return [
    {
      category: t("faq.categories.hoursRegistration"),
      items: [
        { q: t("faq.questions.howToRegister"), a: t("faq.answers.howToRegister") },
        { q: t("faq.questions.multipleProjects"), a: t("faq.answers.multipleProjects") },
        { q: t("faq.questions.description"), a: t("faq.answers.description") },
      ],
    },
    {
      category: t("faq.categories.hoursApproval"),
      items: [
        { q: t("faq.questions.editHours"), a: t("faq.answers.editHours") },
        { q: t("faq.questions.statuses"), a: t("faq.answers.statuses") },
        { q: t("faq.questions.rejected"), a: t("faq.answers.rejected") },
      ],
    },
    {
      category: t("faq.categories.hoursOverview"),
      items: [
        { q: t("faq.questions.viewHours"), a: t("faq.answers.viewHours") },
        { q: t("faq.questions.export"), a: t("faq.answers.export") },
        { q: t("faq.questions.approved"), a: t("faq.answers.approved") },
      ],
    },
    {
      category: t("faq.categories.vacationRequests"),
      items: [
        { q: t("faq.questions.requestVacation"), a: t("faq.answers.requestVacation") },
        { q: t("faq.questions.vacationDays"), a: t("faq.answers.vacationDays") },
        { q: t("faq.questions.modifyVacation"), a: t("faq.answers.modifyVacation") },
      ],
    },
    {
      category: t("faq.categories.support"),
      items: [
        { q: t("faq.questions.login"), a: t("faq.answers.login") },
        { q: t("faq.questions.missingProject"), a: t("faq.answers.missingProject") },
        { q: t("faq.questions.slowSystem"), a: t("faq.answers.slowSystem") },
      ],
    },
  ];
}

export default function FAQPage() {
  const { t } = useTranslation();
  const faqs = getFaqs(t);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("faq.title")}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t("faq.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {faqs.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              {section.category}
            </h2>
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => {
                const key = `${idx}-${itemIdx}`;
                const isOpen = openItems[key];
                return (
                  <div key={itemIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50">
                        {item.a}
                      </div>
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
