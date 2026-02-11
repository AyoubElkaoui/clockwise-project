// app/layout.tsx
"use client";
import { ReactNode } from "react";
import "./globals.css";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastContainer } from "@/components/ui/toast";
import "@/lib/i18n"; // Initialize i18next

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={poppins.className}>
        <ThemeProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
            {children}
          </div>
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
