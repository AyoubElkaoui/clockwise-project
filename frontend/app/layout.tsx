// app/layout.tsx
import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import "./globals.css"; // Zorg dat dit je Tailwind CSS bevat
import { Poppins } from "next/font/google";

const poppins = Poppins({
    weight: ["400", "600", "700"], // welke diktes je nodig hebt
    subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="nl" data-theme="elmar" className={poppins.className}>
        <body className="bg-base-200">
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navbar />
                <main className="p-8 flex-1">{children}</main>
            </div>
        </div>
        </body>
        </html>
    );
}
