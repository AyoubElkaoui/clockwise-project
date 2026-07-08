// app/layout.tsx
"use client";
import { ReactNode } from "react";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastContainer } from "@/components/ui/toast";
import "@/lib/i18n"; // Initialize i18next

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
      <body className={`${geist.variable} ${geistMono.variable} ${geist.className}`}>
        <ThemeProvider>
          <div className="min-h-screen overflow-x-hidden transition-colors duration-200">
            {children}
          </div>
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
