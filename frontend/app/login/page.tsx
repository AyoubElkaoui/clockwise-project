"use client";
import { useState } from "react";
import { login } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        try {
            await login(email);
            router.push("/dashboard");
        } catch (e) {
            setError("Ongeldige login");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="card w-96 bg-base-100 shadow-xl p-8">
                <h1 className="card-title justify-center mb-6">Login</h1>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Voer je e-mail in"
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
