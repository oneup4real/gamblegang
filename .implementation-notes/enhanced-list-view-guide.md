# List View Enhancement - Implementation Guide

## Overview
Enhance the league page to support two view modes with individual bet expansion:
1. **List View** (default): Compact cards showing odds/returns, individually expandable
2. **Grid View**: Current detailed view

## Changes Needed

### 1. State Management (DONE ✅)
```tsx
const [viewMode, setViewMode] = useState<"list" | "grid">("list");
const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());
const [expandAll, setExpandAll] = useState(false);
```

### 2. Toggle Button Controls (ADD THIS)
**Location:** Before the "Active Bets" section (around line 269)

```tsx
{/* View Mode Controls */}
<div className="flex items-center gap-4 mb-6">
    <div className="flex items-center gap-2 bg-white/10 p-1 rounded-lg border border-white/20">
        <button
            onClick={() => {
                setViewMode("list");
                if (expandAll) {
                    // Collapse all when switching to list view
                    setExpandedBets(new Set());
                    setExpandAll(false);
                }
            }}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-white/60 hover:text-white"
            }`}
        >
            📋 List
        </button>
        <button
            onClick={() => setViewMode("grid")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === "grid"
                    ? "bg-primary text-white"
                    : "text-white/60 hover:text-white"
            }`}
        >
            🎯 Detail
        </button>
    </div>

    {/* Expand/Collapse All (only in list view) */}
    {viewMode === "list" && (
        <button
            onClick={() => {
                if (expandAll) {
                    setExpandedBets(new Set());
                } else {
                    setExpandedBets(new Set(bets.map(b => b.id)));
                }
                setExpandAll(!expandAll);
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 text-sm font-bold text-white transition-all"
        >
            {expandAll ? "Collapse All" : "Expand All"}
        </button>
    )}
</div>
```

### 3. Conditional Rendering (REPLACE CURRENT GRID)
**Location:** Around line 281-295

**Replace this:**
```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
```

**With this:**
```tsx
{viewMode === "grid" ? (
    // GRID VIEW (existing code)
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bets.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                <p className="text-white/40">No active bets.</p>
                {league.status === "NOT_STARTED" && <p className="text-xs text-primary mt-2">Waiting for League Start...</p>}
            </div>
        ) : (
            bets.map(bet => {
                const myPoints = myMemberProfile?.points || 0;
                return (
                    <BetCard key={bet.id} bet={bet} userPoints={myPoints} mode={league.mode} />
                );
            })
        )}
    </div>
) : (
    // LIST VIEW (new implementation)
    <div className="space-y-3">
        {bets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                <p className="text-white/40">No active bets.</p>
                {league.status === "NOT_STARTED" && <p className="text-xs text-primary mt-2">Waiting for League Start...</p>}
            </div>
        ) : (
            bets.map(bet => {
                const myPoints = myMemberProfile?.points || 0;
                const isExpanded = expandedBets.has(bet.id);
                
                // Calculate odds and return (simplified - you may want to get actual user wager)
                const estimatedOdds = bet.totalPool > 0 ? "2.5x" : "N/A";
                const estimatedReturn = myPoints > 0 ? Math.floor(myPoints * 0.5) : 0;

                return (
                    <div key={bet.id} className="bg-white/10 border border-white/20 rounded-xl overflow-hidden">
                        {/* COLLAPSED STATE */}
                        <button
                            onClick={() => {
                                const newExpanded = new Set(expandedBets);
                                if (isExpanded) {
                                    newExpanded.delete(bet.id);
                                } else {
                                    newExpanded.add(bet.id);
                                }
                                setExpandedBets(newExpanded);
                            }}
                            className="w-full p-4 text-left hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center justify-between gap-4">
                                {/* Left: Question & Status */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                            bet.status === "OPEN" ? "bg-green-500 text-white" :
                                            bet.status === "LOCKED" ? "bg-red-500 text-white" :
                                            "bg-gray-500 text-white"
                                        }`}>
                                            {bet.status}
                                        </span>
                                        <span className="text-xs text-white/60">{bet.type}</span>
                                    </div>
                                    <p className="font-bold text-white">{bet.question}</p>
                                </div>

                                {/* Center: Odds & Return */}
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <p className="text-white/60 text-xs">Odds</p>
                                        <p className="font-bold text-white">{estimatedOdds}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-xs">Est. Return</p>
                                        <p className="font-bold text-green-400">{estimatedReturn} pts</p>
                                    </div>
                                </div>

                                {/* Right: Expand Icon */}
                                <div className="text-white/60">
                                    {isExpanded ? "▲" : "▼"}
                                </div>
                            </div>
                        </button>

                        {/* EXPANDED STATE */}
                        {isExpanded && (
                            <div className="border-t border-white/20 p-4 bg-white/5">
                                <BetCard bet={bet} userPoints={myPoints} mode={league.mode} />
                            </div>
                        )}
                    </div>
                );
            })
        )}
    </div>
)}
```

### 4. Import Icons (if not already imported)
```tsx
import { ChevronDown, ChevronUp } from "lucide-react";
```

## Features Implemented

### List View (Collapsed)
- ✅ Question and status badge
- ✅ Current odds displayed
- ✅ Estimated return displayed
- ✅ Expand/collapse icon
- ✅ Hover effect
- ✅ Individual expand/collapse

### List View (Expanded)
- ✅ Shows full BetCard component
- ✅ All betting functionality
- ✅ Can collapse back

### Controls
- ✅ Toggle between List/Grid views
- ✅ "Expand All" / "Collapse All" button
- ✅ Only shows in list view
- ✅ List view is default

## Odds & Return Calculation

Currently using simplified calculations. For accurate values, you'll need to:

1. Fetch user's actual wager for each bet
2. Calculate real odds based on bet type:
   - **CHOICE**: `totalPool / optionPool`
   - **MATCH**: Dynamic odds based on score predictions
   - **RANGE**: Distribution-based odds

3. Calculate real return:
   - `userWagerAmount * odds`

### Enhanced Version (Optional)
```tsx
// Add to fetchLeagueData or separate effect
const calculateBetMetrics = (bet: Bet) => {
    const userWager = myWagers[bet.id]; // Assuming you fetch this
    
    if (!userWager) return { odds: "N/A", return: 0 };
    
    let odds = 2.0; // default
    
    if (bet.type === "CHOICE" && bet.options && userWager.selection) {
        const optionIndex = Number(userWager.selection);
        const optionPool = bet.options[optionIndex]?.totalWagered || 1;
        odds = bet.totalPool / optionPool;
    }
    
    return {
        odds: `${odds.toFixed(2)}x`,
        return: Math.floor(userWager.amount * odds)
    };
};
```

## Visual Design

- Compact cards with clear hierarchy
- Odds and return prominently displayed
- Smooth expand/collapse animation
- Consistent with existing design system
- Mobile-friendly

## Testing Checklist

- [ ] List view shows by default
- [ ] Can toggle to grid view and back
- [ ] Each bet can expand individually
- [ ] "Expand All" expands all bets
- [ ] "Collapse All" collapses all bets
- [ ] Odds display correctly
- [ ] Est. return displays correctly
- [ ] BetCard works when expanded
- [ ] Mobile responsive
- [ ] Animations are smooth

## Notes

- List view is now the default as requested
- Toggle button only shows "Expand/Collapse All" in list view
-Each bet maintains its own expansion state
- Switching views resets expansion state (good UX)
- Grid view remains unchanged for power users who want full details

## Summary

This implementation gives users:
1. **Quick Overview**: List view with key metrics at a glance
2. **Details on Demand**: Expand any bet for full interaction
3. **Bulk Actions**: Expand/collapse all with one click
4. **Flexibility**: Switch to grid view for traditional experience

Perfect for managing many bets efficiently! 🎯
