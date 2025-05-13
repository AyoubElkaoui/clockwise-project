// app/(auth)/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import Image from "next/image";

export default function LoginPage() {
    const [userInput, setUserInput] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        try {
            const user = await login(userInput, password);

            // Wis eerst alle bestaande data
            localStorage.clear();

            // Sla nieuwe gegevens op
            localStorage.setItem("userId", user.id);
            localStorage.setItem("firstName", user.firstName);
            localStorage.setItem("lastName", user.lastName);
            localStorage.setItem("userRank", user.rank);

            // Zet cookies
            document.cookie = `userId=${user.id}; path=/; max-age=3600;`;
            document.cookie = `userRank=${user.rank}; path=/; max-age=3600;`;

            // Stuur naar juiste pagina
            if (user.rank === "admin" || user.rank === "manager") {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.error("Login error:", e.message);
                setError("Ongeldige login");
            } else {
                console.error("Onbekende fout:", e);
                setError("Onbekende fout bij login");
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="card w-96 bg-base-100 shadow-xl p-8">
                <div className="flex justify-center mb-4">
                    <Image
                        src="/logo.png"
                        alt="Elmar Services Logo"
                        width={200}
                        height={80}
                    />
                </div>
                <h1 className="card-title justify-center mb-6">Login</h1>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Voer je e-mail of gebruikersnaam in"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Voer je wachtwoord in"
                    className="input input-bordered w-full mb-4"
                />
                <button onClick={handleLogin} className="btn btn-primary w-full">
                    Inloggen
                </button>
                {error && <p className="text-error text-center mt-4">{error}</p>}
            </div>
        </div>
    );
}