# AI Auto-Resolve & Dispute UI Implementation Status

## ✅ COMPLETED

### Backend - Dispute System
- ✅ Added dispute statuses: DISPUTED, INVALID
- ✅ Added bet fields: disputeDeadline, disputedBy, disputeActive, votes
- ✅ `startDisputePeriod()` - Begins 48h dispute window
- ✅ `disputeBetResult()` - Player files dispute
- ✅ `voteOnDisputedBet()` - Player votes approve/reject
- ✅ `checkDisputeVoting()` - Tallies votes and determines outcome
- ✅ `markBetInvalidAndRefund()` - Cancels bet and refunds all players
- ✅ `resolveDispute()` - Processes final voting outcome

### Backend - AI Auto-Resolve
- ✅ `aiAutoResolveBet(bet)` function in ai-bet-actions.ts
- ✅ Returns structured data based on bet type:
  - MATCH: `{ type: "MATCH", home: 2, away: 1 }`
  - CHOICE: `{ type: "CHOICE", optionIndex: 0 }`
  - RANGE: `{ type: "RANGE", value: 42 }`
- ✅ Uses Gemini AI to look up real results
- ✅ Falls back gracefully if result not found

### Frontend - Partial
- ✅ Imported dispute functions in BetCard
- ✅ Added state variables for dispute/voting
- ✅ Added AI resolve state variables
- ✅ Added handler functions:
  - `handleDispute()` - Files dispute
  - `handleVote()` - Submits vote
  - `handleMarkInvalid()` - Marks bet invalid
  - `getDisputeTimeRemaining()` - Shows countdown

## ⏳ TODO - UI Components

### 1. AI Auto-Resolve Button & Animation

**Location**: Own resolution UI (line ~672 in BetCard)

**Add Handler**:
```tsx
const handleAIResolve = async () => {
    setAiResolving(true);
    try {
        const result = await aiAutoResolveBet(bet);
        if (!result) {
            alert("AI couldn't determine the result. Please enter manually.");
            return;
        }
        
        // Prefill based on type
        if (result.type === "MATCH") {
            setResHome(result.home);
            setResAway(result.away);
        } else if (result.type === "CHOICE") {
            setWinningOption(String(result.optionIndex));
        } else if (result.type === "RANGE") {
            setWinningRange(result.value);
        }
        
        // Trigger animation
        setAiHighlighted(true);
        setTimeout(() => setAiHighlighted(false), 3000);
        
    } catch (error: any) {
        alert(error.message || "AI resolution failed");
    } finally {
        setAiResolving(false);
    }
};
```

**Add Button** (before resolution inputs):
```tsx
<Button
    onClick={handleAIResolve}
    disabled={aiResolving}
    className="w-full mb-4 bg-purple-500 text-white border-2 border-black hover:bg-purple-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
>
    {aiResolving ? (
        <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            AI Looking Up Result...
        </>
    ) : (
        <>
            <BrainCircuit className="h-4 w-4 mr-2" />
            🤖 AI Resolve
        </>
    )}
</Button>
```

**Add Animated Border** to inputs:
```tsx
// For CHOICE buttons
className={`... ${aiHighlighted && winningOption === String(...) ? "animate-pulse ring-4 ring-purple-500" : ""}`}

// For RANGE input
className={`... ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""}`}

// For MATCH inputs
className={`... ${aiHighlighted ? "animate-pulse ring-4 ring-purple-500" : ""}`}
```

### 2. Dispute Period Indicator

**Add after bet status badge** (line ~280):
```tsx
{bet.disputeDeadline && !bet.disputeActive && bet.status === "PROOFING" && (
    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-orange-600">
        <Timer className="h-4 w-4" />
        Dispute Period: {getDisputeTimeRemaining()} remaining
    </div>
)}
```

### 3. Dispute Button (For Players)

**Add in wager ticket section** (line ~600):
```tsx
{userWager && bet.disputeDeadline && !bet.disputeActive && new Date() < bet.disputeDeadline.toDate() && (
    <Button
        onClick={handleDispute}
        disabled={disputeLoading}
        className="w-full mt-2 bg-red-500 text-white border-2 border-black hover:bg-red-600"
    >
        {disputeLoading ? "Filing..." : "🚨 Dispute Result"}
    </Button>
)}
```

### 4. Voting UI (For Disputed Bets)

**Add after wager ticket**:
```tsx
{bet.status === "DISPUTED" && userWager && (
    <div className="mt-6 p-4 bg-orange-50 border-2 border-black rounded-xl">
        <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h4 className="font-black uppercase">Vote on Result</h4>
        </div>
        
        {/* Show proposed result */}
        <div className="mb-3 p-2 bg-white rounded border border-black">
            <p className="text-xs font-bold text-gray-600">Proposed Result:</p>
            <p className="font-black">{bet.winningOutcome ? JSON.stringify(bet.winningOutcome) : "N/A"}</p>
        </div>
        
        {/* Voting buttons */}
        {!userVote ? (
            <div className="grid grid-cols-2 gap-2">
                <Button
                    onClick={() => handleVote("approve")}
                    disabled={votingLoading}
                    className="bg-green-500 text-white border-2 border-black"
                >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Approve
                </Button>
                <Button
                    onClick={() => handleVote("reject")}
                    disabled={votingLoading}
                    className="bg-red-500 text-white border-2 border-black"
                >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Reject
                </Button>
            </div>
        ) : (
            <div className="text-center p-2 bg-white border-2 border-black rounded">
                <p className="font-bold">
                    Your vote: {userVote === "approve" ? "✅ Approved" : "❌ Rejected"}
                </p>
            </div>
        )}
        
        {/* Vote count */}
        <p className="text-xs text-gray-500 mt-2 text-center font-bold">
            {Object.keys(bet.votes || {}).length} votes cast
        </p>
    </div>
)}
```

### 5. Owner Dispute Controls

**Add in owner controls section**:
```tsx
{bet.status === "DISPUTED" && (
    <div className="mt-4 p-4 bg-yellow-50 border-2 border-black rounded-xl">
        <h4 className="font-black uppercase mb-2">⚠️ Bet Under Dispute</h4>
        <p className="text-xs mb-3">
            {Object.values(bet.votes || {}).filter(v => v === "approve").length} approve,{" "}
            {Object.values(bet.votes || {}).filter(v => v === "reject").length} reject
        </p>
        
        <div className="grid grid-cols-2 gap-2">
            <Button
                onClick={async () => {
                    const result = await resolveDispute(bet.leagueId, bet.id);
                    alert(`Dispute outcome: ${result}`);
                    if (onWagerSuccess) onWagerSuccess();
                }}
                className="bg-blue-500 text-white border-2 border-black"
            >
                Check & Resolve
            </Button>
            <Button
                onClick={handleMarkInvalid}
                className="bg-gray-500 text-white border-2 border-black"
            >
                Mark Invalid
            </Button>
        </div>
    </div>
)}
```

### 6. Status Badge Updates

**Update status badge** (line ~340):
```tsx
<span className={`... ${
    bet.status === "RESOLVED" ? "bg-blue-400 text-black" :
    bet.status === "PROOFING" ? "bg-yellow-400 text-black" :
    bet.status === "DISPUTED" ? "bg-orange-500 text-white animate-pulse" :
    bet.status === "INVALID" ? "bg-gray-400 text-black" :
    bet.status === "DRAFT" ? "bg-gray-300 text-gray-800 border-dashed" :
    isExpired ? "bg-red-400 text-black" :
    "bg-green-400 text-black"
}`}>
    {bet.status === "INVALID" ? "♻️ INVALID (REFUNDED)" : bet.status}
</span>
```

## 🎯 Implementation Priority

1. **AI Auto-Resolve** (High Value, Low Effort)
   - Add button
   - Add handler
   - Add animation

2. **Dispute Button** (Critical for fairness)
   - Simple button addition

3. **Voting UI** (Critical for disputes)
   - Vote buttons
   - Vote display

4. **Owner Controls** (Critical for resolution)
   - Check voting
   - Mark invalid

5. **Visual Indicators** (Polish)
   - Dispute timer
   - Status badges
   - Animations

## 📝 Notes

- All backend functions are ready to use
- Just need to wire up UI components
- Animations use Tailwind classes (animate-pulse, ring-4)
- All handlers already defined in BetCard
- Just need to add JSX in the right places

Would you like me to implement these UI components now?
