// app/login/page.tsx (of je bestaande login component)
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
    const [userInput, setUserInput] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        try {
            const user = await login(userInput, password);
            // Sla gegevens op in localStorage (optioneel)
            localStorage.setItem("userId", user.id);
            localStorage.setItem("firstName", user.firstName);
            localStorage.setItem("lastName", user.lastName);
            localStorage.setItem("userRank", user.rank);

            // Zet een cookie zodat de server (middleware) deze kan lezen.
            // Let op: In productie moet je extra opties (zoals Secure en SameSite) instellen!
            document.cookie = `userId=${user.id}; path=/; max-age=3600;`;

            router.push("/");
        } catch (e) {
            setError("Ongeldige login");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="card w-96 bg-base-100 shadow-xl p-8">
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
