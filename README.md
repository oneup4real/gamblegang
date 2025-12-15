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
  - Auto-resolve functionality

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

# Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key
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
firebase deploy
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
- Verify GEMINI_API_KEY is set
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
