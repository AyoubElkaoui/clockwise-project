"use client";
import {useState, useEffect, JSX} from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, updateUser } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";
import { User } from "@/lib/types";
import {
    UserCircleIcon,
    EnvelopeIcon,
    MapPinIcon,
    KeyIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

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

                // Populate form fields
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
                ...(password.trim() && { password }) // Only include password if provided
            };

            await updateUser(parseInt(userId), updateData);
            setToastMessage("Gebruiker succesvol bijgewerkt");
            setToastType("success");

            // Clear password field after successful update
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
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Gebruiker laden...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                    <ExclamationTriangleIcon className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Gebruiker niet gevonden</p>
                <p className="text-sm text-slate-500 mt-1">De gebruiker die je zoekt bestaat niet of is verwijderd.</p>
                <button
                    onClick={() => router.push("/admin/users")}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    Terug naar Gebruikers
                </button>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="space-y-6 animate-fadeIn">
                <PageHeader
                    title="Gebruiker Bewerken"
                    description={`Bewerk gegevens van ${firstName} ${lastName}`}
                    actions={
                        <button
                            onClick={() => router.push("/admin/users")}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Terug
                        </button>
                    }
                />

                {/* Main Form */}
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* User Info Card */}
                        <div className="xl:col-span-1">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <UserCircleIcon className="w-5 h-5" />
                                        Gebruiker Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                                            {firstName.charAt(0)}{lastName.charAt(0)}
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{firstName} {lastName}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                rank === "admin"
                                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                                    : rank === "manager"
                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                            }`}>
                                                {rank || 'employee'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2 text-sm">
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
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{rank || 'employee'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Edit Form */}
                        <div className="xl:col-span-2 space-y-6">
                            {/* Personal Info */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <UserCircleIcon className="w-5 h-5" />
                                        Persoonlijke Gegevens
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Voornaam *</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Achternaam *</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contact Info */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <EnvelopeIcon className="w-5 h-5" />
                                        Contact Gegevens
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail *</label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Address Info */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <MapPinIcon className="w-5 h-5" />
                                        Adres Gegevens
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-3 space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Adres</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nr.</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={houseNumber}
                                                onChange={(e) => setHouseNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Postcode</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plaats</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Login Info */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <KeyIcon className="w-5 h-5" />
                                        Login &amp; Beveiliging
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Inlognaam *</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={loginName}
                                                onChange={(e) => setLoginName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gebruikersrol *</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nieuw wachtwoord</label>
                                        <input
                                            type="password"
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Laat leeg om ongewijzigd te laten"
                                        />
                                        <p className="text-xs text-slate-500">Alleen invullen als je het wachtwoord wilt wijzigen</p>
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <button
                                            type="button"
                                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                            onClick={() => router.push("/admin/users")}
                                            disabled={isSubmitting}
                                        >
                                            Annuleren
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Opslaan...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                    Wijzigingen Opslaan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
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
