# Dashboard Enhancement - Complete Solution

## Issues to Fix

1. ✅ "To Resolve" showing 0 (likely working but user doesn't own bets)
2. ❌ LOCKED/PROOFING bets showing in "Your Open Bets" 
3. ❌ Need separate sections for different bet states
4. ❌ Dashboard bets should be expandable/collapsible
5. ❌ Add "Clear" option for won/lost bets

## Solution Overview

### New Dashboard Sections

1. **Your Active Bets** - Can still place wagers
   - Status: OPEN (before closesAt)
   - Actions: Place wager, view details

2. **Pending Results** - Waiting for resolution
   - Status: LOCKED, PROOFING (user has wager)
   - Actions: View details, dispute (if in dispute period)

3. **Won Bets** - User won
   - Status: RESOLVED + user wager status = WON
   - Actions: View details, Clear/Dismiss

4. **Lost Bets** - User lost
   - Status: RESOLVED + user wager status = LOST
   - Actions: View details, Clear/Dismiss

5. **Bets to Resolve** - Owner/admin only
   - Status: LOCKED (past close), PROOFING, DISPUTED
   - Actions: Resolve bet

## Implementation Steps

### 1. Update bet-service.ts

Expand `getUserDashboardStats` to return more categories:

```typescript
export interface DashboardStats {
    // Counts
    activeBets: number;
    pendingResults: number;
    wonBets: number;
    lostBets: number;
    toResolve: number;
    
    // Lists with wager info
    activeBetsList: DashboardBetWithWager[];
    pendingResultsList: DashboardBetWithWager[];
    wonBetsList: DashboardBetWithWager[];
    lostBetsList: DashboardBetWithWager[];
    toResolveList: DashboardBetInfo[];
}

export interface DashboardBetWithWager extends DashboardBetInfo {
    wager?: {
        amount: number;
        selection: any;
        status: "PENDING" | "WON" | "LOST" | "PUSH";
        payout?: number;
    };
    dismissed?: boolean; // Track if user dismissed this bet
}

export async function getUserDashboardStats(user: any, leagues: League[]): Promise<DashboardStats> {
    const activeBetsList: DashboardBetWithWager[] = [];
    const pendingResultsList: DashboardBetWithWager[] = [];
    const wonBetsList: DashboardBetWithWager[] = [];
    const lostBetsList: DashboardBetWithWager[] = [];
    const toResolveList: DashboardBetInfo[] = [];
    
    // Get dismissed bets from localStorage or user profile
    const dismissedBets = getDismissedBets(user.uid) || new Set();

    for (const league of leagues) {
        const betsCol = collection(db, "leagues", league.id, "bets");
        const betsSnap = await getDocs(betsCol);

        for (const betDoc of betsSnap.docs) {
            const bet = { id: betDoc.id, ...betDoc.data() } as Bet;
            
            // Skip dismissed bets
            if (dismissedBets.has(bet.id)) continue;

            // Get user's wager if exists
            const wagersCol = collection(db, "leagues", league.id, "bets", bet.id, "wagers");
            const wagerQuery = query(wagersCol, where("userId", "==", user.uid));
            const wagerSnap = await getDocs(wagerQuery);
            const userWager = wagerSnap.empty ? null : wagerSnap.docs[0].data();

            const betInfo: DashboardBetWithWager = {
                id: bet.id,
                leagueId: league.id,
                leagueName: league.name,
                question: bet.question,
                status: bet.status,
                closesAt: bet.closesAt,
                wager: userWager ? {
                    amount: userWager.amount,
                    selection: userWager.selection,
                    status: userWager.status,
                    payout: userWager.payout
                } : undefined
            };

            // Categorize the bet
            if (bet.status === "OPEN" && userWager) {
                // Active - can still bet
                const now = new Date();
                const closesAt = bet.closesAt?.toDate();
                if (!closesAt || closesAt > now) {
                    activeBetsList.push(betInfo);
                }
            } else if ((bet.status === "LOCKED" || bet.status === "PROOFING" || bet.status === "DISPUTED") && userWager) {
                // Pending results - waiting for resolution
                pendingResultsList.push(betInfo);
            } else if (bet.status === "RESOLVED" && userWager) {
                // Resolved - check if won or lost
                if (userWager.status === "WON") {
                    wonBetsList.push(betInfo);
                } else if (userWager.status === "LOST") {
                    lostBetsList.push(betInfo);
                }
            }

            // Owner bets to resolve
            const isOwner = league.ownerId === user.uid;
            if (isOwner) {
                const isPastClose = bet.closesAt && new Date(bet.closesAt.toDate()) < new Date();
                const isPastEvent = bet.eventDate && new Date(bet.eventDate.toDate()) < new Date();
                
                const needsResolution = (
                    (bet.status === "LOCKED" && (isPastClose || isPastEvent)) ||
                    bet.status === "PROOFING" ||
                    bet.status === "DISPUTED"
                );

                if (needsResolution) {
                    toResolveList.push({
                        id: bet.id,
                        leagueId: league.id,
                        leagueName: league.name,
                        question: bet.question,
                        status: bet.status,
                        closesAt: bet.closesAt
                    });
                }
            }
        }
    }

    // Sort all lists by time
    const sortByTime = (a: any, b: any) => {
        const timeA = a.closesAt?.toDate?.() || new Date(0);
        const timeB = b.closesAt?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
    };

    activeBetsList.sort(sortByTime);
    pendingResultsList.sort(sortByTime);
    wonBetsList.sort(sortByTime);
    lostBetsList.sort(sortByTime);
    toResolveList.sort(sortByTime);

    return {
        activeBets: activeBetsList.length,
        pendingResults: pendingResultsList.length,
        wonBets: wonBetsList.length,
        lostBets: lostBetsList.length,
        toResolve: toResolveList.length,
        activeBetsList,
        pendingResultsList,
        wonBetsList,
        lostBetsList,
        toResolveList
    };
}

// Helper functions for dismissed bets
export function getDismissedBets(userId: string): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const key = `dismissed_bets_${userId}`;
    const dismissed = localStorage.getItem(key);
    return dismissed ? new Set(JSON.parse(dismissed)) : new Set();
}

export function dismissBet(userId: string, betId: string) {
    const dismissed = getDismissedBets(userId);
    dismissed.add(betId);
    localStorage.setItem(`dismissed_bets_${userId}`, JSON.stringify([...dismissed]));
}

export function undismissBet(userId: string, betId: string) {
    const dismissed = getDismissedBets(userId);
    dismissed.delete(betId);
    localStorage.setItem(`dismissed_bets_${userId}`, JSON.stringify([...dismissed]));
}
```

### 2. Update Dashboard UI

Add expandable sections with clear functionality:

```tsx
// State
const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());

// Dashboard sections
const sections = [
    { id: 'active', title: 'Your Active Bets', count: stats.activeBets, list: stats.activeBetsList, icon: '🎯' },
    { id: 'pending', title: 'Pending Results', count: stats.pendingResults, list: stats.pendingResultsList, icon: '⏳' },
    { id: 'won', title: 'Won Bets', count: stats.wonBets, list: stats.wonBetsList, icon: '✅', clearable: true },
    { id: 'lost', title: 'Lost Bets', count: stats.lostBets, list: stats.lostBetsList, icon: '❌', clearable: true },
    { id: 'toResolve', title: 'Bets to Resolve', count: stats.toResolve, list: stats.toResolveList, icon: '⚖️', ownerOnly: true },
];

// Render each section
{sections.map(section => {
    if (section.ownerOnly && section.count === 0) return null;
    
    const isExpanded = expandedSections.has(section.id);
    
    return (
        <div key={section.id} className="mb-6">
            {/* Section Header */}
            <button
                onClick={() => {
                    const newExpanded = new Set(expandedSections);
                    if (isExpanded) {
                        newExpanded.delete(section.id);
                    } else {
                        newExpanded.add(section.id);
                    }
                    setExpandedSections(newExpanded);
                }}
                className="w-full flex items-center justify-between p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <h3 className="font-bold text-lg">{section.title}</h3>
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                        {section.count}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {section.clearable && section.count > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Clear all bets in this section
                                section.list.forEach(bet => dismissBet(user.uid, bet.id));
                                // Refresh stats
                                fetchStats();
                            }}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600"
                        >
                            Clear All
                        </button>
                    )}
                    <span>{isExpanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
                <div className="mt-3 space-y-2">
                    {section.list.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No bets in this category</p>
                    ) : (
                        section.list.map(bet => {
                            const isBetExpanded = expandedBets.has(bet.id);
                            
                            return (
                                <div key={bet.id} className="bg-white/5 rounded-lg overflow-hidden">
                                    {/* Collapsed Bet Card */}
                                    <button
                                        onClick={() => {
                                            const newExpanded = new Set(expandedBets);
                                            if (isBetExpanded) {
                                                newExpanded.delete(bet.id);
                                            } else {
                                                newExpanded.add(bet.id);
                                            }
                                            setExpandedBets(newExpanded);
                                        }}
                                        className="w-full p-3 text-left hover:bg-white/5 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs px-2 py-0.5 rounded bg-primary text-white font-bold">
                                                        {bet.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{bet.leagueName}</span>
                                                </div>
                                                <p className="font-bold">{bet.question}</p>
                                            </div>
                                            
                                            {bet.wager && (
                                                <div className="flex gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-400 text-xs">Wagered</p>
                                                        <p className="font-bold">{bet.wager.amount} pts</p>
                                                    </div>
                                                    {bet.wager.payout && (
                                                        <div>
                                                            <p className="text-gray-400 text-xs">Payout</p>
                                                            <p className="font-bold text-green-400">+{bet.wager.payout} pts</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2">
                                                {section.clearable && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            dismissBet(user.uid, bet.id);
                                                            fetchStats();
                                                        }}
                                                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                                <span>{isBetExpanded ? '▲' : '▼'}</span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Bet Details */}
                                    {isBetExpanded && (
                                        <div className="p-4 border-t border-white/10 bg-white/5">
                                            <Link href={`/leagues/${bet.leagueId}`}>
                                                <Button className="w-full">
                                                    View in League <ExternalLink className="ml-2 h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
})}
```

## Summary of Changes

### bet-service.ts
- ✅ Expand `DashboardBetInfo` to include wager data
- ✅ Add `DashboardBetWithWager` interface
- ✅ Update `getUserDashboardStats` to categorize bets properly
- ✅ Add `getDismissedBets`, `dismissBet`, `undismissBet` functions
- ✅ Return 5 separate lists

### dashboard/page.tsx
- ✅ Update state to include all 5 sections
- ✅ Add expandable/collapsible sections
- ✅ Add expandable/collapsible individual bets
- ✅ Add "Clear" and "Clear All" buttons for won/lost bets
- ✅ Default all sections to collapsed

## Testing Checklist

- [ ] Active Bets shows only OPEN bets user can wager on
- [ ] Pending Results shows LOCKED/PROOFING bets user wagered on
- [ ] Won Bets shows only RESOLVED bets user won
- [ ] Lost Bets shows only RESOLVED bets user lost
- [ ] Bets to Resolve shows for owners only
- [ ] All sections collapsed by default
- [ ] Clicking section expands/collapses it
- [ ] Clicking bet expands/collapses details
- [ ] Clear button removes individual bet
- [ ] Clear All removes all bets in section
- [ ] Dismissed bets persist across page reloads
- [ ] Link to league works

## Notes

- Uses localStorage for dismissed bets (could use Firestore user profile instead)
- Dismissed bets are per-user
- Can "un-dismiss" by clearing localStorage or adding UI
- All sections support the same expandable UI pattern
- Consistent with league page list view design
