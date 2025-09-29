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

            localStorage.clear();
            localStorage.setItem("userId", user.id);
            localStorage.setItem("firstName", user.firstName);
            localStorage.setItem("lastName", user.lastName);
            localStorage.setItem("userRank", user.rank);

            document.cookie = `userId=${user.id}; path=/; max-age=3600;`;
            document.cookie = `userRank=${user.rank}; path=/; max-age=3600;`;

            if (user.rank === "admin" || user.rank === "manager") {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError("Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.");
            } else {
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4 relative">
            {/* Main Login Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-gray-900/80 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-700 overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                        <div className="flex justify-center mb-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
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
                            <p className="text-blue-200">Log in om door te gaan</p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="p-8">
                        <div className="space-y-6">
                            {/* Email Input */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-200">📧 E-mail of Gebruikersnaam</span>
                                </label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="voornaam@elmarservices.nl"
                                        className="input w-full pl-10 bg-gray-800 text-gray-100 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 rounded-xl transition-all duration-200"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold text-gray-200">🔒 Wachtwoord</span>
                                </label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="••••••••"
                                        className="input w-full pl-10 pr-12 bg-gray-800 text-gray-100 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 rounded-xl transition-all duration-200"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors duration-200"
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
                                <div className="bg-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-600 animate-slide-up">
                                    {error}
                                </div>
                            )}

                            {/* Login Button */}
                            <button
                                onClick={handleLogin}
                                disabled={isLoading || !userInput.trim() || !password.trim()}
                                className="btn w-full bg-gradient-to-r from-blue-600 to-indigo-700 border-0 text-white rounded-xl py-3 h-auto min-h-0 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
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
                                <a href="#" className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200">
                                    Wachtwoord vergeten?
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-800/60 px-8 py-4 text-center border-t border-gray-700">
                        <p className="text-xs text-gray-400">
                            © 2024 Elmar Services. Alle rechten voorbehouden.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
