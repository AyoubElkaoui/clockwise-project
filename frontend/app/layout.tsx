// app/layout.tsx
"use client";
import { ReactNode } from "react";
import "./globals.css";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import { LanguageProvider } from "@/lib/language-context";
import { ToastContainer } from "@/components/ui/toast";

const poppins = Poppins({
    weight: ["400", "600", "700"],
    subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="nl" suppressHydrationWarning>
        <body className={poppins.className}>
        <ThemeProvider>
            <LanguageProvider>
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
                    {children}
                </div>
                <ToastContainer />
            </LanguageProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
