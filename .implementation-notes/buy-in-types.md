# Buy-In Type Implementation

## Overview
Added flexible buy-in options for Zero Sum leagues to distinguish between initial capital/rebuys and actual bet investments.

## Changes Made

### 1. New Types & Models

**`BuyInType`**: `"FIXED" | "FLEXIBLE"`

- **FIXED**: Everyone gets `startCapital` points at the beginning
- **FLEXIBLE**: Everyone starts with 0 points and can buy points anytime

**League Interface Updates:**
- Added `buyInType?: BuyInType` field (only for ZERO_SUM leagues)

**LeagueMember Interface Updates:**
- `totalInvested`: Now tracks ONLY actual bets placed (not initial capital or rebuys)
- `totalBought`: NEW field - tracks initial capital + all rebuys

### 2. Create League Modal

Added UI to select buy-in type:
- 💰 **Fixed**: Everyone gets starting capital
- 🔓 **Flexible**: Start at 0, buy points anytime

The label changes based on selection:
- Fixed: "Starting Capital"
- Flexible: "Rebuy Unit"

### 3. League Creation Logic

**Fixed Buy-in:**
- Members start with `startCapital` points
- `totalBought` = `startCapital`
- `totalInvested` = 0

**Flexible Buy-in:**
- Members start with 0 points
- `totalBought` = 0
- `totalInvested` = 0

### 4. Rebuy Logic

Updated `rebuy()` function:
- Now increments `totalBought` instead of `totalInvested`
- Rebuys are NOT considered as "invested" in statistics

### 5. Bet Placement

The `placeWager()` function in `bet-service.ts` increments `totalInvested` when bets are placed.

This is the ONLY place where `totalInvested` should increase.

### 6. ROI Calculation

ROI now correctly reflects:
```
ROI = (current points - totalInvested) / totalInvested * 100
```

**Important**: `totalBought` (initial capital + rebuys) is NOT included in the denominator!

## Benefits

1. **Accurate Statistics**: ROI based only on actual betting performance
2. **Flexibility**: Players can choose their league structure
3. **Transparency**: Clear distinction between buying points and investing in bets
4. **Fair Comparison**: All players' ROI calculated the same way regardless of how many rebuys they made

## Migration Notes

Existing leagues will not have `buyInType` defined (it's optional). They will default to FIXED behavior.

Existing members may not have `totalBought` field. Consider adding a migration script or handling undefined values as 0.
