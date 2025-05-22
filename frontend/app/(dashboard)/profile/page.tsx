"use client";
import React, {useState, useEffect, JSX} from "react";
import axios from "axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    UserCircleIcon,
    EnvelopeIcon,
    MapPinIcon,
    KeyIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function AccountPage(): JSX.Element {
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [houseNumber, setHouseNumber] = useState<string>("");
    const [postalCode, setPostalCode] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [loginName, setLoginName] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

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
                })
                .catch((error) => console.error("Error fetching user:", error));
        }
    }, []);

    const handleUpdate = async (): Promise<void> => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        setIsLoading(true);
        setMessage("");

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
                password,
            };
            await axios.put(`http://localhost:5203/api/users/${userId}`, data);
            setMessage("Gegevens succesvol bijgewerkt!");
            setIsSuccess(true);

            // Update localStorage with new names
            localStorage.setItem("firstName", firstName);
            localStorage.setItem("lastName", lastName);
        } catch (error) {
            console.error("Error updating user:", error);
            setMessage("Fout bij bijwerken van gegevens. Probeer het opnieuw.");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(""), 5000);
        }
    };

    return (
        <ProtectedRoute>
            <div className="container mx-auto p-6 space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                    <div className="flex items-center gap-3 mb-4">
                        <UserCircleIcon className="w-8 h-8" />
                        <h1 className="text-4xl font-bold">Mijn Account</h1>
                    </div>
                    <p className="text-blue-100 text-lg">Beheer je persoonlijke gegevens en instellingen</p>
                </div>

                {/* Main Form */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-2xl overflow-hidden">
                    <div className="card-body p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Profile Section */}
                            <div className="lg:col-span-1">
                                <div className="text-center mb-6">
                                    <div className="avatar placeholder mx-auto mb-4">
                                        <div className="bg-gradient-elmar text-white rounded-full w-24 h-24 flex items-center justify-center">
                                            <span className="text-2xl font-bold">
                                                {firstName.charAt(0)}{lastName.charAt(0)}
                                            </span>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">{firstName} {lastName}</h2>
                                    <p className="text-gray-600">{email}</p>
                                </div>

                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                                    <h3 className="font-bold text-gray-800 mb-4">Account Informatie</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <UserCircleIcon className="w-5 h-5 text-gray-500" />
                                            <span className="text-sm text-gray-600">Gebruikersnaam: {loginName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                                            <span className="text-sm text-gray-600">E-mail: {email}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MapPinIcon className="w-5 h-5 text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                {address} {houseNumber}, {postalCode} {city}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Section */}
                            <div className="lg:col-span-2">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Gegevens Bewerken</h2>

                                {/* Personal Info */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <UserCircleIcon className="w-5 h-5" />
                                        Persoonlijke Gegevens
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Voornaam</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Achternaam</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2
                                                focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <EnvelopeIcon className="w-5 h-5" />
                                        Contact Gegevens
                                    </h3>
                                    <div className="form-control mb-4">
                                        <label className="label">
                                            <span className="label-text font-semibold text-gray-700">E-mail</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Address Info */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <MapPinIcon className="w-5 h-5" />
                                        Adres Gegevens
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Adres</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Huisnummer</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={houseNumber}
                                                onChange={(e) => setHouseNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Postcode</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Plaats</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Login Info */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <KeyIcon className="w-5 h-5" />
                                        Login Gegevens
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Inlognaam</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={loginName}
                                                onChange={(e) => setLoginName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Nieuw wachtwoord</span>
                                            </label>
                                            <input
                                                type="password"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Laat leeg als je niet wilt wijzigen"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Message */}
                                {message && (
                                    <div className={`alert ${isSuccess ? 'alert-success' : 'alert-error'} rounded-xl mb-6 animate-slide-up`}>
                                        {isSuccess ? (
                                            <CheckCircleIcon className="w-6 h-6" />
                                        ) : (
                                            <ExclamationTriangleIcon className="w-6 h-6" />
                                        )}
                                        <span>{message}</span>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="flex justify-end">
                                    <button
                                        className="btn bg-gradient-elmar border-0 text-white rounded-xl px-8 hover:scale-105 hover:shadow-elmar-hover transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                                        onClick={handleUpdate}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Opslaan...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-5 h-5" />
                                                Gegevens Bijwerken
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}