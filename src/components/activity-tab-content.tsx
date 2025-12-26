'use client';

/**
 * Activity Tab Content
 * 
 * Container for Activity-related views with sub-tabs:
 * - Activity Log (existing)
 * - Bet Audit Trail (new)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, FileText } from 'lucide-react';
import { ActivityLog } from './activity-log';
import { BetAuditTrail } from './bet-audit-trail';

interface ActivityTabContentProps {
    leagueId: string;
    isAdmin: boolean;
}

type SubTab = 'log' | 'audit';

export function ActivityTabContent({ leagueId, isAdmin }: ActivityTabContentProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('log');

    return (
        <div className="space-y-4">
            {/* Sub-Tab Navigation */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl border-2 border-gray-200">
                <button
                    onClick={() => setActiveSubTab('log')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'log'
                            ? 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                >
                    <Activity className="h-4 w-4" />
                    <span>Activity Log</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('audit')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'audit'
                            ? 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                >
                    <BarChart3 className="h-4 w-4" />
                    <span>Bet Audit</span>
                </button>
            </div>

            {/* Content */}
            <motion.div
                key={activeSubTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeSubTab === 'log' ? (
                    <ActivityLog leagueId={leagueId} isAdmin={isAdmin} />
                ) : (
                    <BetAuditTrail leagueId={leagueId} isAdmin={isAdmin} />
                )}
            </motion.div>
        </div>
    );
}

export default ActivityTabContent;
