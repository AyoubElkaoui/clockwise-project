"use client";

import { useState } from "react";

type FAQItem = { q: string; a: string };
type FAQSection = { category: string; items: FAQItem[] };

export default function FaqAccordion({ sections }: { sections: FAQSection[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.category}>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">
            {section.category}
          </h2>

          <div className="space-y-2">
            {section.items.map((item, i) => {
              const id = `${section.category}-${i}`;
              const isOpen = openId === id;

              return (
                <div
                  key={id}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : id)}
                    className="w-full flex justify-between items-center p-4 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {item.q}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {isOpen ? "–" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
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
  );
}
