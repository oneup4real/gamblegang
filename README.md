# 🎲 GambleGang - Social Betting Platform

A modern, feature-rich social betting platform built with Next.js, Firebase, and AI integration. Create private leagues, place bets on real-world events, and compete with friends!

## 🌟 Key Features

### 🏆 League Management
- **Multiple League Modes:**
  - **For Fun**: Casual betting with friends, no stakes
  - **Zero Sum**: Tournament-style with buy-ins and elimination
  
- **Buy-In Systems** (Zero Sum only):
  - **Fixed**: Everyone gets same starting capital, 0 points = Game Over 💀
  - **Flexible**: Start at 0, unlimited rebuys, no elimination

- **League Lifecycle:**
  - Draft → Not Started → Active → Completed
  - Owner controls when league starts
  - Auto-track member points and ROI

### 🎯 Bet Types

#### 1. **MATCH Bets**
Predict exact scores for sports matches
- Example: "Lakers vs Celtics - predict final score"
- Players wager on specific score predictions
- Multiple outcomes possible

#### 2. **CHOICE Bets**
Multiple choice outcomes
- Example: "Who will win the Super Bowl?"
- 2-6 options
- Configurable odds based on pool distribution
- Dynamic payout calculation

#### 3. **RANGE Bets**
Predict a numeric value
- Example: "How many points will LeBron score?"
- Closest prediction wins
- Configurable margin of error

### ⚖️ Resolution & Verification System

#### AI-Assisted Resolution
- **🤖 AI Auto-Resolve**: One-click result lookup using Gemini AI
- Automatically prefills resolution form
- ✨ Animated purple pulsing highlight on AI-filled fields
- Fallback to manual entry if AI can't determine result

#### Proofing & Dispute System
1. **PROOFING Phase** (48 hours)
   - Result proposed by owner
   - ⏰ Countdown timer displayed
   - 🚨 Players can dispute during this window
   - Fair verification period

2. **DISPUTED Phase** (if disputed)
   - Democratic voting by all wagered players
   - 👍 Approve or 👎 Reject the result
   - Live vote tally
   - Owner can check voting results

3. **Resolution Options:**
   - **Approved** (>66% vote): Result confirmed
   - **Rejected** (>66% vote): Re-proof required  
   - **No Consensus**: Owner can mark invalid
   - **♻️ INVALID**: Automatic refunds to all players

### 💰 Wagering System

- **Dynamic Odds**: Based on pool distribution
- **Pot Management**: Total pool tracked per bet
- **Payout Calculation**: 
  - For Fun: Proportional distribution
  - Zero Sum: Winner-takes-all or proportional

- **🔥 All-In Detection**:
  - Dramatic warning modal with flames 🔥
  - "You're putting it all on the line!"
  - Explicit confirmation required

### 📊 Dashboard

**Organized Bet Sections** (all expandable):

1. **🎯 Your Active Bets** - Still open for wagering
2. **⏳ Pending Results** - LOCKED/PROOFING/DISPUTED
3. **✅ Won Bets** - With payout amounts
4. **❌ Lost Bets** - Track your losses
5. **⚖️ Bets to Resolve** - Owner only

**Features:**
- Expand/collapse sections and individual bets
- Clear individual or bulk won/lost bets
- Dismissed bets persist via localStorage
- Direct links to leagues
- Real-time statistics

### 🎨 UI/UX Features

#### List vs Grid Views
- **📋 List View** (default): Compact, expandable cards
  - Shows odds & estimated return
  - Individual expand/collapse
  - "Expand All" / "Collapse All" toggle
  
- **🎯 Grid View**: Traditional full detail cards

#### Visual Design
- Comic book aesthetic (bold borders, hard shadows)
- Status-based color coding
- Smooth animations (Framer Motion)
- Responsive design (mobile-first)

#### Game Over Indicators
- 💀 Grayscale + skull overlay on eliminated players
- Pulsing "GAME OVER" badge
- Only in Fixed buy-in Zero Sum leagues

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**: 
  - Radix UI primitives
  - Custom comic-style components
- **Icons**: Lucide React
- **Internationalization**: next-intl (EN/DE)
- **Charts**: Recharts

### Backend & Infrastructure
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage (avatars, attachments)
- **Hosting**: Firebase Hosting
- **Security**: Firestore Security Rules

### AI & APIs
- **AI Provider**: Google Generative AI (Gemini API)
- **Use Cases**:
  - Bet idea generation
  - Result verification
  - Bet idea generation
  - Result verification
  - Auto-resolve functionality

### Architecture & Infrastructure

The application leverages a **Serverless Architecture** on Google Cloud Platform:

1.  **Next.js App (Firebase App Hosting)**:
    - Serves the frontend and SSR pages.
    - Handles dynamic API routes (`/api/...`).
    - Automatically built into a Cloud Run service (or Cloud Function v2).

2.  **Auto-Resolve Scheduler (Firebase Cloud Functions)**:
    - **Trigger**: `onSchedule("every 15 minutes")` (EventArc).
    - **Logic**: Independent TypeScript function (`functions/src/index.ts`).
    - **Role**: Scans for "Open" bets that have passed their event time + delay.
    - **AI Integration**: Calls Gemini with Google Search Grounding to verify results.
    - **Database**: Updates Firestore directly via `firebase-admin`.

3.  **Database (Firestore)**:
    - Shared NoSQL database between the App and the Scheduler.
    - Real-time listeners update the UI immediately when the Scheduler resolves a bet.

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Date Handling**: date-fns
- **Forms**: React Hook Form (planned)

## 📁 Project Structure

```
gamblegang/
├── src/
│   ├── app/
│   │   ├── [locale]/              # Internationalized routes
│   │   │   ├── dashboard/         # User dashboard
│   │   │   ├── leagues/[id]/      # League detail pages
│   │   │   ├── login/             # Authentication
│   │   │   └── settings/          # User settings
│   │   └── actions/               # Server actions
│   │       └── ai-bet-actions.ts  # AI integration
│   ├── components/
│   │   ├── auth-provider.tsx      # Auth context
│   │   ├── bet-card.tsx           # Bet display/interaction
│   │   ├── create-bet-modal.tsx   # Bet creation
│   │   ├── create-league-modal.tsx
│   │   ├── league-settings-modal.tsx
│   │   └── ui/                    # Reusable UI components
│   ├── lib/
│   │   ├── firebase/
│   │   │   └── config.ts          # Firebase initialization
│   │   └── services/
│   │       ├── bet-service.ts     # Bet logic
│   │       └── league-service.ts  # League logic
│   ├── i18n/                      # Internationalization
│   └── locales/                   # Translation files
├── .implementation-notes/         # Development docs
├── firestore.rules               # Security rules
└── firebase.json                 # Firebase config
```

## 🏗️ Code Architecture

### Overview

GambleGang follows a **service-oriented architecture** with clear separation of concerns:
- **UI Layer**: React components (Next.js App Router)
- **Service Layer**: Business logic and data operations
- **Data Layer**: Firebase Firestore with structured collections
- **AI Layer**: Gemini AI integration for automated features

### Architecture Patterns

#### 1. **Service Pattern**
All data operations are encapsulated in service modules located in `src/lib/services/`:

```typescript
// Service modules handle all CRUD and business logic
src/lib/services/
  ├── bet-service.ts       // Bet creation, wagering, resolution
  ├── league-service.ts    // League management, members
  └── user-service.ts      // User profiles, avatars
```

**Benefits:**
- Centralized business logic
- Reusable across components
- Easy to test and maintain
- Consistent error handling

#### 2. **Component Composition**
UI components are broken down into small, focused units:

```typescript
// Atomic components
src/components/
  ├── ui/                  // Base components (buttons, cards, modals)
  ├── bet-card.tsx         // Composite component for bet display
  ├── bet-ticket.tsx       // Bet receipt display
  ├── bet-status-stepper.tsx // Visual status indicator
  └── animations/          // Reusable animations
```

#### 3. **Provider Pattern**
Context providers manage global state:

```typescript
// Auth context wraps the entire app
<AuthProvider>
  <App />
</AuthProvider>

// Usage in components
const { user, loading } = useAuth();
```

#### 4. **Server Actions Pattern**
AI features use Next.js server actions for secure API calls:

```typescript
// src/app/actions/ai-bet-actions.ts
export async function aiAutoResolveBet(bet: Bet) {
  "use server";
  // Gemini API calls happen server-side
}
```

### Core Data Models

#### League Model
```typescript
interface League {
  id: string;
  name: string;
  ownerId: string;
  mode: "ZERO_SUM" | "STANDARD" | "ARCADE";
  
  // Zero-Sum specific
  startCapital: number;
  buyInType?: "FIXED" | "FLEXIBLE";
  
  // Arcade/Standard specific
  matchSettings?: {
    exact: number;      // Points for exact match prediction
    diff: number;       // Points for goal difference
    winner: number;     // Points for winner prediction
    choice?: number;    // Points for multiple choice
    range?: number;     // Points for range/guessing
  };
  
  status: "DRAFT" | "NOT_STARTED" | "ACTIVE" | "COMPLETED";
  memberCount: number;
  createdAt: Timestamp;
  startDate?: Timestamp;
  endDate?: Timestamp;
}
```

**Subcollections:**
- `leagues/{leagueId}/members` - League members
- `leagues/{leagueId}/bets` - League bets

#### Bet Model
```typescript
interface Bet {
  id: string;
  leagueId: string;
  creatorId: string;
  question: string;
  type: "CHOICE" | "MATCH" | "RANGE";
  status: "DRAFT" | "OPEN" | "LOCKED" | "PROOFING" | "DISPUTED" | "RESOLVED" | "INVALID";
  
  closesAt: Timestamp;      // When wagering closes
  eventDate?: Timestamp;    // When event occurs
  
  totalPool: number;        // Total points wagered (Zero-Sum only)
  wagerCount?: number;      // Number of wagers placed
  
  // Type-specific fields
  options?: BetOption[];           // For CHOICE bets
  rangeMin?: number;              // For RANGE bets
  rangeMax?: number;
  rangeUnit?: string;
  matchDetails?: {                // For MATCH bets
    homeTeam: string;
    awayTeam: string;
    date: string;
  };
  
  // Resolution fields
  winningOutcome?: any;
  disputeDeadline?: Timestamp;
  votes?: { [userId: string]: "approve" | "reject" };
}
```

**Subcollections:**
- `bets/{betId}/wagers` - Individual player wagers

#### Wager Model
```typescript
interface Wager {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;              // 0 for Arcade/Standard mode
  selection: string | number | { home: number, away: number };
  status: "PENDING" | "WON" | "LOST" | "PUSH";
  payout?: number;            // Set when resolved
  placedAt: Timestamp;
}
```

#### League Member Model
```typescript
interface LeagueMember {
  uid: string;
  leagueId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  points: number;             // Current wallet balance
  totalBought: number;        // Total investment (Zero-Sum)
  totalInvested: number;      // Amount in active wagers
  joinedAt: Timestamp;
  displayName: string;
  photoURL: string;
}
```

### Data Flow Patterns

#### 1. **Create League Flow**
```
User Action → CreateLeagueModal 
  → league-service.createLeague()
    → Firestore transaction
      → Create league doc
      → Create owner member doc
        → Return leagueId
          → Navigate to league page
```

#### 2. **Place Wager Flow**
```
User Action → BetCard component
  → Validation (points, selection)
    → bet-service.placeWager()
      → Firestore transaction
        ├── Deduct points from member
        ├── Create wager doc
        ├── Update bet totalPool
        └── Update option.totalWagered (CHOICE)
          → Show BetTicket confirmation
            → Update local state
```

#### 3. **Resolve Bet Flow**
```
Owner Action → BetCard (expanded)
  → [Optional] AI Auto-Resolve
    → ai-bet-actions.aiAutoResolveBet()
      → Gemini API call
        → Parse result
  → bet-service.resolveBet()
    → Firestore transaction
      ├── Update bet.status = "PROOFING"
      ├── Set bet.winningOutcome
      ├── Set bet.disputeDeadline (+48h)
      ├── Calculate winners
      ├── Update wager.status (WON/LOST/PUSH)
      ├── Update wager.payout
      └── Update member.points
        → Trigger payout + confetti animation
```

#### 4. **Dashboard Data Flow**
```
Dashboard Page Load
  → getUserLeagues()
    → Fetch all user's leagues
      → For each league:
        ├── Fetch league.mode
        ├── Fetch league.matchSettings
        └── Fetch all bets
          → For each bet:
            ├── Fetch user's wager
            └── Build DashboardBetWithWager
              → Categorize by status:
                ├── Available (OPEN, no wager)
                ├── Active (OPEN, has wager)
                ├── Pending (LOCKED/PROOFING/DISPUTED)
                ├── Won (RESOLVED, status=WON)
                └── Lost (RESOLVED, status=LOST)
                  → Sort by time
                    → Display in sections
```

### Key Service Functions

#### bet-service.ts

**Creation & Management:**
- `createBet()` - Create new bet with validation
- `publishBet()` - Change status from DRAFT to OPEN
- `deleteBet()` - Remove bet (owner only, draft only)

**Wagering:**
- `placeWager()` - Place wager with transaction
- `calculateOdds()` - Compute parimutuel odds
- `getReturnPotential()` - Calculate estimated payout

**Resolution:**
- `resolveBet()` - Resolve bet and distribute payouts
- `startProofing()` - Begin 48h dispute period
- `disputeBetResult()` - File dispute
- `voteOnDisputedBet()` - Cast vote on disputed bet
- `markBetInvalidAndRefund()` - Refund all wagers

**Dashboard:**
- `getUserDashboardStats()` - Aggregate all user bets across leagues
- `dismissBet()` - Mark bet as dismissed (localStorage)
- `clearDismissedSection()` - Bulk dismiss bets

#### league-service.ts

**League Management:**
- `createLeague()` - Create league with owner member
- `updateLeagueSettings()` - Modify league configuration
- `getUserLeagues()` - Fetch all leagues user is member of
- `getLeagueById()` - Fetch single league
- `getLeagueMembers()` - Fetch all members

**Member Management:**
- `joinLeague()` - Add user as member
- `updateMemberRole()` - Change member permissions
- `buyPoints()` - Purchase additional points (Zero-Sum)

#### user-service.ts

**User Profile:**
- `createUserProfile()` - Initialize user document
- `updateUserProfile()` - Update user data + sync to all leagues
- `uploadUserAvatar()` - Upload and resize avatar image
- `getUserProfile()` - Fetch user document

### State Management

#### Local State (useState)
- Component-specific UI state
- Form inputs
- Expand/collapse states
- Loading indicators

#### Context State (useContext)
- `AuthContext` - User authentication state
- Global user object
- Loading states
- Auth methods (login, logout)

#### localStorage
- Dismissed bets (per user)
- UI preferences
- Temporary client-side caching

#### Real-time State (Firestore Listeners)
```typescript
// Real-time updates for live data
useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "leagues", leagueId, "bets"),
    (snapshot) => {
      // Update local state with live data
      setBets(snapshot.docs.map(doc => doc.data()));
    }
  );
  return unsubscribe; // Cleanup
}, [leagueId]);
```

### Firebase Security Rules

Rules enforce data access patterns:

```javascript
// leagues/{leagueId}
- read: allow all (for join links)
- create: authenticated users
- update: owner OR memberCount field only
- delete: owner only

// leagues/{leagueId}/members/{memberId}
- read: authenticated users
- write: authenticated users (for joining/updates)

// leagues/{leagueId}/bets/{betId}
- read: authenticated users
- create: authenticated users
- update: authenticated users
- delete: league owner only

// leagues/{leagueId}/bets/{betId}/wagers/{wagerId}
- read: authenticated users
- create: wager owner only
- update: authenticated users (for resolution)
```

### Error Handling

#### Service Layer
```typescript
try {
  await placeWager(leagueId, betId, user, 50, "Option A");
} catch (error) {
  console.error("Wager failed:", error);
  throw error; // Propagate to component
}
```

#### Component Layer
```typescript
const handlePlaceWager = async () => {
  setLoading(true);
  try {
    await executePlaceWager(amount, prediction);
    // Success feedback
  } catch (error) {
    console.error(error);
    alert("Failed to place wager");
  } finally {
    setLoading(false);
  }
};
```

### Performance Optimizations

1. **Firestore Indexes** - Optimized queries for sorting/filtering
2. **Pagination** - Limited results per query
3. **Local Caching** - Dismissed bets in localStorage
4. **Code Splitting** - Next.js automatic route-based splitting
5. **Image Optimization** - Next.js Image component + Firebase Storage
6. **Lazy Loading** - Components loaded on demand
7. **Memoization** - React.memo for expensive renders

### Testing Patterns

**Service Testing:**
```typescript
// Mock Firestore
jest.mock('@/lib/firebase/config');

test('placeWager deducts points', async () => {
  const result = await placeWager(leagueId, betId, user, 50, "Option A");
  expect(result.newBalance).toBe(50);
});
```

**Component Testing:**
```typescript
// Test with React Testing Library
render(<BetCard bet={mockBet} userPoints={100} />);
fireEvent.click(screen.getByText('Place Wager'));
expect(screen.getByText('Success')).toBeInTheDocument();
```

### Internationalization (i18n)

**Pattern:**
```typescript
// Component
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('Dashboard');
  return <h1>{t('title')}</h1>;
}

// Translation files
messages/
  ├── en.json  // { "Dashboard": { "title": "Dashboard" } }
  └── de.json  // { "Dashboard": { "title": "Übersicht" } }
```

---

## 🔐 Security

### Firestore Rules
- User profiles: Own profile write access
- Leagues: Owner update/delete, authenticated read
- Bets: Owner resolution, player wagers
- Wagers: Create-only by owner, updates for resolution

### Authentication
- Firebase Auth integration
- Email/password & social providers
- Protected routes
- Role-based access (owner vs player)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project

### Environment Setup

Create `.env.local`:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini AI (Server-side only - never use NEXT_PUBLIC_ prefix for API keys)
GOOGLE_API_KEY=your_google_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize project
firebase init

# Deploy
npx firebase deploy
```

This single command deploys:
1.  **Cloud Functions**: The auto-resolve scheduler.
2.  **Hosting**: The Next.js application (SSR + Static).

### Cloud Functions Setup

The project uses a native Firebase Cloud Function for background tasks.

**Configuration:**
- Source: `functions/` directory.
- Secrets: Uses Firebase Secret Manager (`GOOGLE_API_KEY`).
- Runtime: Node.js 20.

If you need to deploy *only* the functions:
```bash
npx firebase deploy --only functions
```

## 📖 Usage Guide

### Creating a League
1. Click "+ New League" from dashboard
2. Choose mode (For Fun / Zero Sum)
3. Configure buy-in type (if Zero Sum)
4. Set starting points
5. Invite members

### Creating a Bet
1. Open league (must be owner)
2. Click "+ New Bet"
3. Select bet type (MATCH/CHOICE/RANGE)
4. Set question and options
5. Configure close date and event date
6. Publish

### Resolving a Bet
1. **Option 1 - AI Resolve:**
   - Click "🤖 AI Resolve"
   - Review auto-filled result
   - Confirm

2. **Option 2 - Manual:**
   - Enter result manually
   - Click "Confirm & Payout"

3. **Proofing Period:**
   - 48-hour dispute window
   - Players can dispute
   - Democratic voting if disputed

### Placing a Wager
1. View open bet
2. Select prediction
3. Enter amount
4. Confirm (All-In modal if betting everything)
5. Track in "Your Active Bets"

## 🎮 Bet Lifecycle

```
DRAFT → OPEN → LOCKED → PROOFING → DISPUTED? → RESOLVED/INVALID
  ↓       ↓       ↓         ↓           ↓              ↓
Create  Wager  Close   AI/Manual   Vote(if)      Payout/Refund
              Period   Resolve     Disputed
```

## 📊 Bet Status States

| Status | Description | Player Actions | Owner Actions |
|--------|-------------|----------------|---------------|
| DRAFT | Being created | None | Edit, Publish |
| OPEN | Accepting wagers | Place wagers | Cancel |
| LOCKED | Closed for wagering | View | Resolve |
| PROOFING | Dispute period | Dispute | Wait/Respond |
| DISPUTED | Under vote | Vote | Check votes, Mark invalid |
| RESOLVED | Finalized | View winnings | None |
| INVALID | Refunded | Receive refund | None |

## 🔄 Wager Status States

- **PENDING**: Bet not yet resolved
- **WON**: Won the bet, payout received
- **LOST**: Lost the bet
- **PUSH**: Tie/refund (invalid bets)

## 📈 Analytics & Stats

### Dashboard Metrics
- Active bets count
- Pending results
- Won/lost tracking
- Total to resolve (owners)

### League Stats
- Member rankings
- Points leaderboard
- ROI calculations
- Open bet counts
- Potential win/loss

## 🆘 Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

**Firebase Connection:**
- Check environment variables
- Verify Firebase config
- Check security rules

**AI Not Working:**
- Verify GOOGLE_API_KEY is set in `.env.local` (for Next.js) or Firebase Secret Manager (for Cloud Functions)
- Check API quota
- Review error messages

## 🤝 Contributing

This is a private project. For collaborators:

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit for review

## 📜 License

Private project - All rights reserved

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Firebase for backend infrastructure
- Google for Gemini AI
- The betting community for inspiration

## 📞 Support

For issues or questions, contact the development team.

---

**Built with ❤️ by the GambleGang team**

**Version**: 1.0.0  
**Last Updated**: December 2025
