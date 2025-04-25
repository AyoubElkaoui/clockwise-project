"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, updateUser } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import ToastNotification from "@/components/ToastNotification";

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id;

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        loginName: "",
        password: "",
        address: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        rank: "",
        function: ""
    });

    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await getUser(userId);
                setUser(userData);
                setFormData({
                    firstName: userData.firstName || "",
                    lastName: userData.lastName || "",
                    email: userData.email || "",
                    loginName: userData.loginName || "",
                    password: "",
                    address: userData.address || "",
                    houseNumber: userData.houseNumber || "",
                    postalCode: userData.postalCode || "",
                    city: userData.city || "",
                    rank: userData.rank || "user",
                    function: userData.function || ""
                });
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUser();
        }
    }, [userId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updateUser(userId, formData);
            setToastMessage("Gebruiker succesvol bijgewerkt");
            setToastType("success");
            setTimeout(() => {
                router.push("/admin/users");
            }, 2000);
        } catch (error) {
            console.error("Error updating user:", error);
            setToastMessage("Fout bij bijwerken gebruiker");
            setToastType("error");
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Gebruiker Bewerken</h1>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Persoonlijke info */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Voornaam</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Achternaam</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">E-mail</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Functie</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="function"
                                        value={formData.function}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        placeholder="Bijv. Developer, Manager, etc."
                                    />
                                </div>

                                {/* Adresgegevens */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Adres</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Huisnummer</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="houseNumber"
                                        value={formData.houseNumber}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Postcode</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Plaats</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                {/* Inloggegevens */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Inlognaam</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="loginName"
                                        value={formData.loginName}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Nieuw wachtwoord</span>
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="input input-bordered"
                                        placeholder="Laat leeg om wachtwoord niet te wijzigen"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Rol</span>
                                    </label>
                                    <select
                                        name="rank"
                                        value={formData.rank}
                                        onChange={handleChange}
                                        className="select select-bordered"
                                        required
                                    >
                                        <option value="user">Gebruiker</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-8">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => router.push("/admin/users")}
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {toastMessage && (
                    <ToastNotification
                        message={toastMessage}
                        type={toastType}
                    />
                )}
            </div>
        </AdminRoute>
    );
}