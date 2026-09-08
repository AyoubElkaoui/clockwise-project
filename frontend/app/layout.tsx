// app/layout.tsx
"use client";
import { ReactNode } from "react";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastContainer } from "@/components/ui/toast";
import { ConfirmHost } from "@/components/ui/confirm";
import "@/lib/i18n"; // Initialize i18next
import "@/lib/installFetchAuth"; // Attach Bearer token to raw fetch() API calls

// Altum design system fonts
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
            {children}
          </div>
          <ToastContainer />
          <ConfirmHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
