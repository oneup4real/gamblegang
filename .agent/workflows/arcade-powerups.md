---
description: Implementation plan for Arcade Mode Power-Ups (x2, x3, x4 Multipliers)
---

# Arcade Mode Power-Ups: Implementation Plan

## 1. Data Model & Types

### League Service (`src/lib/services/league-service.ts`)
- **Type Definitions**:
  - `PowerUpType`: `'x2' | 'x3' | 'x4'`
  - `PowerUpInventory`: `{ x2: number; x3: number; x4: number; }`
  - `LeaguePowerUpConfig`: `{ x2: number; x3: number; x4: number; }` (How many started with)

- **League Interface**:
  - Add `arcadePowerUpSettings?: LeaguePowerUpConfig` to `League`.

- **LeagueMember Interface**:
  - Add `powerUps?: PowerUpInventory` to `LeagueMember`.

### Bet Service (`src/lib/services/bet-service.ts`)
- **Wager Interface**:
  - Add `powerUp?: PowerUpType` to the `wager` object inside `Bet` or independent `Wager` type.

## 2. Configuration & Admin UI

### Create League Modal (`src/components/create-league-modal.tsx`)
- Add section for "Arcade Settings" (only if Arcade mode selected).
- Inputs to set initial count for x2, x3, x4 power-ups.
- Default to something reasonable (e.g., 5x 'x2', 3x 'x3', 1x 'x4').

### League Settings Modal (`src/components/league-settings-modal.tsx`)
- Allow Admin to modify these "Starting Defaults" for new members.
- (Advanced) Maybe allow giving power-ups manually? (Out of scope for now, just config).

## 3. Bet Placement UI (The "Cool" Part)

### Bet Card Component (`src/components/bet-card.tsx`)
- **Radial Menu / Popover**:
  - Add a "⚡ Power Up" button next to the wager/submit button.
  - On click/long-press, fan out available options (x2, x3, x4) with counts.
  - Hide options with 0 count.
- **Visuals**:
  - Selected power-up glows/pulses.
  - "Est. Return" updates dynamically: `(Base Points * Multiplier)`.
- **Wager Submission**:
  - Pass the selected `powerUp` type to `placeBet` function.

## 4. Ticket & Dashboard Display

### Bet Ticket (`src/components/dashboard/bet-tabs.tsx` & `bet-card.tsx`)
- Show a Badge/Icon on the ticket indicating active power-up.
- Use distinct colors (e.g., Gold for x4, Silver for x3, Bronze/Blue for x2).

### Leaderboard (`src/app/[locale]/leagues/[leagueId]/page.tsx`)
- Show mini icons next to user rankings: `⚡ 3` (total) or breakdown.

## 5. Backend Logic & Point Calculation

### Logic Flow
1. **Placing Bet**:
   - Verify user has the power-up in `members/{uid}` inventory.
   - **Transaction**:
     - Create Wager with `powerUp: 'x2'`.
     - Decrement `powerUps.x2` by 1 in Member doc.

2. **Resolving Bet (`resolveBet`)**:
   - Retrieve wager's `powerUp` field.
   - Calculate Base Points (Exact/Diff/Winner).
   - Apply Multiplier: `Total = Base * Multiplier`.
   - Update Member Points with new Total.

## 6. Security Rules
- Ensure users can only submit a power-up if they actually have it in their inventory (Backend validation preferred, but Firestore rules can check `resource.data.powerUp` vs member doc).

---

## Guide: Point Calculation & Data Flow

### Data Model
**League Member (Firestore):**
```json
{
  "uid": "user123",
  "points": 150,
  "powerUps": {
    "x2": 4,
    "x3": 2,
    "x4": 1
  }
}
```

**Wager (Inside Bet/Subcollection):**
```json
{
  "userId": "user123",
  "amount": 0, // In Arcade, amount usually flat or 0, but we use 'powerUp'
  "selection": "Team A",
  "powerUp": "x3" 
}
```

### Calculation Strategy
When `resolveBet` runs:
1. `basePoints = calculateArcadePoints(prediction, result)`
   - *Example*: User predicted 2-1, Result 2-1. Exact Match = 3 points.
2. `multiplier = getMultiplier(wager.powerUp)` // Returns 3
3. `finalPoints = basePoints * multiplier` // 3 * 3 = 9 points.
4. `member.points += finalPoints`

This ensures the leaderboard reflects the boosted score immediately.
