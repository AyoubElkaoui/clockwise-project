"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";

export default function RegisterPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [houseNumber, setHouseNumber] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [loginName, setLoginName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async () => {
        try {
            await axios.post(`${API_URL}/users/register`, {
                firstName,
                lastName,
                email,
                address,
                houseNumber,
                postalCode,
                city,
                loginName,
                password,
            });
            router.push("/login");
        } catch (error) {
             // Gebruik de error parameter zodat hij niet ongebruikt is
            setError("Registratie mislukt");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200">
            <div className="card w-96 bg-base-100 shadow-xl p-8">
                <h1 className="card-title justify-center mb-6">Registreren</h1>
                <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Voornaam"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Achternaam"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Adres"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="Huisnummer"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Postcode"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Plaats"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Inlognaam"
                    className="input input-bordered w-full mb-4"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wachtwoord"
                    className="input input-bordered w-full mb-4"
                />
                <button onClick={handleRegister} className="btn btn-primary w-full">
                    Registreren
                </button>
                {error && <p className="text-error text-center mt-4">{error}</p>}
            </div>
        </div>
    );
}
