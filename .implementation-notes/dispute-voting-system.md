# Dispute & Voting System Implementation

## Overview
Players can dispute bet results after proofing. If disputes arise, all players vote to approve or reject the result. If no consensus is reached, the owner can mark the bet as INVALID and refund all wagers.

## Workflow

### 1. Owner Proofs Bet
1. Bet finishes (past eventDate)
2. Owner clicks "Start Proofing"
3. Owner enters the result
4. **NEW**: System automatically starts 48-hour dispute period
   - Sets `disputeDeadline`
   - Initializes empty `votes` object
   - Sets `disputedBy` array

### 2. Dispute Period (48 hours)
**Players can:**
- View the proposed result
- Click **"🚨 Dispute Result"** button
- This changes bet status to `DISPUTED`
- Adds their ID to `disputedBy` array

### 3. Voting Phase (If Disputed)
**All players who wagered must vote:**
- **👍 Approve**: Result is correct
- **👎 Reject**: Result is incorrect

**Voting Requirements:**
- Minimum 50% participation required
- Need >66% majority to approve OR reject
- Otherwise = "no consensus"

### 4. Resolution Outcomes

**Scenario A: Approved (>66% approve)**
- Bet returns to `PROOFING` status
- Owner can finalize resolution
- Winners get paid out normally

**Scenario B: Rejected (>66% reject)**
- Owner must re-proof with correct result
- Or owner can mark bet as INVALID

**Scenario C: No Consensus**
- <50% participation OR <66% agreement
- Owner has 2 options:
  1. Mark bet as `INVALID` → All players refunded
  2. Re-proof with new evidence

### 5. Invalid Bet Refund Process
When owner marks bet as INVALID:
1. All wagers get status `PUSH` (refunded)
2. Each player gets their wagered points back
3. `totalInvested` is decreased (bet doesn't count in ROI)
4. Bet status → `INVALID`
5. Bet is archived

## New Bet Statuses

- **`DISPUTED`**: Players have disputed the result, voting in progress
- **`INVALID`**: Bet marked invalid, all wagers refunded

## New Bet Fields

```typescript
{
  disputeDeadline?: Timestamp,     // 48h after proofing starts
  disputedBy?: string[],            // User IDs who disputed
  disputeActive?: boolean,          // Is dispute currently active
  votes?: {                         // Player votes
    [userId: string]: "approve" | "reject"
  }
}
```

## New Functions

### `startDisputePeriod(leagueId, betId)`
- Called after owner proofs bet
- Sets 48-hour deadline

### `disputeBetResult(leagueId, betId, userId)`
- Player initiates dispute
- Changes status to DISPUTED
- Adds player to disputedBy list

### `voteOnDisputedBet(leagueId, betId, userId, vote)`
- Player votes "approve" or "reject"
- Updates votes object

### `checkDisputeVoting(leagueId, betId)` 
- Returns: "approve" | "reject" | "no_consensus"
- Checks participation (>50%)
- Checks majority (>66%)

### `markBetInvalidAndRefund(leagueId, betId)`
- Refunds all wagers
- Sets status to INVALID
- Decreases totalInvested for all players

### `resolveDispute(leagueId, betId)`
- Checks voting outcome
- Updates bet status accordingly
- Returns result to UI

## UI Components Needed

### BetCard Updates (TODO)
1. **Dispute Period Indicator**
   - Show countdown timer during 48h window
   - "⏰ Dispute deadline: 23h 45m"

2. **Dispute Button** (for players)
   - Only shown during dispute period
   - "🚨 Dispute Result" button

3. **Voting UI** (if disputed)
   - Shows proposed result
   - Vote buttons: "👍 Approve" | "👎 Reject"
   - Vote count display: "5/10 voted (3 approve, 2 reject)"

4. **Owner Controls** (if disputed)
   - "Check Voting Results" button
   - "Mark as Invalid & Refund" button
   - Voting statistics display

5. **Status Badges**
   - DISPUTED - Orange/Red badge
   - INVALID - Gray badge with refund icon

## Security Considerations

1. **Only wagered players can vote** - Prevents vote manipulation
2. **One vote per user** - Can change vote before deadline
3. **Owner cannot vote** - Prevents conflict of interest
4. **Dispute deadline enforced** - Can't dispute after 48h
5. **Refund is atomic** - All-or-nothing transaction

## Example Timeline

```
Day 1, 00:00: Bet event happens
Day 1, 01:00: Owner starts proofing, enters result
Day 1, 01:00: Dispute period begins (48h deadline)
Day 1, 05:00: Player A disputes result
Day 1, 05:01: Status → DISPUTED, voting begins
Day 1, 12:00: 7/10 players voted (4 approve, 3 reject)
Day 2, 10:00: 10/10 players voted (6 approve, 4 reject)
Day 2, 10:01: Owner checks: 60% approval → No consensus
Day 2, 10:05: Owner marks bet INVALID
Day 2, 10:05: All 10 players refunded automatically
```

## Benefits

✅ **Fair**: Players have a voice in bet outcomes
✅ **Transparent**: All votes are visible
✅ **Safe**: Refund option prevents losses from errors
✅ **Democratic**: Majority rules (66% threshold)
✅ **Time-limited**: Can't dispute forever (48h window)
