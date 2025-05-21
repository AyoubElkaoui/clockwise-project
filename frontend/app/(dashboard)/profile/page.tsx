// Fix voor frontend/app/(dashboard)/profile/page.tsx

"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AccountPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [houseNumber, setHouseNumber] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [loginName, setLoginName] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    // Verwijder de router variabele aangezien die niet gebruikt wordt
    // const router = useRouter();

    // Haal de gebruikersgegevens op (via een API-endpoint zoals GET /api/users/{userId})
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (userId) {
            axios
                .get(`http://localhost:5203/api/users/${userId}`)
                .then((response) => {
                    const user = response.data;
                    setFirstName(user.firstName);
                    setLastName(user.lastName);
                    setEmail(user.email);
                    setAddress(user.address);
                    setHouseNumber(user.houseNumber);
                    setPostalCode(user.postalCode);
                    setCity(user.city);
                    setLoginName(user.loginName);
                    // Voor veiligheid wordt het wachtwoord niet geladen
                })
                .catch((error) => console.error("Error fetching user:", error));
        }
    }, []);

    const handleUpdate = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        try {
            const data = {
                firstName,
                lastName,
                email,
                address,
                houseNumber,
                postalCode,
                city,
                loginName,
                password, // Indien ingevuld; in productie zou je hier extra validatie en hashing toepassen
            };
            await axios.put(`http://localhost:5203/api/users/${userId}`, data);
            setMessage("Gegevens bijgewerkt");
        } catch (error) {
            console.error("Error updating user:", error);
            setMessage("Fout bij bijwerken van gegevens");
        }
    };

    return (
        <ProtectedRoute>
            <div className="container mx-auto p-6">
                <h1 className="text-4xl font-bold mb-8 text-center">Mijn Account</h1>
                <div className="card bg-white shadow-xl mx-auto max-w-2xl">
                    <div className="card-body">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Voornaam</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Achternaam</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text font-semibold">E-mail</span>
                            </label>
                            <input
                                type="email"
                                className="input input-bordered"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text font-semibold">Adres</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Huisnummer</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={houseNumber}
                                    onChange={(e) => setHouseNumber(e.target.value)}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Postcode</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Plaats</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text font-semibold">Inlognaam</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered"
                                value={loginName}
                                onChange={(e) => setLoginName(e.target.value)}
                            />
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text font-semibold">Nieuw wachtwoord</span>
                            </label>
                            <input
                                type="password"
                                className="input input-bordered"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Laat leeg als je niet wilt wijzigen"
                            />
                        </div>

                        <div className="mt-6">
                            <button className="btn btn-primary w-full" onClick={handleUpdate}>
                                Gegevens Bijwerken
                            </button>
                        </div>

                        {message && (
                            <div className="mt-4">
                                <p className="text-center text-green-600 font-semibold">{message}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}