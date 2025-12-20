# 🔴 Live Bets Tracker - Design Document

## 📋 Overview

A real-time dashboard showing users their active bets with live scores, win/loss status, and net position calculations. Data is refreshed every 2 minutes via a Cloud Function that queries TheSportsDB API.

### ✅ IMPLEMENTATION STATUS: COMPLETED

Files created/modified:
- `src/lib/services/bet-service.ts` - Added smart routing fields to Bet interface
- `src/lib/services/sports-data-service.ts` - Added event matching and live score functions
- `src/lib/services/backfill-sportsdb.ts` - NEW: Backfill script for existing bets
- `src/hooks/use-live-bets.ts` - NEW: React hook for live bet subscriptions
- `src/components/live-bets-section.tsx` - NEW: Dashboard component for live bets
- `src/app/[locale]/dashboard/page.tsx` - Integrated LiveBetsSection
- `functions/src/index.ts` - Added updateLiveScores function and smart routing

---

## 🎨 UI/UX Design

### Dashboard Integration (Global View)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ LIVE BETS                          Updated 2 mins ago   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         🎯 YOUR NET POSITION                            │ │
│  │                                                         │ │
│  │         +245 pts   ████████████░░░░  5/7 winning       │ │
│  │         ▲ +32 from last update                          │ │
│  │                                                         │ │
│  │   5 active bets  •  3 leagues  •  Est. payout: 890 pts │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ 🔴 LIVE  67'   │  │ 🔴 LIVE  45'+2 │  │ 🟡 HT          │ │
│  │                │  │                │  │                │ │
│  │ ARS  2  -  1  CHE│  │ MUN  0  -  0  LIV│  │ BAR  3  -  1  RMA│ │
│  │                │  │                │  │                │ │
│  │ Your: HOME ✅   │  │ Your: DRAW ⏳  │  │ Your: HOME ✅   │ │
│  │ +120 pts 🟢     │  │ +80 pts 🟡     │  │ +200 pts 🟢     │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
│                          ◀ swipe ▶                          │
└─────────────────────────────────────────────────────────────┘
```

### Card States

| State | Border Color | Icon | Description |
|-------|--------------|------|-------------|
| **WINNING** | Neon Green (#22c55e) | ✅ | User's prediction is currently correct |
| **LOSING** | Neon Red (#ef4444) | ❌ | User's prediction is currently incorrect |
| **NEUTRAL** | Yellow (#eab308) | ⏳ | Match is tied / outcome undetermined |
| **NOT STARTED** | Gray (#6b7280) | 🕐 | Match hasn't started yet |

### League View Integration

In the league page, add a collapsible "Live Now" section at the top:

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 LIVE IN THIS LEAGUE (2)                    Collapse ▼   │
├─────────────────────────────────────────────────────────────┤
│  [Same card layout as dashboard, filtered to this league]   │
└─────────────────────────────────────────────────────────────┘
│                                                              │
│  📋 ALL BETS                                                 │
│  ... existing bet list ...                                   │
```

---

## 📊 Data Model Changes

### New Collection: `liveScores` (Global Cache)

```typescript
// Collection: liveScores/{eventId}
interface LiveScore {
  eventId: string;              // TheSportsDB event ID
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  matchTime: string;            // e.g., "67'", "HT", "FT", "NS"
  matchStatus: 'NOT_STARTED' | 'LIVE' | 'HALFTIME' | 'FINISHED';
  lastUpdated: Timestamp;
  
  // Optional enrichment
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  league?: string;
  venue?: string;
}
```

### Bet Document Updates

Add to existing `Bet` interface:

```typescript
interface Bet {
  // ... existing fields ...
  
  // NEW: Live tracking reference
  sportsDbEventId?: string;     // Links bet to liveScores collection
}
```

### Wager Document Updates

Add to existing `Wager` interface for real-time status:

```typescript
interface Wager {
  // ... existing fields ...
  
  // NEW: Live status (computed by cloud function)
  liveStatus?: {
    isLive: boolean;
    currentOutcome: 'WINNING' | 'LOSING' | 'NEUTRAL' | 'UNKNOWN';
    liveScore?: { home: number; away: number };
    matchTime?: string;
    potentialPayout: number;
    lastUpdated: Timestamp;
  };
}
```

### New Collection: `userLiveStats/{userId}`

Pre-computed stats for fast dashboard loading:

```typescript
interface UserLiveStats {
  userId: string;
  activeBets: number;
  winningBets: number;
  losingBets: number;
  neutralBets: number;
  netPosition: number;           // Sum of potential gains/losses
  netPositionChange: number;     // Change since last update
  estimatedPayout: number;       // If all winning bets win
  lastUpdated: Timestamp;
  
  // Quick reference to active bet IDs for fast lookup
  activeBetIds: Array<{
    betId: string;
    leagueId: string;
    wagerId: string;
  }>;
}
```

---

## ⚡ Cloud Function Design

### `updateLiveScores` (Every 5 minutes)

```typescript
// Scheduled: Every 5 minutes
// Purpose: Fetch live scores and update all relevant data

async function updateLiveScores() {
  // 1. Query all LOCKED bets where eventDate is within last 4 hours
  //    (accounts for games that might still be in progress)
  
  // 2. Extract unique sportsDbEventIds (or home/away team pairs)
  
  // 3. Batch query TheSportsDB for live scores:
  //    - /livescore.php for currently live games
  //    - /eventslast.php for recently finished games
  
  // 4. Update liveScores collection with new data
  
  // 5. For each bet with live data:
  //    a. Calculate if each wager is WINNING/LOSING/NEUTRAL
  //    b. Update wager.liveStatus
  
  // 6. Aggregate user stats and update userLiveStats collection
  
  // 7. Log activity for transparency
}
```

### API Endpoints Used

| Endpoint | Purpose | Rate |
|----------|---------|------|
| `livescore.php?l={leagueId}` | Get all live games in a league | Per league |
| `eventslast.php?id={teamId}` | Get recent finished games | Per team |
| `lookupevent.php?id={eventId}` | Get specific event details | Per event |

### Smart Batching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│   CLOUD FUNCTION FLOW                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Get all LOCKED bets with eventDate in live window      │
│                         ↓                                    │
│   2. Group by league (e.g., Premier League, NBA)            │
│                         ↓                                    │
│   3. Batch API calls per league (1 call = all live games)   │
│                         ↓                                    │
│   4. Match API results to bets by team names                │
│                         ↓                                    │
│   5. Calculate win/loss status for each wager               │
│                         ↓                                    │
│   6. Batch write updates to Firestore                       │
│                         ↓                                    │
│   7. Trigger client-side real-time listeners                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Real-Time Frontend Architecture

### React Hook: `useLiveBets`

```typescript
// hooks/use-live-bets.ts

interface LiveBetData {
  bet: Bet;
  wager: Wager;
  liveScore?: LiveScore;
  status: 'WINNING' | 'LOSING' | 'NEUTRAL' | 'NOT_STARTED';
  potentialPayout: number;
}

interface UseLiveBetsReturn {
  liveBets: LiveBetData[];
  stats: {
    netPosition: number;
    netPositionChange: number;
    winningCount: number;
    losingCount: number;
    totalActive: number;
  };
  lastUpdated: Date | null;
  loading: boolean;
}

function useLiveBets(userId: string, leagueId?: string): UseLiveBetsReturn {
  // 1. Subscribe to userLiveStats/{userId} for quick stats
  // 2. Subscribe to user's wagers where liveStatus.isLive === true
  // 3. Join with liveScores collection for detailed info
  // 4. Filter by leagueId if provided (for league view)
}
```

### Component Structure

```
<LiveBetsSection>
  ├── <NetPositionCard>          // Big hero card with net position
  │     └── Animated counter for position changes
  │
  ├── <LiveBetCarousel>          // Horizontal scrolling live bets
  │     ├── <LiveBetCard>        // Individual bet card
  │     │     ├── <TeamLogos>    // Team badge images
  │     │     ├── <LiveScore>    // Animated score with pulse
  │     │     ├── <MatchTimer>   // Minutes played / status
  │     │     ├── <UserPick>     // What user bet on
  │     │     └── <StatusGlow>   // Green/red border glow
  │     └── ...more cards
  │
  └── <LastUpdatedBadge>         // "Updated 2 mins ago"
</LiveBetsSection>
```

---

## 🎮 User Experience Enhancements

### 1. Micro-Animations

- **Score Change**: Numbers animate/flash when score changes
- **Status Flip**: Smooth transition when bet status changes (losing → winning)
- **Net Position Counter**: Counting animation when value changes
- **Pulse Effect**: Subtle pulse on LIVE badge every few seconds

### 2. Sound Effects (Optional)

- 🔔 Notification sound when user's bet status changes
- 🎉 Celebration sound when bet becomes winning
- Toggle in settings to enable/disable

### 3. Push Notifications (Future)

- "⚽ GOAL! Arsenal 2-1 Chelsea - You're now WINNING!"
- "🏀 Game Over! Lakers 112-108 Celtics - You WON +250 pts!"

### 4. Historical Tracking

- Show position change arrow (▲ +32 since last update)
- Mini sparkline graph showing net position over time
- "Hot streak" badge if winning multiple in a row

---

## 📱 Placement Options

### Option A: Dashboard Tab

Add a new "Live" tab to the dashboard navbar:
```
[Leagues] [Live 🔴] [Settings]
```

### Option B: Dashboard Section (Recommended)

Add collapsible section at top of existing dashboard:
```
┌──────────────────────────────────┐
│ 🔴 LIVE BETS (5)      Collapse ▼ │
│ [Live bets UI here]              │
├──────────────────────────────────┤
│ 📋 YOUR LEAGUES                  │
│ [Existing league list]           │
└──────────────────────────────────┘
```

### Option C: Floating Widget

Persistent floating button showing live count:
```
                    ┌─────────┐
                    │ 🔴 5    │
                    │ +245pts │
                    └─────────┘
```
Tap to expand full live view.

---

## 🗄️ Firestore Index Requirements

```
// Composite indexes needed:

// 1. Wagers with live status for a user
Collection: leagues/{leagueId}/bets/{betId}/wagers
Fields: userId (ASC), liveStatus.isLive (ASC)

// 2. Bets by event date for cloud function
Collection Group: bets
Fields: status (ASC), eventDate (ASC)

// 3. Live scores ordered by last update
Collection: liveScores
Fields: matchStatus (ASC), lastUpdated (DESC)
```

---

## 💰 Cost Estimation

### TheSportsDB API Calls

| Scenario | Calls per 5 min | Daily | Monthly |
|----------|-----------------|-------|---------|
| 5 active leagues | ~5 | 1,440 | 43,200 |
| 10 active leagues | ~10 | 2,880 | 86,400 |
| 20 active leagues | ~20 | 5,760 | 172,800 |

*Premium tier should handle this volume comfortably*

### Firestore Operations

| Operation | Per Update Cycle | Daily | Monthly |
|-----------|------------------|-------|---------|
| Reads (bets, wagers) | ~100 | 28,800 | 864,000 |
| Writes (liveScores) | ~20 | 5,760 | 172,800 |
| Writes (wager updates) | ~50 | 14,400 | 432,000 |

*Within free tier for small-medium usage*

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (MVP)
- [ ] Create `liveScores` collection
- [ ] Add `sportsDbEventId` to bet creation flow
- [ ] Build `updateLiveScores` cloud function
- [ ] Basic live bets section in dashboard

### Phase 2: Enhanced UI
- [ ] Animated score changes
- [ ] Net position card with trends
- [ ] League view integration
- [ ] Team logos integration

### Phase 3: Polish
- [ ] Sound effects (optional)
- [ ] Position history tracking
- [ ] Performance optimizations
- [ ] Error handling & offline support

---

## ❓ Open Questions

1. **Bet Linking**: How do we reliably link bets to SportsDB events?
   - Option A: Store eventId during bet creation (most reliable)
   - Option B: Match by team names + date (fuzzy, may have issues)

2. **Update Frequency**: Is 5 minutes acceptable or do users expect faster?
   - 5 min = Cost efficient, reasonable for casual betting
   - 1 min = More real-time, higher API costs

3. **Scope**: Should live tracking work for ALL bet types?
   - MATCH bets: Perfect fit (score-based)
   - CHOICE bets: Works if linked to match events
   - RANGE bets: May not apply (player stats harder to track live)

---

## 🎯 Success Metrics

- **Engagement**: Time spent on live section
- **Retention**: Users returning during live games
- **Excitement**: Bets placed during live games (future feature?)
- **Accuracy**: % of live scores correctly matched to bets

---

*Created: December 20, 2024*
*Status: Design Phase - Awaiting Approval*
