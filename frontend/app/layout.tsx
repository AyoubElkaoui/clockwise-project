// app/layout.tsx
import { ReactNode } from "react";
import "./globals.css";
import { Poppins } from "next/font/google";

const poppins = Poppins({
    weight: ["400", "600", "700"],
    subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="nl" data-theme="elmar" className={poppins.className}>
        <body className="bg-base-200">
        {children}
        </body>
        </html>
    );
}