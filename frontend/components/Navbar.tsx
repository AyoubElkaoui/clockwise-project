"use client";
import Image from "next/image";
import Link from "next/link";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
    const handleLogout = () => {
        // Verwijder alle localStorage items
        localStorage.removeItem("userId");
        localStorage.removeItem("firstName");
        localStorage.removeItem("lastName");
        localStorage.removeItem("userRank");

        // Verwijder cookies
        document.cookie = "userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "userRank=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // Redirect naar login pagina
        window.location.href = "/login";
    };

    return (
        <nav className="navbar bg-base-100 px-6 shadow-md">
            {/* Linkerzijde: logo + merknaam */}
            <div className="flex-1 flex items-center gap-2">
                <Link href="/">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <Image
                            src="/logo.png"
                            alt="Elmar Services Logo"
                            width={400}
                            height={400}
                        />
                        <h1 className="text-xl font-bold tracking-wide">
                            <span className="text-primary">U</span>ren <span className="text-primary">R</span>egistratie
                        </h1>
                    </div>
                </Link>
            </div>

            <div className="flex-none gap-2">
                <NotificationBell />

                <button
                    className="btn btn-error"
                    onClick={handleLogout}
                >
                    Uitloggen
                </button>
            </div>
        </nav>
    );
}