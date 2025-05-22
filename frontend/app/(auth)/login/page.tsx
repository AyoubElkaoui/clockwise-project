"use client";
import {JSX, useState} from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import Image from "next/image";
import {
    EnvelopeIcon,
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowRightIcon
} from "@heroicons/react/24/outline";

export default function LoginPage(): JSX.Element {
    const [userInput, setUserInput] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const router = useRouter();

    const handleLogin = async (): Promise<void> => {
        if (!userInput.trim() || !password.trim()) {
            setError("Vul alle velden in");
            return;
        }

        setIsLoading(true);
        setError("");

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
                setError("Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.");
            } else {
                console.error("Onbekende fout:", e);
                setError("Er is een onbekende fout opgetreden. Probeer het opnieuw.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
            </div>

            {/* Main Login Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-elmar-card border border-white/50 overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-gradient-elmar p-8 text-white">
                        <div className="flex justify-center mb-6">
                            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                                <Image
                                    src="/logo.png"
                                    alt="Elmar Services Logo"
                                    width={80}
                                    height={80}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-bold mb-2">Welkom Terug</h1>
                            <p className="text-blue-100">Log in om door te gaan naar je dashboard</p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="p-8">
                        <div className="space-y-6">
                            {/* Email Input */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">📧 E-mail of Gebruikersnaam</span>
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="voornaam@elmarservices.nl"
                                        className="input input-bordered w-full pl-10 border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl transition-all duration-200"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-700">🔒 Wachtwoord</span>
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="••••••••"
                                        className="input input-bordered w-full pl-10 pr-12 border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl transition-all duration-200"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="w-5 h-5" />
                                        ) : (
                                            <EyeIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="alert alert-error rounded-xl animate-slide-up">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {/* Login Button */}
                            <button
                                onClick={handleLogin}
                                disabled={isLoading || !userInput.trim() || !password.trim()}
                                className="btn w-full bg-gradient-elmar border-0 text-white rounded-xl py-3 h-auto min-h-0 hover:scale-105 hover:shadow-elmar-hover transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Inloggen...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Inloggen
                                        <ArrowRightIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </button>

                            {/* Additional Options */}
                            <div className="text-center space-y-3">
                                <a href="#" className="text-sm text-elmar-primary hover:text-elmar-secondary transition-colors duration-200">
                                    Wachtwoord vergeten?
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            © 2024 Elmar Services. Alle rechten voorbehouden.
                        </p>
                    </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-green-400 to-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse"></div>
            </div>
        </div>
    );
}