"use client";
import {useState, useEffect, JSX} from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, updateUser, getAllManagers } from "@/lib/api";
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
    ExclamationTriangleIcon,
    PlusIcon,
    XMarkIcon,
    UserGroupIcon
} from "@heroicons/react/24/outline";

interface Manager {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    function?: string;
}

export default function EditUserPage(): JSX.Element {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);

    // Form fields
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [loginName, setLoginName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [houseNumber, setHouseNumber] = useState<string>("");
    const [postalCode, setPostalCode] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [rank, setRank] = useState<"user" | "manager" | "admin">("user");
    const [password, setPassword] = useState<string>("");
    const [assignedManagerIds, setAssignedManagerIds] = useState<number[]>([]);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string>("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    // Helper function to check if a user rank can have managers
    const canHaveManagers = (userRank: string): boolean => {
        return userRank === "user";
    };

    // FIXED: Helper function to parse manager IDs from backend response
    const parseManagerIds = (userData: any): number[] => {
        console.log("🔍 Parsing manager IDs from user data:", userData);

        let managerIds: number[] = [];

        // Try different possible fields from backend
        if (userData.assignedManagerIds && Array.isArray(userData.assignedManagerIds)) {
            managerIds = userData.assignedManagerIds.filter((id: any) => id != null && !isNaN(id));
            console.log("📋 Using assignedManagerIds (camelCase):", managerIds);
        } else if (userData.AssignedManagerIds && Array.isArray(userData.AssignedManagerIds)) {
            managerIds = userData.AssignedManagerIds.filter((id: any) => id != null && !isNaN(id));
            console.log("📋 Using AssignedManagerIds (PascalCase):", managerIds);
        } else if (userData.allManagerIds && Array.isArray(userData.allManagerIds)) {
            managerIds = userData.allManagerIds.filter((id: any) => id != null && !isNaN(id));
            console.log("📋 Using allManagerIds (camelCase):", managerIds);
        } else if (userData.AllManagerIds && Array.isArray(userData.AllManagerIds)) {
            managerIds = userData.AllManagerIds.filter((id: any) => id != null && !isNaN(id));
            console.log("📋 Using AllManagerIds (PascalCase):", managerIds);
        }
        // Try to parse from ManagerIds string field
        else if (typeof userData.managerIds === 'string' && userData.managerIds.trim()) {
            try {
                managerIds = userData.managerIds
                    .split(',')
                    .map((id: string) => parseInt(id.trim()))
                    .filter((id: number) => !isNaN(id));
                console.log("📋 Parsed from managerIds string:", managerIds);
            } catch (error) {
                console.warn("⚠️ Failed to parse managerIds string:", userData.managerIds);
            }
        } else if (typeof userData.ManagerIds === 'string' && userData.ManagerIds.trim()) {
            try {
                managerIds = userData.ManagerIds
                    .split(',')
                    .map((id: string) => parseInt(id.trim()))
                    .filter((id: number) => !isNaN(id));
                console.log("📋 Parsed from ManagerIds string:", managerIds);
            } catch (error) {
                console.warn("⚠️ Failed to parse ManagerIds string:", userData.ManagerIds);
            }
        }
        // Fallback to single manager for backward compatibility
        else if (userData.managerId && !isNaN(userData.managerId)) {
            managerIds = [userData.managerId];
            console.log("📋 Using single managerId:", userData.managerId);
        } else if (userData.ManagerId && !isNaN(userData.ManagerId)) {
            managerIds = [userData.ManagerId];
            console.log("📋 Using ManagerId:", userData.ManagerId);
        }

        // Ensure we return unique IDs
        const uniqueManagerIds = [...new Set(managerIds)].filter(id => id > 0);
        console.log("✅ Final unique manager IDs:", uniqueManagerIds);

        return uniqueManagerIds;
    };

    useEffect(() => {
        const fetchData = async (): Promise<void> => {
            try {
                console.log("🔄 Fetching user data and managers...");

                // Fetch user data and available managers in parallel
                const [userData, managersData] = await Promise.all([
                    getUser(parseInt(userId)),
                    getAllManagers()
                ]);

                console.log("📥 Received user data:", userData);
                console.log("📥 Received managers data:", managersData);

                setUser(userData);
                setAvailableManagers(managersData || []);

                // Populate form fields
                setFirstName(userData.firstName || "");
                setLastName(userData.lastName || "");
                setEmail(userData.email || "");
                setLoginName(userData.loginName || "");
                setAddress(userData.address || "");
                setHouseNumber(userData.houseNumber || "");
                setPostalCode(userData.postalCode || "");
                setCity(userData.city || "");
                setRank(userData.rank || "user");

                // FIXED: Use the helper function to parse manager IDs
                const managerIds = parseManagerIds(userData);
                setAssignedManagerIds(managerIds);

            } catch (error) {
                console.error("❌ Error fetching data:", error);
                setToastMessage("Fout bij laden gebruiker");
                setToastType("error");
                setTimeout(() => setToastMessage(""), 3000);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    const handleRankChange = (newRank: "user" | "manager" | "admin") => {
        const oldRank = rank;
        setRank(newRank);

        // If changing from user to admin/manager, clear assigned managers
        if (oldRank === "user" && (newRank === "admin" || newRank === "manager")) {
            if (assignedManagerIds.length > 0) {
                setAssignedManagerIds([]);
                setToastMessage(`Managers verwijderd omdat ${newRank === "admin" ? "admins" : "managers"} geen managers kunnen hebben`);
                setToastType("success");
                setTimeout(() => setToastMessage(""), 3000);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !loginName.trim()) {
            setToastMessage("Vul alle verplichte velden in");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        // Clear manager assignments if user is admin or manager
        const finalManagerIds = canHaveManagers(rank) ? assignedManagerIds : [];

        // Validate manager assignments (max 10) only for users who can have managers
        if (canHaveManagers(rank) && assignedManagerIds.length > 10) {
            setToastMessage("Maximum 10 managers toegestaan");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        setIsSubmitting(true);

        try {
            console.log("🔄 Submitting user update...");
            console.log("📋 Current assigned manager IDs:", assignedManagerIds);
            console.log("📋 Final manager IDs to send to backend:", finalManagerIds);

            const updateData = {
                firstName,
                lastName,
                email,
                loginName,
                address,
                houseNumber,
                postalCode,
                city,
                rank,
                managerIds: [...finalManagerIds], // Send empty array for admin/manager ranks
                // Only include password if it's provided
                ...(password.trim() && {password})
            };

            console.log("📤 Complete update data being sent:", updateData);

            const response = await updateUser(parseInt(userId), updateData);

            console.log("✅ Update response received:", response);

            setToastMessage("Gebruiker succesvol bijgewerkt");
            setToastType("success");

            // Clear password field after successful update
            setPassword("");

            // Update local state to match what was sent to backend
            if (!canHaveManagers(rank)) {
                setAssignedManagerIds([]);
            }

            // FIXED: Refresh user data to show updated managers
            setTimeout(async () => {
                try {
                    console.log("🔄 Refreshing user data...");
                    const updatedUserData = await getUser(parseInt(userId));
                    console.log("📥 Refreshed user data:", updatedUserData);
                    const updatedManagerIds = parseManagerIds(updatedUserData);
                    setAssignedManagerIds(updatedManagerIds);
                    console.log("🔄 Refreshed manager assignments:", updatedManagerIds);
                } catch (error) {
                    console.error("❌ Error refreshing user data:", error);
                }
            }, 500);

            setTimeout(() => {
                router.push("/admin/users");
            }, 2000);
        } catch (error: any) {
            console.error("❌ Error updating user:", error);

            // Show more specific error message if available
            const errorMessage = error?.message || "Fout bij bijwerken gebruiker";
            setToastMessage(errorMessage);
            setToastType("error");
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const addManager = (managerId: number) => {
        console.log("➕ Adding manager:", managerId);
        console.log("📋 Current assigned managers:", assignedManagerIds);

        // Check if user rank allows manager assignment
        if (!canHaveManagers(rank)) {
            setToastMessage("Admins en managers kunnen geen managers toegewezen krijgen");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        if (assignedManagerIds.length >= 10) {
            setToastMessage("Maximum 10 managers toegestaan");
            setToastType("error");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        if (!assignedManagerIds.includes(managerId)) {
            const newManagerIds = [...assignedManagerIds, managerId];
            setAssignedManagerIds(newManagerIds);
            console.log("➕ Manager added. New complete list:", newManagerIds);
        } else {
            console.log("⚠️ Manager already assigned:", managerId);
        }
    };

    const removeManager = (managerId: number) => {
        const newManagerIds = assignedManagerIds.filter(id => id !== managerId);
        setAssignedManagerIds(newManagerIds);
        console.log("➖ Removed manager:", managerId, "New list:", newManagerIds);
    };

    const getManagerById = (id: number): Manager | undefined => {
        return availableManagers.find(m => m.id === id);
    };

    const getUnassignedManagers = (): Manager[] => {
        return availableManagers.filter(m => !assignedManagerIds.includes(m.id));
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
                    <div className="text-6xl mb-4">❌</div>
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
            <div className="space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="bg-gradient-elmar text-white rounded-2xl p-8 shadow-elmar-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => router.push("/admin/users")}
                                    className="btn btn-ghost text-white hover:bg-white/20 rounded-xl"
                                >
                                    <ArrowLeftIcon className="w-5 h-5"/>
                                </button>
                                <UserCircleIcon className="w-8 h-8"/>
                                <h1 className="text-4xl font-bold">Gebruiker Bewerken</h1>
                            </div>
                            <p className="text-blue-100 text-lg">Bewerk gegevens van {firstName} {lastName}</p>
                        </div>
                        <div className="avatar placeholder">
                            <div
                                className="bg-white/20 backdrop-blur-sm text-white rounded-xl w-16 h-16 flex items-center justify-center">
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
                            <div className="card bg-white shadow-elmar-card border-0 rounded-2xl">
                                <div className="card-body p-8">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <UserCircleIcon className="w-6 h-6"/>
                                        Gebruiker Info
                                    </h2>

                                    <div className="text-center mb-6">
                                        <div className="avatar placeholder mx-auto mb-4">
                                            <div
                                                className="bg-gradient-elmar text-white rounded-full w-20 h-20 flex items-center justify-center">
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

                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
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

                                    {/* Assigned Managers Section */}
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <UserGroupIcon className="w-5 h-5"/>
                                            Toegewezen Managers ({assignedManagerIds.length}/10)
                                        </h4>

                                        {!canHaveManagers(rank) ? (
                                            <div className="text-center py-4">
                                                <ExclamationTriangleIcon
                                                    className="w-8 h-8 text-amber-500 mx-auto mb-2"/>
                                                <p className="text-gray-600 text-sm italic">
                                                    {rank === "admin" ? "Administrators" : "Managers"} kunnen geen
                                                    managers hebben
                                                </p>
                                            </div>
                                        ) : assignedManagerIds.length === 0 ? (
                                            <p className="text-gray-500 text-sm italic text-center py-2">
                                                Geen managers toegewezen
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {assignedManagerIds.map((managerId) => {
                                                    const manager = getManagerById(managerId);
                                                    return manager ? (
                                                        <div
                                                            key={managerId}
                                                            className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="avatar placeholder">
                                                                    <div
                                                                        className="bg-gradient-elmar text-white rounded-full w-8 h-8 flex items-center justify-center text-xs">
                                                                        <span>
                                                                            {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{manager.fullName}</p>
                                                                    {manager.function && (
                                                                        <p className="text-xs text-gray-500">{manager.function}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeManager(managerId)}
                                                                className="btn btn-ghost btn-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                title="Manager verwijderen"
                                                            >
                                                                <XMarkIcon className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div key={managerId}
                                                             className="flex items-center justify-between bg-red-50 rounded-lg p-2 shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="avatar placeholder">
                                                                    <div
                                                                        className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs">
                                                                        <span>?</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm text-red-600">Manager
                                                                        niet gevonden (ID: {managerId})</p>
                                                                    <p className="text-xs text-red-500">Mogelijk
                                                                        verwijderd</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeManager(managerId)}
                                                                className="btn btn-ghost btn-xs text-red-500 hover:text-red-700 hover:bg-red-100"
                                                                title="Verwijderen"
                                                            >
                                                                <XMarkIcon className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Edit Form */}
                        <div className="xl:col-span-2">
                            <div className="card bg-white shadow-elmar-card border-0 rounded-2xl">
                                <div className="card-body p-8">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-8">Gegevens Bewerken</h2>

                                    {/* Personal Info */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <UserCircleIcon className="w-5 h-5"/>
                                            Persoonlijke Gegevens
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span
                                                        className="label-text font-semibold text-gray-700">Voornaam *</span>
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
                                            <EnvelopeIcon className="w-5 h-5"/>
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
                                            <MapPinIcon className="w-5 h-5"/>
                                            Adres Gegevens
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                            <div className="md:col-span-3">
                                                <label className="label">
                                                    <span
                                                        className="label-text font-semibold text-gray-700">Adres</span>
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
                                                    <span
                                                        className="label-text font-semibold text-gray-700">Postcode</span>
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
                                                    <span
                                                        className="label-text font-semibold text-gray-700">Plaats</span>
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

                                    {/* Manager Assignment Section - IMPROVED WITH RESTRICTIONS */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <UserGroupIcon className="w-5 h-5"/>
                                            Manager Toewijzing
                                        </h3>

                                        {!canHaveManagers(rank) ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600"/>
                                                    <h4 className="font-semibold text-amber-800">Manager toewijzing niet
                                                        beschikbaar</h4>
                                                </div>
                                                <p className="text-amber-700">
                                                    {rank === "admin" ? "Administrators" : "Managers"} kunnen geen
                                                    managers toegewezen krijgen.
                                                    Alleen medewerkers (gebruikers) kunnen managers hebben.
                                                </p>
                                                {assignedManagerIds.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="text-amber-700 font-medium mb-2">
                                                            De volgende managers zullen worden verwijderd bij opslaan:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {assignedManagerIds.map((managerId) => {
                                                                const manager = getManagerById(managerId);
                                                                return manager ? (
                                                                    <div key={managerId}
                                                                         className="flex items-center gap-2 text-sm text-amber-700">
                                                                        <span>• {manager.fullName}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div key={managerId}
                                                                         className="flex items-center gap-2 text-sm text-amber-700">
                                                                        <span>• Manager ID: {managerId} (niet gevonden)</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 rounded-xl p-6">
                                                <div className="mb-4">
                                                    <label className="label">
                                                        <span className="label-text font-semibold text-gray-700">
                                                            Voeg Manager Toe ({assignedManagerIds.length}/10)
                                                        </span>
                                                    </label>
                                                    <select
                                                        className="select select-bordered border-2 border-gray-200 focus:border-elmar-primary focus:ring-2 focus:ring-elmar-primary focus:ring-opacity-20 rounded-xl w-full"
                                                        value=""
                                                        onChange={(e) => {
                                                            const managerId = parseInt(e.target.value);
                                                            if (managerId) {
                                                                addManager(managerId);
                                                                e.target.value = ""; // Reset select
                                                            }
                                                        }}
                                                        disabled={assignedManagerIds.length >= 10}
                                                    >
                                                        <option value="">
                                                            {assignedManagerIds.length >= 10
                                                                ? "Maximum aantal managers bereikt"
                                                                : getUnassignedManagers().length === 0
                                                                    ? "Alle managers zijn al toegewezen"
                                                                    : "Selecteer een manager..."}
                                                        </option>
                                                        {getUnassignedManagers().map((manager) => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.fullName} {manager.function ? `(${manager.function})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {assignedManagerIds.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold text-gray-700 mb-3">
                                                            Toegewezen Managers ({assignedManagerIds.length}):
                                                        </h4>
                                                        <div
                                                            className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                                                            {assignedManagerIds.map((managerId, index) => {
                                                                const manager = getManagerById(managerId);
                                                                return manager ? (
                                                                    <div
                                                                        key={`${managerId}-${index}`}
                                                                        className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="avatar placeholder">
                                                                                <div
                                                                                    className="bg-gradient-elmar text-white rounded-full w-10 h-10 flex items-center justify-center text-sm">
                                                                                    <span>
                                                                                        {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-sm">{manager.fullName}</p>
                                                                                {manager.function && (
                                                                                    <p className="text-xs text-gray-500">{manager.function}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeManager(managerId)}
                                                                            className="btn btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                                            title="Manager verwijderen"
                                                                        >
                                                                            <XMarkIcon className="w-4 h-4"/>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div key={`${managerId}-${index}`}
                                                                         className="flex items-center justify-between bg-red-50 rounded-lg p-3 shadow-sm border border-red-200">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="avatar placeholder">
                                                                                <div
                                                                                    className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm">
                                                                                    <span>?</span>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-sm text-red-600">Manager
                                                                                    niet gevonden (ID: {managerId})</p>
                                                                                <p className="text-xs text-red-500">Mogelijk
                                                                                    verwijderd</p>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeManager(managerId)}
                                                                            className="btn btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg"
                                                                            title="Verwijderen"
                                                                        >
                                                                            <XMarkIcon className="w-4 h-4"/>
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Login Info */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                            <KeyIcon className="w-5 h-5"/>
                                            Login & Beveiliging
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span
                                                        className="label-text font-semibold text-gray-700">Inlognaam *</span>
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
                                                    onChange={(e) => handleRankChange(e.target.value as "user" | "manager" | "admin")}
                                                    required
                                                >
                                                    <option value="user">Medewerker</option>
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
                                            className="btn bg-gradient-elmar border-0 text-white rounded-xl hover:scale-105 hover:shadow-elmar-hover transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                    Opslaan...
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-5 h-5"/>
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
                    <ToastNotification message={toastMessage} type={toastType}/>
                )}
            </div>
        </AdminRoute>
    );
}
