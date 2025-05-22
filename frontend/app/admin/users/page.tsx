"use client";
import { useState, useEffect } from "react";
import { getUsers, deleteUser } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import { useRouter } from "next/navigation";
import ToastNotification from "@/components/ToastNotification";
import { User } from "@/lib/types";

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Delete confirmation
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Toast notification
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getUsers();

                // SAFE ARRAY HANDLING
                let safeData: User[] = [];
                if (Array.isArray(data)) {
                    safeData = data;
                } else if (data && typeof data === 'object' && Array.isArray(data.users)) {
                    safeData = data.users;
                } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
                    safeData = data.data;
                } else {
                    console.warn("Received non-array user data:", data);
                    safeData = [];
                }

                setUsers(safeData);
            } catch (error) {
                console.error("Error fetching users:", error);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = (() => {
        if (!Array.isArray(users)) return [];

        if (!searchTerm.trim()) return users;

        try {
            const searchLower = searchTerm.toLowerCase();
            return users.filter((user: User) => {
                if (!user || typeof user !== 'object') return false;

                try {
                    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
                    const email = (user.email || '').toLowerCase();

                    return fullName.includes(searchLower) || email.includes(searchLower);
                } catch (error) {
                    console.warn("Error filtering user:", user, error);
                    return false;
                }
            });
        } catch (error) {
            console.error("Error filtering users:", error);
            return users;
        }
    })();

    const handleDeleteClick = (userId: number) => {
        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async (): Promise<void> => {
        if (!userToDelete) return;

        try {
            await deleteUser(userToDelete);
            // Refresh gebruikerslijst
            const updatedUsers = Array.isArray(users)
                ? users.filter((user: User) => user.id !== userToDelete)
                : [];
            setUsers(updatedUsers);
            setToastMessage("Gebruiker succesvol verwijderd");
            setToastType("success");
        } catch (error) {
            console.error("Error deleting user:", error);
            setToastMessage("Fout bij verwijderen gebruiker");
            setToastType("error");
        }

        setShowDeleteModal(false);
        setUserToDelete(null);

        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleEditClick = (userId: number) => {
        router.push(`/admin/users/edit/${userId}`);
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">
            <div className="loading loading-spinner loading-lg"></div>
        </div>;
    }

    return (
        <AdminRoute>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-8">Gebruikersbeheer</h1>

                <div className="card bg-base-100 shadow-xl mb-8">
                    <div className="card-body">
                        <div className="form-control">
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder="Zoek op naam of email..."
                                    className="input input-bordered w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button className="btn btn-square">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Naam</th>
                                    <th>Email</th>
                                    <th>Functie</th>
                                    <th>Rol</th>
                                    <th>Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
                                    filteredUsers.map((user: User, index) => {
                                        try {
                                            if (!user || typeof user !== 'object') {
                                                return (
                                                    <tr key={index}>
                                                        <td colSpan={6}>Ongeldige gebruiker</td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={user.id || index}>
                                                    <td>{user.id || 'Onbekend'}</td>
                                                    <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Naamloos'}</td>
                                                    <td>{user.email || 'Geen email'}</td>
                                                    <td>{user.function || "-"}</td>
                                                    <td>
                                                        <span className={`badge ${
                                                            user.rank === "admin" ? "badge-primary" :
                                                                user.rank === "manager" ? "badge-secondary" : "badge-accent"
                                                        }`}>
                                                            {user.rank || 'onbekend'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-primary mr-2"
                                                            onClick={() => handleEditClick(user.id)}
                                                            disabled={!user.id}
                                                        >
                                                            Bewerken
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-error"
                                                            onClick={() => handleDeleteClick(user.id)}
                                                            disabled={!user.id}
                                                        >
                                                            Verwijderen
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        } catch (error) {
                                            console.warn("Error rendering user:", user, error);
                                            return (
                                                <tr key={index}>
                                                    <td colSpan={6}>Fout bij laden gebruiker</td>
                                                </tr>
                                            );
                                        }
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-gray-500">
                                            {searchTerm ? 'Geen gebruikers gevonden voor deze zoekopdracht' : 'Geen gebruikers gevonden'}
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Delete confirmation modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
                            <h3 className="text-lg font-bold mb-4">Gebruiker verwijderen</h3>
                            <p>Weet je zeker dat je deze gebruiker wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.</p>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Annuleren
                                </button>
                                <button
                                    className="btn btn-error"
                                    onClick={confirmDelete}
                                >
                                    Verwijderen
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {toastMessage && (
                    <ToastNotification message={toastMessage} type={toastType} />
                )}
            </div>
        </AdminRoute>
    );
}