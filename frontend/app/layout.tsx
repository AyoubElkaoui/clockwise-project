// app/layout.tsx
import { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import "./globals.css";
import { Poppins } from "next/font/google";
import { getTimeEntries } from "@/lib/api";
import dayjs from "dayjs";

const poppins = Poppins({
    weight: ["400", "600", "700"],
    subsets: ["latin"],
});

export default async function RootLayout({ children }: { children: ReactNode }) {
    const timeEntries = await getTimeEntries();

    // Zet currentMonth om naar een plain string (bijv. ISO formaat)
    const currentMonth = dayjs().startOf("month").toISOString();

    return (
        <html lang="nl" data-theme="elmar" className={poppins.className}>
        <body className="bg-base-200">
        <ProtectedRoute>
            <div className="flex min-h-screen">
                {/* Geef currentMonth als string mee */}
                <Sidebar
                    timeEntries={timeEntries}
                    currentMonth={currentMonth}
                />
                <div className="flex-1 flex flex-col">
                    <Navbar />
                    <main className="p-8 flex-1">{children}</main>
                </div>
            </div>
        </ProtectedRoute>
        </body>
        </html>
    );
}
