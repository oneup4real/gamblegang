"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle, Save, RefreshCw, Trash, Users, Crown, Shield, User, Trophy, Info } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { League, updateLeague, resetLeague, LeagueMember, updateMemberRole, LEAGUE_COLOR_SCHEMES, LeagueColorScheme, LEAGUE_ICONS, backfillPowerUps } from "@/lib/services/league-service";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { LeagueRole, hasPermission } from "@/lib/rbac";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useTranslations } from "next-intl";

interface LeagueSettingsModalProps {
    league: League;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function LeagueSettingsModal({ league, isOpen, onClose, onUpdate }: LeagueSettingsModalProps) {
    const { user } = useAuth();
    const tHelp = useTranslations('Help');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(league.name);
    // Match Settings (Standard Mode)
    const [exactMult, setExactMult] = useState<number | "">(league.matchSettings?.exact || 3);
    const [winnerMult, setWinnerMult] = useState<number | "">(league.matchSettings?.winner || 2);
    const [diffMult, setDiffMult] = useState<number | "">(league.matchSettings?.diff || 1);

    const [excludeDrawDiff, setExcludeDrawDiff] = useState(league.matchSettings?.excludeDrawDiff || false);
    const [choicePoints, setChoicePoints] = useState(league.matchSettings?.choice || 1);
    const [rangePoints, setRangePoints] = useState(league.matchSettings?.range || 1);

    // Members tab
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [myRole, setMyRole] = useState<LeagueRole>("MEMBER");

    // Dispute settings
    // Dispute settings
    const [disputeWindowHours, setDisputeWindowHours] = useState(league.disputeWindowHours || 12);
    // AI Settings
    const [aiAutoConfirmEnabled, setAiAutoConfirmEnabled] = useState(league.aiAutoConfirmEnabled !== false); // Default true

    // Appearance settings
    const [selectedIcon, setSelectedIcon] = useState(league.icon || (league.mode === "ZERO_SUM" ? "💰" : "🎮"));
    const [selectedColorScheme, setSelectedColorScheme] = useState<LeagueColorScheme>(league.colorScheme || "purple");

    // Arcade Power-Up Settings
    const [x2Start, setX2Start] = useState(league.arcadePowerUpSettings?.x2 ?? 3);
    const [x3Start, setX3Start] = useState(league.arcadePowerUpSettings?.x3 ?? 1);
    const [x4Start, setX4Start] = useState(league.arcadePowerUpSettings?.x4 ?? 0);

    const [activeTab, setActiveTab] = useState<"general" | "members" | "danger">("general");
    const [confirmBackfill, setConfirmBackfill] = useState(false);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const updates: Partial<League> = {
                name,
                disputeWindowHours,
                aiAutoConfirmEnabled,
                icon: selectedIcon,
                colorScheme: selectedColorScheme
            };
            if (league.mode === "STANDARD") {
                updates.matchSettings = {
                    exact: Number(exactMult),
                    winner: Number(winnerMult),
                    diff: Number(diffMult),
                    excludeDrawDiff,
                    choice: choicePoints,
                    range: rangePoints
                };
                updates.arcadePowerUpSettings = {
                    x2: x2Start,
                    x3: x3Start,
                    x4: x4Start
                };
            }

            // Ensure no undefined values in updates (though state should prevent this)
            const cleanUpdates = JSON.parse(JSON.stringify(updates));
            await updateLeague(league.id, cleanUpdates);
            onUpdate();
            alert("League updated");
        } catch (e) {
            alert("Error updating league");
        } finally {
            setLoading(false);
        }
    };

    // Fetch members when modal opens
    useEffect(() => {
        if (isOpen && league?.id) {
            const fetchMembers = async () => {
                const membersRef = collection(db, "leagues", league.id, "members");
                const membersSnap = await getDocs(membersRef);
                const membersList = membersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as LeagueMember));
                setMembers(membersList);

                // Find my role
                const me = membersList.find(m => m.uid === user?.uid);
                if (me) setMyRole(me.role);
            };
            fetchMembers();
        }
    }, [isOpen, league?.id, user?.uid]);

    const handleRoleChange = async (memberId: string, newRole: LeagueRole) => {
        if (!hasPermission(myRole, "ASSIGN_ROLE")) {
            alert("You don't have permission to change roles");
            return;
        }

        setLoading(true);
        try {
            await updateMemberRole(league.id, memberId, newRole, myRole);
            // Refresh members list
            const membersRef = collection(db, "leagues", league.id, "members");
            const membersSnap = await getDocs(membersRef);
            const membersList = membersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as LeagueMember));
            setMembers(membersList);
            onUpdate();
        } catch (e: any) {
            alert(e.message || "Failed to update role");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        const confirmMsg = "DANGER: This will reset EVERY member's points to " + league.startCapital + ". This cannot be undone.";
        if (!confirm(confirmMsg)) return;
        // Double confirmation
        if (prompt("Type 'RESET' to confirm") !== "RESET") return;

        setLoading(true);
        try {
            await resetLeague(league.id, league.startCapital);
            onUpdate();
            alert("Season reset! All members back to starting capital.");
            onClose();
        } catch (e) {
            alert("Error resetting league");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black tracking-tight font-comic uppercase">League Settings</h2>
                            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex gap-4 border-b-2 border-black mb-6">
                            <button
                                onClick={() => setActiveTab("general")}
                                className={`pb-2 text-sm font-black uppercase tracking-wide transition-all ${activeTab === "general" ? "border-b-4 border-primary text-primary translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                General
                            </button>
                            <button
                                onClick={() => setActiveTab("members")}
                                className={`pb-2 text-sm font-black uppercase tracking-wide transition-all flex items-center gap-1 ${activeTab === "members" ? "border-b-4 border-purple-500 text-purple-500 translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                <Users className="h-4 w-4" /> Members
                            </button>
                            <button
                                onClick={() => setActiveTab("danger")}
                                className={`pb-2 text-sm font-black uppercase tracking-wide transition-all ${activeTab === "danger" ? "border-b-4 border-red-500 text-red-500 translate-y-[2px]" : "text-gray-500 hover:text-black"}`}
                            >
                                Danger Zone
                            </button>
                        </div>

                        {activeTab === "general" && (
                            <form onSubmit={handleUpdateName} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-black uppercase">League Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-lg font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-primary/20"
                                    />
                                </div>



                                {/* Appearance Settings */}
                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                    <label className="text-sm font-black uppercase flex items-center gap-2">
                                        🎨 Appearance
                                    </label>

                                    {/* Preview Card */}
                                    <div className={`bg-gradient-to-r ${LEAGUE_COLOR_SCHEMES[selectedColorScheme].from} ${LEAGUE_COLOR_SCHEMES[selectedColorScheme].to} rounded-xl px-4 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl drop-shadow-md">{selectedIcon}</span>
                                            <span className={`font-black text-lg uppercase ${LEAGUE_COLOR_SCHEMES[selectedColorScheme].text} drop-shadow-sm`}>
                                                {name || "Your League"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Icon Selection */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Select Icon</label>
                                        <div className="flex flex-wrap gap-2">
                                            {LEAGUE_ICONS.map((icon) => (
                                                <button
                                                    key={icon}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(icon)}
                                                    className={`w-9 h-9 text-lg rounded-lg border-2 transition-all flex items-center justify-center ${selectedIcon === icon
                                                        ? "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[1px]"
                                                        : "border-gray-200 bg-white hover:border-gray-400"
                                                        }`}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Color Scheme Selection */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-600 uppercase">Select Color Theme</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(Object.entries(LEAGUE_COLOR_SCHEMES) as [LeagueColorScheme, typeof LEAGUE_COLOR_SCHEMES[LeagueColorScheme]][]).map(([key, scheme]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setSelectedColorScheme(key)}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${selectedColorScheme === key
                                                        ? "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-[1px]"
                                                        : "border-gray-200 hover:border-gray-400"
                                                        }`}
                                                >
                                                    <div className={`w-full h-5 rounded bg-gradient-to-r ${scheme.from} ${scheme.to}`} />
                                                    <span className="text-[9px] font-bold text-gray-600">{scheme.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {league.mode === "STANDARD" && (
                                    <div className="space-y-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                                        <h4 className="text-sm font-black uppercase text-purple-800 flex items-center gap-2">
                                            Arcade Point Settings
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                    Exact
                                                    <HelpTooltip text={tHelp('points_exact')} position="top" />
                                                </label>
                                                <input type="number" min={1} value={exactMult} onChange={(e) => {
                                                    const val = e.target.value;
                                                    setExactMult(val === "" ? "" : Number(val));
                                                }} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                    Diff
                                                    <HelpTooltip text={tHelp('points_diff')} position="top" />
                                                </label>
                                                <input type="number" min={1} value={diffMult} onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDiffMult(val === "" ? "" : Number(val));
                                                }} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                    Winner
                                                    <HelpTooltip text={tHelp('points_winner')} position="top" />
                                                </label>
                                                <input type="number" min={1} value={winnerMult} onChange={(e) => {
                                                    const val = e.target.value;
                                                    setWinnerMult(val === "" ? "" : Number(val));
                                                }} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-purple-200">
                                            <input
                                                type="checkbox"
                                                id="excludeDrawDiff"
                                                checked={excludeDrawDiff}
                                                onChange={e => setExcludeDrawDiff(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="excludeDrawDiff" className="text-xs font-bold text-purple-800 uppercase cursor-pointer select-none">
                                                No Diff points for Draws
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                    Choice
                                                    <HelpTooltip text={tHelp('points_choice')} position="top" />
                                                </label>
                                                <input type="number" min={1} value={choicePoints} onChange={(e) => setChoicePoints(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                                    Guess
                                                    <HelpTooltip text={tHelp('points_range')} position="top" />
                                                </label>
                                                <input type="number" min={1} value={rangePoints} onChange={(e) => setRangePoints(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-purple-600 space-y-1 mt-2">
                                            <p>HIGHEST TIER APPLIES: Points for Winner (Base) are NOT added to Exact/Diff bonus.</p>
                                            <p>Example: Exact Score wins the 'Exact' amount only.</p>
                                            <p className="opacity-75 italic border-t border-purple-200 pt-1">
                                                Note: No fixed points can be set for Zero Sum betting, because the odds are calculated dynamically like in real life.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {league.mode === "STANDARD" && (
                                    <div className="space-y-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                                        <h4 className="text-sm font-black uppercase text-yellow-800 flex items-center gap-2">
                                            ⚡ Power-Up Starter Pack
                                        </h4>
                                        <p className="text-xs font-bold text-gray-500">
                                            How many power-ups each player receives when joining:
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">x2 Boost</label>
                                                <input type="number" min={0} value={x2Start} onChange={(e) => setX2Start(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">x3 Mega</label>
                                                <input type="number" min={0} value={x3Start} onChange={(e) => setX3Start(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">x4 Jackpot</label>
                                                <input type="number" min={0} value={x4Start} onChange={(e) => setX4Start(Number(e.target.value))} className="w-full h-10 px-2 rounded-lg border-2 border-black font-bold text-center" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {league.mode === "ZERO_SUM" && (
                                    <div className="space-y-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                                        <h4 className="text-sm font-black uppercase text-gray-500">Betting Settings</h4>
                                        <p className="text-xs font-bold text-gray-400 italic">
                                            Note: No fixed points can be set for Zero Sum betting, because the odds are calculated dynamically like in real life.
                                        </p>
                                    </div>
                                )}

                                {/* Dispute Window Setting */}
                                <div className="space-y-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                    <h4 className="text-sm font-black uppercase text-orange-800 flex items-center gap-2">
                                        ⏱️ Dispute Window
                                    </h4>
                                    <p className="text-xs font-bold text-gray-600">
                                        How long players have to dispute a result before it&apos;s finalized:
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {[1, 6, 12, 24, 48].map((hours) => (
                                            <button
                                                key={hours}
                                                type="button"
                                                onClick={() => setDisputeWindowHours(hours)}
                                                className={`px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all ${disputeWindowHours === hours
                                                    ? "bg-orange-500 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    : "bg-white border-gray-300 hover:border-orange-500"
                                                    }`}
                                            >
                                                {hours}h
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-bold text-orange-600">
                                        Current: {disputeWindowHours} hours
                                    </p>
                                </div>

                                {/* AI Auto-Confirm Setting */}
                                <div className="space-y-3 p-4 bg-teal-50 border-2 border-teal-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black uppercase text-teal-800 flex items-center gap-2">
                                                🤖 AI Auto-Confirm
                                            </h4>
                                            <p className="text-xs font-bold text-gray-600 max-w-[280px]">
                                                Automatically resolve bets using AI (Gemini) 2 hours after the event.
                                            </p>
                                        </div>
                                        <div
                                            onClick={() => setAiAutoConfirmEnabled(!aiAutoConfirmEnabled)}
                                            className={`relative h-8 w-14 cursor-pointer rounded-full border-2 border-black transition-colors ${aiAutoConfirmEnabled ? "bg-teal-500" : "bg-gray-200"
                                                }`}
                                        >
                                            <motion.div
                                                className="absolute top-[2px] h-6 w-6 rounded-full border-2 border-black bg-white shadow-sm"
                                                animate={{ x: aiAutoConfirmEnabled ? 26 : 2 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-teal-600">
                                        {aiAutoConfirmEnabled ? "Enabled: Bets verify themselves." : "Disabled: Owner must resolve manually."}
                                    </p>
                                </div>
                                <Button
                                    disabled={loading}
                                    className="w-full h-12 bg-primary text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </form>
                        )}

                        {activeTab === "members" && (
                            <div className="space-y-4">
                                <div className="max-h-[400px] overflow-y-auto space-y-2">
                                    {members.map(member => {
                                        const roleIcon = member.role === "OWNER" ? <Crown className="h-4 w-4 text-yellow-600" /> :
                                            member.role === "ADMIN" ? <Shield className="h-4 w-4 text-purple-600" /> :
                                                <User className="h-4 w-4 text-gray-600" />;

                                        const canChangeRole = hasPermission(myRole, "ASSIGN_ROLE") && member.uid !== user?.uid;

                                        return (
                                            <div key={member.uid} className="flex items-center justify-between p-3 border-2 border-black rounded-lg bg-white hover:bg-gray-50 transition-all">
                                                <div className="flex items-center gap-3">
                                                    {member.photoURL && (
                                                        <img src={member.photoURL} alt={member.displayName} className="w-10 h-10 rounded-full border-2 border-black" />
                                                    )}
                                                    <div>
                                                        <p className="font-black text-sm">{member.displayName}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {roleIcon}
                                                            <span className="text-xs font-bold text-gray-500">{member.role}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {canChangeRole ? (
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => handleRoleChange(member.uid, e.target.value as LeagueRole)}
                                                        disabled={loading}
                                                        className="px-3 py-1 border-2 border-black rounded-lg font-bold text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        <option value="MEMBER">👤 Member</option>
                                                        <option value="ADMIN">⚙️ Admin</option>
                                                        <option value="OWNER">👑 Owner</option>
                                                    </select>
                                                ) : member.uid === user?.uid ? (
                                                    <span className="text-xs font-bold text-gray-400 italic">You</span>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                                {members.length === 0 && (
                                    <p className="text-center text-gray-400 font-bold py-8">No members found</p>
                                )}
                            </div>
                        )}

                        {activeTab === "danger" && (
                            <div className="space-y-6">
                                <div className="space-y-4 p-4 border-2 border-black bg-red-50 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-100 rounded-lg border-2 border-black">
                                            <AlertTriangle className="h-6 w-6 text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-red-700 text-lg uppercase">Reset Season</h4>
                                            <p className="text-xs font-bold text-red-600/80 mt-1">
                                                This will reset all members' points to the starting capital ({league.startCapital}).
                                                Use this when starting a new season.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleReset}
                                        disabled={loading}
                                        className="w-full bg-red-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700"
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Reset Points
                                    </Button>
                                </div>

                                {!league.isFinished && (
                                    <div className="space-y-4 p-4 border-2 border-black bg-blue-50 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-blue-100 rounded-lg border-2 border-black">
                                                <Crown className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-blue-700 text-lg uppercase">Finish Season</h4>
                                                <p className="text-xs font-bold text-blue-600/80 mt-1">
                                                    End the league, declare a winner, and notify all players.
                                                    Bets will be disabled.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={async () => {
                                                if (!confirm("Are you sure you want to FINISH this league? This will notify all members.")) return;
                                                setLoading(true);
                                                try {
                                                    const { finishLeague } = await import("@/lib/services/league-service");
                                                    // @ts-ignore
                                                    await finishLeague(league.id, user.uid);
                                                    onUpdate();
                                                    alert("League finished successfully! 🎉");
                                                    onClose();
                                                } catch (e: any) {
                                                    console.error(e);
                                                    alert(e.message || "Failed to finish league");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="w-full bg-blue-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-600"
                                        >
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                                            Finish Season & Announce Results
                                        </Button>
                                    </div>
                                )}

                                {league.mode === "STANDARD" && (
                                    <div className="space-y-4 p-4 border-2 border-black bg-yellow-50 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-yellow-100 rounded-lg border-2 border-black">
                                                <RefreshCw className="h-6 w-6 text-yellow-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-yellow-700 text-lg uppercase">Backfill Power-Ups</h4>
                                                <p className="text-xs font-bold text-yellow-600/80 mt-1">
                                                    Grant starter pack (3x x2, 3x x3, 2x x4) to ALL members.
                                                    Use this to enable Power-Ups for an existing league.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={async () => {
                                                if (!confirmBackfill) {
                                                    setConfirmBackfill(true);
                                                    return;
                                                }
                                                setLoading(true);
                                                try {
                                                    await backfillPowerUps(league.id);
                                                    alert("Power-ups distributed to all members!");
                                                    setConfirmBackfill(false);
                                                    onUpdate();
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Failed to distribute power-ups.");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className={`w-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${confirmBackfill ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'}`}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmBackfill ? "Click Again to Confirm" : "Distribute Power-Ups"}
                                        </Button>
                                        {confirmBackfill && (
                                            <button onClick={() => setConfirmBackfill(false)} className="text-xs text-gray-500 underline mt-1">
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-4 p-4 border-2 border-black bg-red-100 rounded-xl border-dashed">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-200 rounded-lg border-2 border-black">
                                            <Trash className="h-6 w-6 text-red-700" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-red-700 text-lg uppercase">Delete League</h4>
                                            <p className="text-xs font-bold text-red-600/80 mt-1">
                                                Permanently delete this league and all its data. Irreversible.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("CRITICAL WARNING: Are you sure you want to delete this league? This cannot be undone.")) return;
                                            if (prompt("To match deletion, type 'DELETE' below:") !== "DELETE") return;

                                            try {
                                                setLoading(true);
                                                const { deleteLeague } = await import("@/lib/services/league-service");
                                                await deleteLeague(league.id);
                                                alert("League deleted.");
                                                window.location.href = "/dashboard";
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to delete league");
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center rounded-xl border-2 border-red-500 bg-transparent py-3 text-sm font-black text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-all uppercase tracking-wide"
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete League Permanently"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
