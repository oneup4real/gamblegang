# TheSportsDB API Integration Setup

## Overview
TheSportsDB provides real-time sports data for automatic bet resolution. This integration replaces AI-based resolution for MATCH type bets with actual sports API data.

## API Key Setup

### Free Tier (Limited)
The free API key (`"3"`) has significant limitations:
- ❌ Does NOT include NBA games
- ❌ Limited to select college sports only
- ✅ Good for testing the integration

### Premium Tier (Recommended)
To get reliable NBA data, you need a premium API key:

1. **Sign up at**: https://www.thesportsdb.com/
2. **Become a Patreon supporter**: https://www.patreon.com/thesportsdb
3. **Get your API key** from your account
4. **Add to environment variables**:
   ```bash
   SPORTS_DB_API_KEY=your_premium_key_here
   ```

### Pricing
- **Free**: Very limited, no NBA
- **Premium**: ~$3-5/month via Patreon
  - Full NBA coverage
  - Real-time scores
  - Historical data
  - Higher rate limits

## Configuration

Add to your `.env.local` file:
```bash
# TheSportsDB API Key (Premium required for NBA)
SPORTS_DB_API_KEY=your_api_key_here
```

If no key is set, the system will fall back to the free tier key "3" which has very limited data.

## Integration Points

### 1. `/src/app/actions/ai-bet-actions.ts`
- `aiAutoResolveBet()` - Main function that now uses TheSportsDB for MATCH bets
- `resolveMatchBetWithSportsDB()` - Helper function that calls the API

### 2. `/src/lib/services/sports-data-service.ts`
- `findGameResult()` - Searches for game results by teams and date
- `findTeamByName()` - Looks up team IDs
- `getTeamPastEvents()` - Fetches recent games for a team

## Usage

The integration automatically kicks in when:
1. User clicks "AI Auto-Resolve" on a MATCH type bet
2. The bet has `matchDetails` with `homeTeam`, `awayTeam`, and `date`
3. TheSportsDB API is called to find the actual result

### Example Flow:
```
User Action: Click "🤖 Auto-Fill" in bet resolution UI
     ↓
aiAutoResolveBet(bet) called
     ↓
Checks bet.type === "MATCH"
     ↓
resolveMatchBetWithSportsDB(bet) called
     ↓
TheSportsDB API: Search for team
     ↓
TheSportsDB API: Get recent events for team
     ↓
Find matching game by date and opponent
     ↓
Extract scores and return
     ↓
UI auto-fills the score inputs
```

## Testing

### Test the API directly:
```bash
node test-sportsdb.js
```

### Test with your bet data:
The system will automatically use TheSportsDB when you click the Auto-Fill button on a match bet.

## Limitations & Fallbacks

### With Free API Key:
- ❌ NBA games not available
- ✅ System falls back to manual entry
- ✅ Shows "AI couldn't determine the result" message

### With Premium API Key:
- ✅ Full NBA coverage
- ✅ Automatic score resolution
- ✅ Real-time and historical data

### If API Fails:
- System returns `null`
- User sees: "AI couldn't determine the result. Please enter manually."
- Manual entry is still available

## Alternative: Use Different Sports API

If TheSportsDB doesn't meet your needs, consider:

1. **ESPN API** (unofficial, may change)
2. **API-Sports** (https://api-sports.io/) - Has NBA, ~$10/month
3. **SportsData.io** - Professional tier, more expensive
4. **The Odds API** - Betting-focused, includes scores

## Next Steps

1. ✅ Sign up for TheSportsDB Patreon
2. ✅ Get your premium API key  
3. ✅ Add `SPORTS_DB_API_KEY` to `.env.local`
4. ✅ Test with a recent NBA game
5. ✅ Verify auto-resolution works in the app

## Support

- TheSportsDB Documentation: https://www.thesportsdb.com/api.php
- Patreon Support: https://www.patreon.com/thesportsdb
- API Issues: Check console logs for detailed error messages
