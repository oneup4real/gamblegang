"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import {
    Users,
    Trophy,
    Activity,
    Search,
    Trash2,
    Shield,
    ShieldAlert,
    Loader2,
    Calendar,
    Mail
} from "lucide-react";
import {
    getAdminStats,
    getAllUsers,
    getAllLeagues,
    toggleSuperAdmin,
    deleteUserData,
    deleteLeagueAsAdmin,
    DashboardStats
} from "@/lib/services/admin-service";
import { UserProfile } from "@/lib/services/user-service";
import { League } from "@/lib/services/league-service"; // Ensure this matches your league type
import { format } from "date-fns";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

import { LeagueDetailsModal } from "./league-details-modal";

export default function AdminDashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalLeagues: 0, totalBets: 0 });
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [leagues, setLeagues] = useState<League[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "leagues">("overview");
    const [searchTerm, setSearchTerm] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Detailed View State
    const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

    // 1. Protection: Verify Super Admin Access
    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
                return;
            }

            const verifyAdmin = async () => {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists() && snap.data().isSuperAdmin) {
                    setIsCheckingAdmin(false);
                } else {
                    router.push("/dashboard"); // Kick out non-admins
                }
            };
            verifyAdmin();
        }
    }, [user, loading, router]);

    // 2. Fetch Data based on active tab
    useEffect(() => {
        if (isCheckingAdmin) return;

        const fetchData = async () => {
            if (activeTab === "overview") {
                const s = await getAdminStats();
                setStats(s);
            } else if (activeTab === "users") {
                const u = await getAllUsers(200); // Limit to 200 for now
                setUsers(u);
            } else if (activeTab === "leagues") {
                const l = await getAllLeagues(200); // Limit to 200
                setLeagues(l);
            }
        };

        fetchData();
    }, [activeTab, isCheckingAdmin, actionLoading]); // Refresh when actions happen

    const handleToggleAdmin = async (uid: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'REMOVE' : 'GRANT'} Super Admin privileges?`)) return;
        setActionLoading(true);
        try {
            await toggleSuperAdmin(uid, currentStatus);
        } catch (e) {
            console.error(e);
            alert("Failed to update role");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!confirm("DANGER: This will delete the user's profile and data. This cannot be undone.")) return;
        setActionLoading(true);
        try {
            await deleteUserData(uid);
        } catch (e) {
            console.error(e);
            alert("Failed to delete user");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteLeague = async (leagueId: string) => {
        if (!confirm("DANGER: This will delete the league entirely. This cannot be undone.")) return;
        setActionLoading(true);
        try {
            await deleteLeagueAsAdmin(leagueId);
        } catch (e) {
            console.error(e);
            alert("Failed to delete league");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || isCheckingAdmin) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    // --- Search Filtering ---
    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.uid.includes(searchTerm)
    );

    const filteredLeagues = leagues.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.id.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-red-900 text-white shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="h-8 w-8 text-red-400" />
                        <h1 className="text-3xl font-black uppercase tracking-widest">Super Admin</h1>
                    </div>
                    <p className="opacity-80 font-medium">System Control Center</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "users", label: "Users Management", icon: Users },
                        { id: "leagues", label: "Leagues Management", icon: Trophy },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); setSearchTerm(""); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border-2 transition-all whitespace-nowrap
                                    ${isActive
                                        ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(200,50,50,1)]"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-black"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">

                    {/* --- Overview Tab --- */}
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <StatCard
                                label="Total Users"
                                value={stats.totalUsers}
                                icon={Users}
                                color="bg-blue-100 text-blue-800"
                            />
                            <StatCard
                                label="Total Leagues"
                                value={stats.totalLeagues}
                                icon={Trophy}
                                color="bg-yellow-100 text-yellow-800"
                            />
                            <StatCard
                                label="Total Bets (Approx)"
                                value={stats.totalBets}
                                icon={Activity}
                                color="bg-green-100 text-green-800"
                                subtext="Calculated from indexes"
                            />
                        </div>
                    )}

                    {/* --- Users Tab --- */}
                    {activeTab === "users" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
                                <Search className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users by name, email, or UID..."
                                    className="bg-transparent border-none outline-none w-full font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-black text-gray-500 font-bold uppercase text-xs tracking-wider">
                                            <th className="p-3">User</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3">Joined</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-medium">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.uid} className="border-b border-gray-200 hover:bg-gray-50 group">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-400">
                                                            {u.photoURL ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={u.photoURL} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center font-bold text-gray-500">
                                                                    {u.displayName?.charAt(0) || "U"}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-black">{u.displayName || "Unknown"}</div>
                                                            <div className="text-gray-500 text-xs flex items-center gap-1">
                                                                <Mail className="h-3 w-3" /> {u.email}
                                                            </div>
                                                            <div className="text-gray-400 text-[10px] font-mono mt-0.5">{u.uid}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    {u.isSuperAdmin ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs border border-red-200">
                                                            <ShieldAlert className="h-3 w-3" /> SUPER ADMIN
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">Player</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {u.createdAt?.seconds ? format(new Date(u.createdAt.seconds * 1000), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleToggleAdmin(u.uid, !!u.isSuperAdmin)}
                                                            className={`p-2 rounded hover:scale-105 transition-transform ${u.isSuperAdmin ? 'bg-gray-200 text-gray-600' : 'bg-red-50 text-red-600 border border-red-200'}`}
                                                            title={u.isSuperAdmin ? "Revoke Admin" : "Grant Admin"}
                                                        >
                                                            <Shield className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.uid)}
                                                            className="p-2 rounded bg-gray-100 text-gray-500 hover:bg-red-600 hover:text-white transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 font-medium">No users found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- Leagues Tab --- */}
                    {activeTab === "leagues" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
                                <Search className="h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search leagues by name or ID..."
                                    className="bg-transparent border-none outline-none w-full font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-black text-gray-500 font-bold uppercase text-xs tracking-wider">
                                            <th className="p-3">League</th>
                                            <th className="p-3">Mode</th>
                                            <th className="p-3">Members</th>
                                            <th className="p-3">Created</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-medium">
                                        {filteredLeagues.map((l) => (
                                            <tr
                                                key={l.id}
                                                onClick={() => setSelectedLeague(l)}
                                                className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                                            >
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{l.icon || "🏆"}</span>
                                                        <div>
                                                            <div className="font-bold text-black group-hover:text-primary transition-colors">{l.name}</div>
                                                            <div className="text-gray-400 text-[10px] font-mono">ID: {l.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${l.mode === 'ZERO_SUM' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                                                        {l.mode}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-3 w-3" />
                                                        <span className="font-bold">{l.memberCount}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {l.createdAt?.seconds ? format(new Date(l.createdAt.seconds * 1000), 'MMM d, yyyy') : '-'}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteLeague(l.id); }}
                                                        className="p-2 rounded bg-gray-100 text-gray-500 hover:bg-red-600 hover:text-white transition-colors border border-transparent hover:border-black hover:shadow-sm"
                                                        title="Delete League"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredLeagues.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 font-medium">No leagues found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <LeagueDetailsModal league={selectedLeague} onClose={() => setSelectedLeague(null)} />
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, subtext }: { label: string, value: number, icon: any, color: string, subtext?: string }) {
    return (
        <div className={`p-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between ${color}`}>
            <div>
                <p className="text-sm font-bold opacity-70 uppercase tracking-wide">{label}</p>
                <div className="text-4xl font-black mt-1">{value.toLocaleString()}</div>
                {subtext && <p className="text-[10px] font-bold mt-1 opacity-60">{subtext}</p>}
            </div>
            <div className="bg-white/30 p-3 rounded-full border-2 border-black/10">
                <Icon className="h-8 w-8" />
            </div>
        </div>
    );
}
