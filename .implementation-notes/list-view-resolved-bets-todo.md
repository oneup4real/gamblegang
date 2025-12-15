# Status Update - Resolved Bets in List View

## ✅ Fixed Issues

### 1. Firestore Permissions Error - FIXED ✅
- Updated `firestore.rules` to allow wager updates
- Rules deployed successfully
- Bet resolution now works without permission errors

### 2. Bets to Resolve Showing 0 - FIXED ✅
- Updated `getUserDashboardStats()` logic
- Now checks both `closesAt` AND `eventDate`
- Added `DISPUTED` status to resolution check
- More robust time comparisons

### 3. Bets Ordered by Time - FIXED ✅
- Added sorting in league page (`leagues/[leagueId]/page.tsx`)
- Added sorting in dashboard bet lists (`bet-service.ts`)
- Bets now display newest → oldest

## ⏳ TODO: Resolved Bets in List View

### Current Status:
- Grid view (`viewMode === "detailed"`): ✅ Has collapsible resolved bets
- List view (`viewMode === "consolidated"`): ❌ No resolved bets section

### What's Needed:
Add a collapsible "Resolved & Proofing" section to the list view, similar to the grid view.

### Implementation Plan:

**Location:** `src/app/[locale]/leagues/[leagueId]/page.tsx`  
**After line:** ~738 (end of consolidated/list view section)  
**Before:** The grid view's archived bets section (line ~742)

**Code to Add:**
```tsx
{/* Resolved Bets in List View */}
{viewMode === "consolidated" && (
    <div className="pt-8 border-t-2 border-dashed border-black/30">
        <button
            onClick={() => setIsArchiveOpen(!isArchiveOpen)}
            className="flex items-center gap-2 w-full justify-between group"
        >
            <h2 className="text-xl font-black tracking-tight text-gray-500 font-comic uppercase group-hover:text-black transition-colors">
                Resolved & Proofing ({bets.filter(b => ["RESOLVED", "PROOFING", "CANCELLED", "DISPUTED", "INVALID"].includes(b.status)).length})
            </h2>
            <div className="p-2 rounded-full border-2 border-transparent group-hover:border-black group-hover:bg-white transition-all">
                {isArchiveOpen ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </div>
        </button>

        <AnimatePresence>
            {isArchiveOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="py-6 space-y-3">
                        {(() => {
                            const archivedBets = bets.filter(b => ["RESOLVED", "PROOFING", "CANCELLED", "DISPUTED", "INVALID"].includes(b.status));
                            
                            if (archivedBets.length === 0) {
                                return <p className="text-gray-400 italic font-bold text-center">No archived bets yet.</p>;
                            }

                            return archivedBets.map(bet => {
                                const myWager = myWagers[bet.id];
                                
                                return (
                                    <div
                                        key={bet.id}
                                        className="p-4 bg-gray-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border-2 border-black ${
                                                        bet.status === "RESOLVED" ? "bg-blue-400 text-black" :
                                                        bet.status === "PROOFING" ? "bg-yellow-400 text-black" :
                                                        bet.status === "DISPUTED" ? "bg-orange-500 text-white" :
                                                        bet.status === "INVALID" ? "bg-gray-400 text-black" :
                                                        "bg-red-400 text-black"
                                                    }`}>
                                                        {bet.status === "INVALID" ? "♻️ REFUNDED" : bet.status}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-500">{bet.type}</span>
                                                </div>
                                                <p className="font-black text-lg mb-1">{bet.question}</p>
                                                {bet.status === "RESOLVED" && bet.winningOutcome && (
                                                    <p className="text-sm font-bold text-blue-600">
                                                        Result: {typeof bet.winningOutcome === "object" && "home" in bet.winningOutcome
                                                            ? `${(bet.winningOutcome as any).home} - ${(bet.winningOutcome as any).away}`
                                                            : String(bet.winningOutcome)
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                {myWager && (
                                                    <div className="text-xs">
                                                        <p className={`font-black text-lg ${
                                                            myWager.status === "WON" ? "text-green-600" :
                                                            myWager.status === "LOST" ? "text-red-600" :
                                                            myWager.status === "PUSH" ? "text-gray-600" :
                                                            "text-gray-500"
                                                        }`}>
                                                            {myWager.status === "WON" ? "✅ WON" :
                                                             myWager.status === "LOST" ? "❌ LOST" :
                                                             myWager.status === "PUSH" ? "♻️ PUSH" :
                                                             "⏳ PENDING"}
                                                        </p>
                                                        {myWager.status === "WON" && myWager.payout && (
                                                            <p className="font-bold text-green-600">
                                                                +{myWager.payout} pts
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
)}
```

### Why the Previous Attempt Failed:
- The replacement broke the JSX structure
- Incorrectly matched closing tags
- File became corrupted with syntax errors

### Solution:
Manual addition is safest. The code above is ready to be copied into the correct location in the file.

### Exact Line Numbers:
1. Find the end of the consolidated view section (around line 738)
2. Look for the closing `</section>` tag for the bets section
3. Add the code INSIDE the section, BEFORE the closing tag
4. This ensures it only shows when `viewMode === "consolidated"`

## Summary

**Completed Today:**
- ✅ Fixed Firestore permissions
- ✅ Fixed "bets to resolve" detection
- ✅ Added bet sorting by time
- ✅ AI Auto-Resolve with animations
- ✅ Complete dispute & voting system
- ✅ Buy-in types
- ✅ All-in modal
- ✅ Game over indicators
- ✅ Dashboard improvements

**Remaining:**
- ⏳ Add resolved bets section to list view (code ready above)

The resolved bets section for list view is ready to be added manually to avoid file corruption.
