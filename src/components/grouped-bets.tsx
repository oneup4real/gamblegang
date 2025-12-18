"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Bet } from '@/lib/services/bet-service';

interface BetTimeSectionProps {
    title: string;
    bets: Bet[];
    defaultExpanded?: boolean;
    renderBet: (bet: Bet) => React.ReactNode;
}

export function BetTimeSection({ title, bets, defaultExpanded = false, renderBet }: BetTimeSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (bets.length === 0) return null;

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 w-full text-left py-2 hover:opacity-80 transition-opacity"
            >
                {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <span className="text-sm font-black uppercase tracking-wider text-gray-600">
                    {title}
                </span>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {bets.length}
                </span>
            </button>

            {isExpanded && (
                <div className="space-y-4 mt-3">
                    {bets.map(bet => renderBet(bet))}
                </div>
            )}
        </div>
    );
}

interface GroupedBetsProps {
    bets: Bet[];
    renderBet: (bet: Bet) => React.ReactNode;
    getClosingDate: (bet: Bet) => Date | null;
}

export function GroupedBetsByTime({ bets, renderBet, getClosingDate }: GroupedBetsProps) {
    const groupedBets = useMemo(() => {
        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const in6Days = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
        const in9Days = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000);
        const in12Days = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

        const groups = {
            next3Days: [] as Bet[],
            days3to6: [] as Bet[],
            days6to9: [] as Bet[],
            days9to12: [] as Bet[],
            later: [] as Bet[],
            noDate: [] as Bet[],
        };

        bets.forEach(bet => {
            const closingDate = getClosingDate(bet);

            if (!closingDate) {
                groups.noDate.push(bet);
            } else if (closingDate <= in3Days) {
                groups.next3Days.push(bet);
            } else if (closingDate <= in6Days) {
                groups.days3to6.push(bet);
            } else if (closingDate <= in9Days) {
                groups.days6to9.push(bet);
            } else if (closingDate <= in12Days) {
                groups.days9to12.push(bet);
            } else {
                groups.later.push(bet);
            }
        });

        // Sort each group by closing date (soonest first)
        const sortByClosing = (a: Bet, b: Bet) => {
            const dateA = getClosingDate(a)?.getTime() || 0;
            const dateB = getClosingDate(b)?.getTime() || 0;
            return dateA - dateB;
        };

        groups.next3Days.sort(sortByClosing);
        groups.days3to6.sort(sortByClosing);
        groups.days6to9.sort(sortByClosing);
        groups.days9to12.sort(sortByClosing);
        groups.later.sort(sortByClosing);

        return groups;
    }, [bets, getClosingDate]);

    return (
        <div>
            <BetTimeSection
                title="Next 3 Days"
                bets={groupedBets.next3Days}
                defaultExpanded={true}
                renderBet={renderBet}
            />
            <BetTimeSection
                title="3-6 Days"
                bets={groupedBets.days3to6}
                defaultExpanded={false}
                renderBet={renderBet}
            />
            <BetTimeSection
                title="6-9 Days"
                bets={groupedBets.days6to9}
                defaultExpanded={false}
                renderBet={renderBet}
            />
            <BetTimeSection
                title="9-12 Days"
                bets={groupedBets.days9to12}
                defaultExpanded={false}
                renderBet={renderBet}
            />
            <BetTimeSection
                title="12+ Days"
                bets={groupedBets.later}
                defaultExpanded={false}
                renderBet={renderBet}
            />
            {groupedBets.noDate.length > 0 && (
                <BetTimeSection
                    title="No Closing Date"
                    bets={groupedBets.noDate}
                    defaultExpanded={false}
                    renderBet={renderBet}
                />
            )}
        </div>
    );
}
