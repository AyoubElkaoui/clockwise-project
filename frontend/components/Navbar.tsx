// components/Navbar.tsx
"use client";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="navbar bg-base-100 px-6 shadow-md">
            {/* Linkerzijde: logo + merknaam */}
            <div className="flex-1 flex items-center gap-2">
                {/* Stel dat je logo in public/logo-elmar.png staat */}
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

            <div className="flex-none">
                <button
                    className="btn btn-error"
                    onClick={() => {
                        localStorage.removeItem("userId");
                        localStorage.removeItem("firstName");
                        localStorage.removeItem("lastName");
                        localStorage.removeItem("userRank");
                        window.location.href = "/login";
                    }}
                >
                    Uitloggen
                </button>
            </div>
        </nav>
    );
}
