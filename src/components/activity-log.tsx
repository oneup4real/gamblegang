'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Plus,
    Play,
    Lock,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Bot,
    Coins,
    UserPlus,
    Vote,
    DollarSign,
    ChevronDown,
    ChevronUp,
    Filter,
    Loader2,
    Clock
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getActivityLogs, ActivityLogEntry, ActivityType } from '@/lib/services/activity-log-service';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
    leagueId: string;
    isAdmin: boolean;
}

// Icon and color mapping for activity types
const activityConfig: Record<ActivityType, { icon: any; color: string; bgColor: string }> = {
    'BET_CREATED': { icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    'BET_PUBLISHED': { icon: Play, color: 'text-green-600', bgColor: 'bg-green-100' },
    'BET_LOCKED': { icon: Lock, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    'BET_PROOFING': { icon: Clock, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    'BET_RESOLVED': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    'BET_DISPUTED': { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
    'BET_INVALID': { icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    'AI_AUTO_RESOLVE': { icon: Bot, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    'AI_BULK_GENERATE': { icon: Bot, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    'WAGER_PLACED': { icon: Coins, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    'WAGER_CANCELLED': { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
    'MEMBER_JOINED': { icon: UserPlus, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    'MEMBER_LEFT': { icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    'POINTS_BOUGHT': { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100' },
    'PAYOUT_DISTRIBUTED': { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100' },
    'DISPUTE_VOTE': { icon: Vote, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    'SETTINGS_CHANGED': { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    'LEAGUE_CREATED': { icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-100' }
};

const filterOptions: { label: string; types: ActivityType[] | null }[] = [
    { label: 'All Activity', types: null },
    { label: 'Bets', types: ['BET_CREATED', 'BET_PUBLISHED', 'BET_LOCKED', 'BET_PROOFING', 'BET_RESOLVED', 'BET_DISPUTED', 'BET_INVALID'] },
    { label: 'AI Actions', types: ['AI_AUTO_RESOLVE', 'AI_BULK_GENERATE'] },
    { label: 'Wagers', types: ['WAGER_PLACED', 'WAGER_CANCELLED'] },
    { label: 'Payouts', types: ['PAYOUT_DISTRIBUTED', 'POINTS_BOUGHT'] },
    { label: 'Members', types: ['MEMBER_JOINED', 'MEMBER_LEFT'] }
];

export function ActivityLog({ leagueId, isAdmin }: ActivityLogProps) {
    const t = useTranslations('Activity');
    const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [activeFilter, setActiveFilter] = useState<number>(0);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadEntries();
    }, [leagueId, activeFilter]);

    const loadEntries = async () => {
        setLoading(true);
        try {
            const result = await getActivityLogs(leagueId, 50);
            let filteredEntries = result.entries;

            // Apply filter if not "All"
            const filterTypes = filterOptions[activeFilter].types;
            if (filterTypes) {
                filteredEntries = result.entries.filter(e => filterTypes.includes(e.type));
            }

            setEntries(filteredEntries);
            setLastDoc(result.lastDoc);
            setHasMore(result.entries.length === 50);
        } catch (error) {
            console.error('Failed to load activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!lastDoc || loadingMore) return;
        setLoadingMore(true);
        try {
            const result = await getActivityLogs(leagueId, 50, lastDoc);
            let filteredEntries = result.entries;

            const filterTypes = filterOptions[activeFilter].types;
            if (filterTypes) {
                filteredEntries = result.entries.filter(e => filterTypes.includes(e.type));
            }

            setEntries(prev => [...prev, ...filteredEntries]);
            setLastDoc(result.lastDoc);
            setHasMore(result.entries.length === 50);
        } catch (error) {
            console.error('Failed to load more activity logs:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedEntries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    if (!isAdmin) {
        return (
            <div className="p-6 text-center bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="font-bold text-yellow-800">Admin Access Required</p>
                <p className="text-sm text-yellow-600">Activity logs are only visible to league admins and owners.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Filter */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-black text-lg uppercase">Activity Log</h3>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-sm ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:border-black'
                        }`}
                >
                    <Filter className="h-4 w-4" />
                    Filter
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
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
                            {filterOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveFilter(idx)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeFilter === idx
                                            ? 'bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white border-2 border-gray-200 hover:border-black'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Activity List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : entries.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-500">No activity yet</p>
                    <p className="text-sm text-gray-400">Activity will appear here as actions are performed.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry, idx) => {
                        const config = activityConfig[entry.type] || { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };
                        const Icon = config.icon;
                        const isExpanded = expandedEntries.has(entry.id);

                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className={`p-3 rounded-xl border-2 transition-all ${isExpanded ? 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                <div
                                    className="flex items-start gap-3 cursor-pointer"
                                    onClick={() => entry.details && toggleExpand(entry.id)}
                                >
                                    {/* Icon */}
                                    <div className={`p-2 rounded-lg ${config.bgColor} shrink-0`}>
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-black leading-tight">
                                            {entry.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-400">
                                                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                                            </span>
                                            {entry.actorId !== 'system' && entry.actorId !== 'ai-scheduler' && (
                                                <span className="text-xs text-gray-500 font-medium">
                                                    by {entry.actorName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand indicator */}
                                    {entry.details && (
                                        <div className="shrink-0">
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && entry.details && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto font-mono text-gray-600">
                                                    {JSON.stringify(entry.details, null, 2)}
                                                </pre>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {/* Load More */}
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="w-full py-3 text-center text-sm font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                                'Load More'
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
