"use client";
import { useState, useEffect, JSX } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, updateUser } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { User } from "@/lib/types";
import { UserCircle, Mail, MapPin, KeyRound, ArrowLeft, Check, AlertTriangle } from "lucide-react";

export default function EditUserPage(): JSX.Element {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Form fields
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [loginName, setLoginName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [houseNumber, setHouseNumber] = useState<string>("");
    const [postalCode, setPostalCode] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [rank, setRank] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    // UI state
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchUser = async (): Promise<void> => {
            try {
                const userData = await getUser(parseInt(userId));
                setUser(userData);
                setFirstName(userData.firstName || "");
                setLastName(userData.lastName || "");
                setEmail(userData.email || "");
                setLoginName(userData.loginName || "");
                setAddress(userData.address || "");
                setHouseNumber(userData.houseNumber || "");
                setPostalCode(userData.postalCode || "");
                setCity(userData.city || "");
                setRank(userData.rank || "employee");
            } catch (error) {
                setToastMessage("Fout bij laden gebruiker");
                setToastType("error");
                setTimeout(() => setToastMessage(""), 3000);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUser();
        }
    }, [userId]);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !loginName.trim()) {
            setToastMessage("Vul alle verplichte velden in");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        setIsSubmitting(true);

        try {
            const updateData: Partial<User> = {
                firstName,
                lastName,
                email,
                loginName,
                address,
                houseNumber,
                postalCode,
                city,
                rank,
                ...(password.trim() && { password }),
            };

            await updateUser(parseInt(userId), updateData);
            setToastMessage("Gebruiker succesvol bijgewerkt");
            setToastType("success");
            setPassword("");

            setTimeout(() => {
                router.push("/admin/users");
            }, 1500);
        } catch (error) {
            setToastMessage("Fout bij bijwerken gebruiker");
            setToastType("error");
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Gebruiker niet gevonden</p>
                <p className="text-sm text-slate-500 mt-1">De gebruiker die je zoekt bestaat niet of is verwijderd.</p>
                <button
                    onClick={() => router.push("/admin/users")}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                    Terug naar Gebruikers
                </button>
            </div>
        );
    }

    const inputClass = "h-9 w-full px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <AdminRoute>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gebruiker Bewerken</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Bewerk gegevens van {firstName} {lastName}</p>
                    </div>
                    <button
                        onClick={() => router.push("/admin/users")}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Terug
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* User Info Sidebar */}
                        <div className="xl:col-span-1">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <UserCircle className="w-5 h-5 text-slate-400" />
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gebruiker Info</h2>
                                </div>
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                                        {firstName.charAt(0)}{lastName.charAt(0)}
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{firstName} {lastName}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
                                    <div className="mt-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            rank === "admin"
                                                ? "bg-rose-100 text-rose-700"
                                                : rank === "manager"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-blue-100 text-blue-700"
                                        }`}>
                                            {rank || "employee"}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-5 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2 text-sm">
                                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Account Details</p>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Gebruiker ID:</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{user.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Login naam:</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{loginName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Rol:</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{rank || "employee"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Edit Form */}
                        <div className="xl:col-span-2 space-y-5">
                            {/* Personal Info */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <UserCircle className="w-5 h-5 text-slate-400" />
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Persoonlijke Gegevens</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Voornaam *</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Achternaam *</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Mail className="w-5 h-5 text-slate-400" />
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact Gegevens</h2>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">E-mail *</label>
                                    <input
                                        type="email"
                                        className={inputClass}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Address Info */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <MapPin className="w-5 h-5 text-slate-400" />
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Adres Gegevens</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-3 space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Adres</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nr.</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={houseNumber}
                                                onChange={(e) => setHouseNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Postcode</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Plaats</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Login & Security */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <KeyRound className="w-5 h-5 text-slate-400" />
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Login &amp; Beveiliging</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Inlognaam *</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                value={loginName}
                                                onChange={(e) => setLoginName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Gebruikersrol *</label>
                                            <select
                                                className={inputClass}
                                                value={rank}
                                                onChange={(e) => setRank(e.target.value)}
                                                required
                                            >
                                                <option value="employee">Medewerker</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nieuw wachtwoord</label>
                                        <input
                                            type="password"
                                            className={inputClass}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Laat leeg om ongewijzigd te laten"
                                        />
                                        <p className="text-xs text-slate-500">Alleen invullen als je het wachtwoord wilt wijzigen</p>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <button
                                            type="button"
                                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                                            onClick={() => router.push("/admin/users")}
                                            disabled={isSubmitting}
                                        >
                                            Annuleren
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Opslaan...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Wijzigingen Opslaan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}
