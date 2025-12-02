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
                console.error("Error fetching user:", error);
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
            console.error("Error updating user:", error);
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
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Gebruiker laden...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="text-6xl mb-4">[X]</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Gebruiker niet gevonden</h2>
                    <p className="text-gray-600 mb-6">De gebruiker die je zoekt bestaat niet of is verwijderd.</p>
                    <button
                        onClick={() => router.push("/admin/users")}
                        className="btn btn-primary rounded-xl"
                    >
                        Terug naar Gebruikers
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="space-y-8">
                {/* Header Section */}
                <div className="bg-blue-600 text-white rounded-2xl p-8 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => router.push("/admin/users")}
                                    className="btn btn-ghost text-white hover:bg-white/20 rounded-xl"
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <UserCircleIcon className="w-8 h-8" />
                                <h1 className="text-4xl font-bold">Gebruiker Bewerken</h1>
                            </div>
                            <p className="text-blue-100 text-lg">Bewerk gegevens van {firstName} {lastName}</p>
                        </div>
                        <div className="avatar placeholder">
                            <div className="bg-white/20 backdrop-blur-sm text-white rounded-xl w-16 h-16 flex items-center justify-center">
                                <span className="text-xl font-bold">
                                    {firstName.charAt(0)}{lastName.charAt(0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* User Info Card */}
                        <div className="xl:col-span-1">
                            <div className="card bg-white shadow-lg border-0 rounded-2xl">
                                <div className="card-body p-8">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <UserCircleIcon className="w-6 h-6" />
                                        Gebruiker Info
                                    </h2>

                                    <div className="text-center mb-6">
                                        <div className="avatar placeholder mx-auto mb-4">
                                            <div className="bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center">
                                                <span className="text-xl font-bold">
                                                    {firstName.charAt(0)}{lastName.charAt(0)}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800">{firstName} {lastName}</h3>
                                        <p className="text-gray-600">{email}</p>
                                        <div className="mt-2">
                                            <span className={`badge ${
                                                rank === "admin" ? "badge-error" :
                                                    rank === "manager" ? "badge-warning" : "badge-primary"
                                            }`}>
                                                {rank || 'employee'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-blue-100 rounded-xl p-6">
                                        <h4 className="font-bold text-gray-800 mb-3">Account Details</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Gebruiker ID:</span>
                                                <span className="font-medium">{user.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Login naam:</span>
                                                <span className="font-medium">{loginName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Rol:</span>
                                                <span className="font-medium">{rank || 'employee'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Edit Form */}
                        <div className="xl:col-span-2">
                            <div className="card bg-white shadow-lg border-0 rounded-2xl">
                                <div className="card-body p-8">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-8">Gegevens Bewerken</h2>

                                    {/* Personal Info */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <UserCircleIcon className="w-5 h-5" />
                                            Persoonlijke Gegevens
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold text-gray-700">Voornaam *</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold text-gray-700">Achternaam *</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    required
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
                                                <span className="label-text font-semibold text-gray-700">E-mail *</span>
                                            </label>
                                            <input
                                                type="email"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Address Info */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <MapPinIcon className="w-5 h-5" />
                                            Adres Gegevens
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                            <div className="md:col-span-3">
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
                                                    <span className="label-text font-semibold text-gray-700">Nr.</span>
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
                                            Login & Beveiliging
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold text-gray-700">Inlognaam *</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                    value={loginName}
                                                    onChange={(e) => setLoginName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-semibold text-gray-700">Gebruikersrol *</span>
                                                </label>
                                                <select
                                                    className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
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

                                        <div className="form-control mt-4">
                                            <label className="label">
                                                <span className="label-text font-semibold text-gray-700">Nieuw wachtwoord</span>
                                            </label>
                                            <input
                                                type="password"
                                                className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Laat leeg om ongewijzigd te laten"
                                            />
                                            <label className="label">
                                                <span className="label-text-alt text-gray-500">
                                                    Alleen invullen als je het wachtwoord wilt wijzigen
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            className="btn btn-outline rounded-xl"
                                            onClick={() => router.push("/admin/users")}
                                            disabled={isSubmitting}
                                        >
                                            Annuleren
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn bg-blue-600 border-0 text-white rounded-xl hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                    Opslaan...
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                    Wijzigingen Opslaan
                                                </div>
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