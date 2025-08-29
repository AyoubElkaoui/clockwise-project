"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import PasswordInput from "@/components/PasswordInput";
import { validatePassword } from "@/lib/passwordValidation";

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
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [passwordValid, setPasswordValid] = useState(false);
    const router = useRouter();

    const handleRegister = async () => {
        // Clear previous errors
        setError("");

        // Validation
        if (!firstName.trim() || !lastName.trim() || !email.trim() ||
            !loginName.trim() || !password || !confirmPassword) {
            setError("Vul alle verplichte velden in");
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Voer een geldig e-mailadres in");
            return;
        }

        // Password validation
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(`Wachtwoord voldoet niet aan de eisen: ${passwordValidation.feedback.join(", ")}`);
            return;
        }

        // Confirm password
        if (password !== confirmPassword) {
            setError("Wachtwoorden komen niet overeen");
            return;
        }

        setIsLoading(true);

        try {
            await axios.post("http://localhost:5203/api/users/register-admin", {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                address: address.trim(),
                houseNumber: houseNumber.trim(),
                postalCode: postalCode.trim(),
                city: city.trim(),
                loginName: loginName.trim(),
                password: password, // Backend will hash this
            });

            // Show success message
            alert("Registratie succesvol! Je kunt nu inloggen.");
            router.push("/login");
        } catch (error: any) {
            console.error("Registratie error:", error);

            if (error.response?.data) {
                setError(error.response.data);
            } else if (error.response?.status === 400) {
                setError("Gebruiker met deze email of loginnaam bestaat al");
            } else {
                setError("Registratie mislukt. Probeer het opnieuw.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-base-200 p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body">
                    <h1 className="card-title justify-center mb-6 text-2xl">Admin Registreren</h1>

                    <div className="space-y-4">
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Voornaam *"
                            className="input input-bordered w-full"
                            required
                        />

                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Achternaam *"
                            className="input input-bordered w-full"
                            required
                        />

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-mail *"
                            className="input input-bordered w-full"
                            required
                        />

                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Adres"
                            className="input input-bordered w-full"
                        />

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                placeholder="Huisnummer"
                                className="input input-bordered w-1/3"
                            />

                            <input
                                type="text"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                placeholder="Postcode"
                                className="input input-bordered w-1/3"
                            />

                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Plaats"
                                className="input input-bordered w-1/3"
                            />
                        </div>

                        <input
                            type="text"
                            value={loginName}
                            onChange={(e) => setLoginName(e.target.value)}
                            placeholder="Inlognaam *"
                            className="input input-bordered w-full"
                            required
                        />

                        {/* New Password Input with Strength Indicator */}
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold">Wachtwoord *</span>
                            </label>
                            <PasswordInput
                                value={password}
                                onChange={setPassword}
                                placeholder="Voer een sterk wachtwoord in"
                                showStrengthIndicator={true}
                                required={true}
                                onValidationChange={setPasswordValid}
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="label">
                                <span className="label-text font-semibold">Bevestig Wachtwoord *</span>
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Herhaal je wachtwoord"
                                className={`input input-bordered w-full ${
                                    confirmPassword && password !== confirmPassword ? 'border-red-300' : ''
                                }`}
                                required
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-red-500 text-sm mt-1">Wachtwoorden komen niet overeen</p>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="alert alert-error mt-4">
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Register Button */}
                    <button
                        onClick={handleRegister}
                        className="btn btn-primary w-full mt-6"
                        disabled={isLoading || !passwordValid || password !== confirmPassword}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <span className="loading loading-spinner loading-sm"></span>
                                Registreren...
                            </div>
                        ) : (
                            "Admin Registreren"
                        )}
                    </button>

                    {/* Back to Login */}
                    <div className="text-center mt-4">
                        <button
                            onClick={() => router.push("/login")}
                            className="text-sm text-primary hover:text-primary-focus transition-colors"
                        >
                            ← Terug naar inloggen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
