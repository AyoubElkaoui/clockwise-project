"use client";

import { HelpCircle } from "lucide-react";
import FaqAccordion from "./FaqAccordion";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title={t("faq.title")} description={t("faq.subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {faqs.map((section, idx) => (
          <Card key={idx} className="card-hover">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx}>
                    <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      {item.q}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 ml-4">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
