"use client";

import { HelpCircle } from "lucide-react";
import FaqAccordion from "./FaqAccordion";
import ModernLayout from "@/components/ModernLayout";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4 md:mb-8">
        <HelpCircle className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t("faq.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            {t("faq.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {faqs.map((section, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-3 md:p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx}>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                        •
                      </span>
                      {item.q}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-4">
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
