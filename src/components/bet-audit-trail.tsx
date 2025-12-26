'use client';

/**
 * Bet Audit Trail Component
 * 
 * Shows a complete audit trail of all bets in a league with:
 * - Who bet on what
 * - Points won/lost
 * - Visual breakdown of picks
 * - Verification details
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    XCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Users,
    Coins,
    Clock,
    Shield,
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    Award,
    BarChart3,
    Loader2,
    Filter,
    ArrowUpDown,
    Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    limit as firestoreLimit
} from 'firebase/firestore';
import { Bet, Wager } from '@/lib/services/bet-service';
import { formatDistanceToNow } from 'date-fns';
import { TeamLogo } from '@/components/team-logo';

interface BetAuditTrailProps {
    leagueId: string;
    isAdmin: boolean;
}

interface BetWithWagers extends Bet {
    wagers: Wager[];
}

type FilterType = 'all' | 'open' | 'resolved' | 'proofing' | 'locked';

export function BetAuditTrail({ leagueId, isAdmin }: BetAuditTrailProps) {
    const [bets, setBets] = useState<BetWithWagers[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<FilterType>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        loadBets();
    }, [leagueId, filter]);

    const loadBets = async () => {
        setLoading(true);
        try {
            const betsRef = collection(db, 'leagues', leagueId, 'bets');

            // Fetch all bets without complex compound queries to avoid index requirements
            const betsQuery = query(
                betsRef,
                orderBy('createdAt', 'desc'),
                firestoreLimit(100)
            );

            const betsSnap = await getDocs(betsQuery);
            const betsData: BetWithWagers[] = [];

            for (const betDoc of betsSnap.docs) {
                const bet = { id: betDoc.id, ...betDoc.data() } as Bet;

                // Skip bets that don't match the filter
                if (filter !== 'all') {
                    const statusMap: Record<FilterType, string[]> = {
                        'all': [],
                        'resolved': ['RESOLVED'],
                        'proofing': ['PROOFING'],
                        'locked': ['LOCKED'],
                        'open': ['OPEN']
                    };
                    if (!statusMap[filter].includes(bet.status)) continue;
                }

                // Fetch wagers for this bet
                const wagersRef = collection(db, 'leagues', leagueId, 'bets', bet.id, 'wagers');
                const wagersSnap = await getDocs(wagersRef);
                const wagers = wagersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Wager));

                betsData.push({ ...bet, wagers });
            }

            setBets(betsData);
        } catch (error) {
            console.error('Failed to load bets:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (betId: string) => {
        setExpandedBets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(betId)) {
                newSet.delete(betId);
            } else {
                newSet.add(betId);
            }
            return newSet;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RESOLVED': return 'bg-green-500';
            case 'PROOFING': return 'bg-blue-500';
            case 'LOCKED': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const formatSelection = (bet: Bet, selection: any): string => {
        if (bet.type === 'MATCH' && typeof selection === 'object') {
            return `${selection.home} - ${selection.away}`;
        }
        if (bet.type === 'CHOICE' && bet.options) {
            const idx = parseInt(String(selection));
            return bet.options[idx]?.text || String(selection);
        }
        return String(selection);
    };

    const getWinningOutcomeDisplay = (bet: Bet): string => {
        if (!bet.winningOutcome) return '—';
        return formatSelection(bet, bet.winningOutcome);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h3 className="font-black text-lg uppercase">Bet Audit Trail</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-sm border-gray-200 hover:border-black"
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
                        <span className="sm:hidden">{sortOrder === 'asc' ? 'Old' : 'New'}</span>
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-sm ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:border-black'}`}
                    >
                        <Filter className="h-4 w-4" />
                        Filter
                        {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                            {(['all', 'open', 'resolved', 'proofing', 'locked'] as FilterType[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${filter === f
                                        ? 'bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'bg-white border-2 border-gray-200 hover:border-black'
                                        }`}
                                >
                                    {f === 'all' ? '📊 All' : f === 'open' ? '🟢 Open' : f === 'resolved' ? '✅ Resolved' : f === 'proofing' ? '⏳ Proofing' : '🔒 Locked'}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-3 border-2 border-green-200">
                    <div className="text-2xl font-black text-green-600">{bets.filter(b => b.status === 'RESOLVED').length}</div>
                    <div className="text-xs font-bold text-green-700 uppercase">Resolved</div>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-3 border-2 border-blue-200">
                    <div className="text-2xl font-black text-blue-600">{bets.filter(b => b.status === 'PROOFING').length}</div>
                    <div className="text-xs font-bold text-blue-700 uppercase">Proofing</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl p-3 border-2 border-yellow-200">
                    <div className="text-2xl font-black text-yellow-600">{bets.reduce((sum, b) => sum + b.wagers.length, 0)}</div>
                    <div className="text-xs font-bold text-yellow-700 uppercase">Total Bets</div>
                </div>
            </div>

            {/* Bet List */}
            {bets.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-500">No bets found</p>
                    <p className="text-sm text-gray-400">Bets will appear here once created.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {[...bets]
                        .sort((a, b) => {
                            const dateA = a.eventDate?.toDate?.() || new Date(0);
                            const dateB = b.eventDate?.toDate?.() || new Date(0);
                            return sortOrder === 'asc'
                                ? dateA.getTime() - dateB.getTime()
                                : dateB.getTime() - dateA.getTime();
                        })
                        .map((bet, idx) => (
                            <BetAuditCard
                                key={bet.id}
                                bet={bet}
                                isExpanded={expandedBets.has(bet.id)}
                                onToggle={() => toggleExpand(bet.id)}
                                formatSelection={formatSelection}
                                getWinningOutcomeDisplay={getWinningOutcomeDisplay}
                                getStatusColor={getStatusColor}
                                index={idx}
                            />
                        ))}
                </div>
            )}
        </div>
    );
}

interface BetAuditCardProps {
    bet: BetWithWagers;
    isExpanded: boolean;
    onToggle: () => void;
    formatSelection: (bet: Bet, selection: any) => string;
    getWinningOutcomeDisplay: (bet: Bet) => string;
    getStatusColor: (status: string) => string;
    index: number;
}

function BetAuditCard({
    bet,
    isExpanded,
    onToggle,
    formatSelection,
    getWinningOutcomeDisplay,
    getStatusColor,
    index
}: BetAuditCardProps) {
    const winners = bet.wagers.filter(w => w.status === 'WON');
    const losers = bet.wagers.filter(w => w.status === 'LOST');
    const totalPayout = bet.wagers.reduce((sum, w) => sum + (w.payout || 0), 0);

    // Calculate option distribution for CHOICE bets
    const optionDistribution = bet.type === 'CHOICE' && bet.options ? bet.options.map((opt, idx) => ({
        text: opt.text,
        count: bet.wagers.filter(w => String(w.selection) === String(idx)).length,
        isWinner: String(bet.winningOutcome) === String(idx)
    })) : [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-xl border-2 overflow-hidden transition-all ${isExpanded
                ? 'border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                : 'border-gray-200 hover:border-gray-400'
                }`}
        >
            {/* Header - Always Visible */}
            <button
                onClick={onToggle}
                className="w-full p-4 text-left bg-white hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Status Badge & Question */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`${getStatusColor(bet.status)} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                                {bet.status}
                            </span>
                            {bet.verification && (
                                <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Verified
                                </span>
                            )}
                        </div>
                        <h4 className="font-black text-sm md:text-base leading-tight truncate">
                            {bet.question}
                        </h4>

                        {/* Quick Stats Row */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                            {/* Event Date */}
                            {bet.eventDate && (
                                <span className="flex items-center gap-1 font-semibold text-gray-700">
                                    <Clock className="h-3 w-3" />
                                    {bet.eventDate.toDate ?
                                        bet.eventDate.toDate().toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : new Date(bet.eventDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                    }
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {bet.wagers.length} bets
                            </span>
                            {bet.status === 'RESOLVED' && (
                                <>
                                    <span className="flex items-center gap-1 text-green-600">
                                        <Trophy className="h-3 w-3" />
                                        {winners.length} won
                                    </span>
                                    <span className="flex items-center gap-1 text-red-500">
                                        <XCircle className="h-3 w-3" />
                                        {losers.length} lost
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Result & Expand */}
                    <div className="flex items-center gap-2">
                        {bet.status === 'RESOLVED' && (
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-gray-400 uppercase">Result</div>
                                <div className="font-black text-sm text-green-600 truncate max-w-[80px]">
                                    {getWinningOutcomeDisplay(bet)}
                                </div>
                            </div>
                        )}
                        {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                </div>

                {/* Option Distribution Bars (Preview) */}
                {bet.type === 'CHOICE' && optionDistribution.length > 0 && !isExpanded && (
                    <div className="mt-3 space-y-1">
                        {optionDistribution.slice(0, 3).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-16 text-[10px] font-bold truncate text-gray-500">{opt.text}</div>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: bet.wagers.length > 0 ? `${(opt.count / bet.wagers.length) * 100}%` : '0%' }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className={`h-full ${opt.isWinner ? 'bg-green-500' : 'bg-gray-300'}`}
                                    />
                                </div>
                                <div className="w-6 text-[10px] font-bold text-gray-400">{opt.count}</div>
                            </div>
                        ))}
                    </div>
                )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t-2 border-dashed border-gray-200 bg-gray-50 p-4">
                            {/* Verification Info */}
                            {bet.verification && (
                                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield className="h-4 w-4 text-purple-500" />
                                        <span className="text-xs font-bold text-purple-700 uppercase">Verification</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-bold text-purple-900">Source:</span>{' '}
                                        {bet.verification.url ? (
                                            <a href={bet.verification.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                                                {bet.verification.source}
                                            </a>
                                        ) : (
                                            <span className="text-purple-700">{bet.verification.source}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-purple-500 mt-1">
                                        Method: {bet.verification.method} • Confidence: {bet.verification.confidence}
                                    </div>
                                </div>
                            )}

                            {/* Option Breakdown (CHOICE bets) */}
                            {bet.type === 'CHOICE' && optionDistribution.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">Pick Distribution</div>
                                    <div className="space-y-2">
                                        {optionDistribution.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-24 text-sm font-bold truncate flex items-center gap-1">
                                                    {opt.isWinner && <Trophy className="h-3 w-3 text-green-500" />}
                                                    {opt.text}
                                                </div>
                                                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden relative">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: bet.wagers.length > 0 ? `${(opt.count / bet.wagers.length) * 100}%` : '0%' }}
                                                        transition={{ duration: 0.8, delay: idx * 0.15, type: 'spring' }}
                                                        className={`h-full ${opt.isWinner ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-gray-300 to-gray-400'}`}
                                                    />
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-md">
                                                        {bet.wagers.length > 0 ? Math.round((opt.count / bet.wagers.length) * 100) : 0}%
                                                    </span>
                                                </div>
                                                <div className="w-8 text-xs font-bold text-gray-500 text-right">{opt.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Total Payout Summary */}
                            {bet.status === 'RESOLVED' && (
                                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-bold text-green-600 uppercase">Total Points Distributed</div>
                                            <div className="text-2xl font-black text-green-700">{totalPayout} pts</div>
                                        </div>
                                        <Coins className="h-8 w-8 text-green-400" />
                                    </div>
                                </div>
                            )}

                            {/* Player Breakdown */}
                            <div className="">
                                <div className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    All Wagers ({bet.wagers.length})
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {bet.wagers
                                        .sort((a, b) => (b.payout || 0) - (a.payout || 0))
                                        .map((wager, idx) => (
                                            <motion.div
                                                key={wager.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${wager.status === 'WON'
                                                    ? 'bg-green-50 border-green-200'
                                                    : wager.status === 'LOST'
                                                        ? 'bg-red-50 border-red-200'
                                                        : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                {/* Avatar */}
                                                <div className="relative">
                                                    {wager.userAvatar ? (
                                                        <img
                                                            src={wager.userAvatar}
                                                            alt={wager.userName}
                                                            className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md">
                                                            {wager.userName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {/* Status Badge */}
                                                    {wager.status === 'WON' && (
                                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white">
                                                            <Trophy className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    )}
                                                    {wager.status === 'LOST' && (
                                                        <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white">
                                                            <XCircle className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Player Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm truncate">{wager.userName}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span className="font-medium">Pick: {formatSelection(bet, wager.selection)}</span>
                                                        {wager.powerUp && (
                                                            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                                                                <Zap className="h-2.5 w-2.5" />
                                                                {wager.powerUp}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Result */}
                                                <div className="text-right">
                                                    {wager.status === 'PENDING' ? (
                                                        <div className="text-xs font-bold text-gray-400 uppercase">Pending</div>
                                                    ) : (
                                                        <>
                                                            <div className={`text-lg font-black ${wager.status === 'WON' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {wager.status === 'WON' ? '+' : ''}
                                                                {wager.payout || 0} pts
                                                            </div>
                                                            <div className="text-[10px] font-medium text-gray-400">
                                                                {wager.status === 'WON' ? (
                                                                    <span className="flex items-center justify-end gap-0.5 text-green-500">
                                                                        <TrendingUp className="h-3 w-3" />
                                                                        Won
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center justify-end gap-0.5 text-red-400">
                                                                        <TrendingDown className="h-3 w-3" />
                                                                        Lost
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Created {bet.createdAt ? formatDistanceToNow(bet.createdAt.toDate(), { addSuffix: true }) : 'Unknown'}
                                </span>
                                {bet.resolvedAt && (
                                    <span>
                                        Resolved {formatDistanceToNow(bet.resolvedAt.toDate(), { addSuffix: true })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default BetAuditTrail;
