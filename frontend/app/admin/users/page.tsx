"use client";
import {useState, useEffect, JSX} from "react";
import { getUsers, deleteUser } from "@/lib/api";
import AdminRoute from "@/components/AdminRoute";
import { useRouter } from "next/navigation";
import ToastNotification from "@/components/ToastNotification";
import { User } from "@/lib/types";
import {
    UsersIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    UserPlusIcon,
    EyeIcon
} from "@heroicons/react/24/outline";

export default function AdminUsersPage(): JSX.Element {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Delete confirmation
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    // Toast notification
    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    useEffect(() => {
        const fetchUsers = async (): Promise<void> => {
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

    const handleDeleteClick = (userId: number): void => {
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

    const handleEditClick = (userId: number): void => {
        router.push(`/admin/users/edit/${userId}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg text-elmar-primary mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Gebruikers laden...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <UsersIcon className="w-8 h-8" />
                                <h1 className="text-4xl font-bold">Gebruikersbeheer</h1>
                            </div>
                            <p className="text-blue-100 text-lg">Beheer alle gebruikers en hun rechten</p>
                        </div>
                        <button
                            onClick={() => router.push("/admin/users/create")}
                            className="btn bg-white/20 border-white/30 text-white hover:bg-white/30 rounded-xl"
                        >
                            <UserPlusIcon className="w-5 h-5 mr-2" />
                            Nieuwe Gebruiker
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-elmar-card">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                                <UsersIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Totaal</p>
                                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-elmar-card">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl">
                                <UsersIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Actief</p>
                                <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.rank !== 'inactive').length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-elmar-card">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl">
                                <UsersIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Admins</p>
                                <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.rank === 'admin').length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-elmar-card">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl">
                                <UsersIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Managers</p>
                                <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.rank === 'manager').length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="card bg-white shadow-elmar-card border-0 rounded-2xl">
                    <div className="card-body p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Alle Gebruikers</h2>
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">{filteredUsers.length}</span> van <span className="font-semibold">{users.length}</span> gebruikers
                            </div>
                        </div>

                        <div className="form-control mb-6">
                            <div className="relative">
                                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Zoek op naam of email..."
                                    className="input input-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl pl-10 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-gray-700 font-semibold">👤 Gebruiker</th>
                                    <th className="text-gray-700 font-semibold">📧 Email</th>
                                    <th className="text-gray-700 font-semibold">💼 Functie</th>
                                    <th className="text-gray-700 font-semibold">🔑 Rol</th>
                                    <th className="text-gray-700 font-semibold">⚙️ Acties</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? (
                                    filteredUsers.map((user: User, index) => {
                                        try {
                                            if (!user || typeof user !== 'object') {
                                                return (
                                                    <tr key={index}>
                                                        <td colSpan={5} className="text-center text-error">Ongeldige gebruiker</td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={user.id || index} className="hover:bg-gray-50 transition-colors duration-150">
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="avatar placeholder">
                                                                <div className="bg-gradient-elmar text-white rounded-full w-10 h-10 flex items-center justify-center">
                                                                        <span className="text-sm font-bold">
                                                                            {`${user.firstName || ''} ${user.lastName || ''}`.trim().split(' ').map(n => n[0]).join('').substring(0, 2) || 'NN'}
                                                                        </span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Naamloos'}</div>
                                                                <div className="text-sm opacity-50">ID: {user.id || 'Onbekend'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="font-medium">{user.email || 'Geen email'}</td>
                                                    <td>{user.function || "-"}</td>
                                                    <td>
                                                            <span className={`badge ${
                                                                user.rank === "admin" ? "badge-error" :
                                                                    user.rank === "manager" ? "badge-warning" : "badge-primary"
                                                            }`}>
                                                                {user.rank || 'onbekend'}
                                                            </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-2">
                                                            <button
                                                                className="btn btn-sm btn-outline btn-primary rounded-lg hover:scale-105 transition-all duration-200"
                                                                onClick={() => handleEditClick(user.id)}
                                                                disabled={!user.id}
                                                                title="Bewerken"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline btn-error rounded-lg hover:scale-105 transition-all duration-200"
                                                                onClick={() => handleDeleteClick(user.id)}
                                                                disabled={!user.id}
                                                                title="Verwijderen"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        } catch (error) {
                                            console.warn("Error rendering user:", user, error);
                                            return (
                                                <tr key={index}>
                                                    <td colSpan={5} className="text-center text-error">Fout bij laden gebruiker</td>
                                                </tr>
                                            );
                                        }
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-6xl">👥</div>
                                                <div className="text-xl font-semibold text-gray-600">
                                                    {searchTerm ? 'Geen gebruikers gevonden' : 'Geen gebruikers'}
                                                </div>
                                                <div className="text-gray-500">
                                                    {searchTerm ? 'Probeer een andere zoekopdracht' : 'Er zijn nog geen gebruikers toegevoegd'}
                                                </div>
                                            </div>
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
                        <div className="bg-white p-8 rounded-2xl shadow-elmar-lg max-w-md w-full mx-4">
                            <h3 className="text-xl font-bold mb-4 text-gray-800">Gebruiker verwijderen</h3>
                            <p className="text-gray-600 mb-6">
                                Weet je zeker dat je deze gebruiker wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    className="btn btn-outline rounded-xl"
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Annuleren
                                </button>
                                <button
                                    className="btn btn-error rounded-xl hover:scale-105 transition-all duration-200"
                                    onClick={confirmDelete}
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" />
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