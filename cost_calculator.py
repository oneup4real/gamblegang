def calculate_cost(users, bets_per_month, participation_rate=0.5):
    # Constants (Pricing in USD -> convert to CHF approx 0.9)
    # Using USD for base calculation then converting
    # Firestore
    PRICE_READ_100K = 0.06
    PRICE_WRITE_100K = 0.18
    PRICE_DELETE_100K = 0.02
    
    # Cloud Functions
    PRICE_INVOKE_1M = 0.40
    PRICE_GBSEC = 0.000016667
    
    # Fixed Costs (Monthly CHF)
    FIXED_COST_CHF = (25 + 10.9) / 12  # Google Play + Apple
    
    # --- Assumptions ---
    # User Behavior
    DAILY_OPENS = 4
    READS_PER_OPEN = 15  # Dashboard, Leagues, etc.
    
    # Bet Lifecycle
    # 1. Creation
    # 2. Browsing (Reads by users)
    # 3. Wagers (Writes by users, Updates to bet)
    # 4. Live Updates (Cloud Function writes/reads)
    # 5. Resolution (Writes/Reads)
    
    # 1 User Activity
    user_reads_mo = users * DAILY_OPENS * READS_PER_OPEN * 30
    
    # 2 Wagers
    # Avg wagers per bet = users * participation_rate (capped maybe? let's say max 20 for small groups, or 50% for large)
    wagers_per_bet = users * participation_rate
    
    # 3 System/Bet Activity
    # Live Updates: Every 2 mins for 2 hours = 60 updates
    # Reads: 60 (by Cron) + User refreshes (let's say 1 per minute per wagering user during game? expensive!)
    # Let's assume users just watch the score update quietly or pull-to-refresh occasionally.
    # Firestore Realtime listeners charge 1 read per change per connected client.
    # If 10 users are watching a live bet for 2 hours, and it updates 60 times:
    # 10 * 60 = 600 reads per bet.
    
    live_updates_writes = 60 # System updates bet doc
    live_updates_reads_system = 60 # System reads bet doc
    live_updates_reads_users = wagers_per_bet * 60 # Users watching live
    
    # Resolution
    resolution_writes = 1 + (wagers_per_bet * 2) # Bet status + Member stats + Notifications
    resolution_reads = wagers_per_bet * 2 # Notification fan-out checks
    
    # Total Operations
    total_reads = user_reads_mo + (bets_per_month * (live_updates_reads_system + live_updates_reads_users + resolution_reads))
    total_writes = (bets_per_month * (1 + (wagers_per_bet * 3) + live_updates_writes + resolution_writes))
    
    # Calc Firestore Cost
    cost_reads = (total_reads / 100000) * PRICE_READ_100K
    cost_writes = (total_writes / 100000) * PRICE_WRITE_100K
    
    # Cloud Functions (Fixed Schedule + Processing)
    # Fixed Invocations
    invocations = (43200 + 21600 + 2880) # lock, live, resolve
    # Processing: Assume minimal base, scales slightly with bets. Negligible for cost compared to firestore usually unless heavy compute.
    cost_functions = (invocations / 1000000) * PRICE_INVOKE_1M
    
    total_variable_usd = cost_reads + cost_writes + cost_functions
    total_variable_chf = total_variable_usd * 0.90
    
    total_monthly_chf = FIXED_COST_CHF + total_variable_chf
    
    cost_per_user = total_monthly_chf / users if users > 0 else 0
    
    return {
        "Users": users,
        "Bets": bets_per_month,
        "Reads (M)": total_reads / 1_000_000,
        "Writes (M)": total_writes / 1_000_000,
        "Var Cost (CHF)": total_variable_chf,
        "Fixed Cost (CHF)": FIXED_COST_CHF,
        "Total (CHF)": total_monthly_chf,
        "Per User (CHF)": cost_per_user
    }

print("| Users | Bets/Mo | Avg Wagers | Reads (M) | Writes (M) | Total Cost (CHF) | Cost/User (CHF) |")
print("|-------|---------|------------|-----------|------------|------------------|-----------------|")

scenarios = [
    (10, 20),
    (50, 50),
    (100, 100),
    (500, 200),
    (1000, 400),
    (5000, 1000)
]

for u, b in scenarios:
    res = calculate_cost(u, b, participation_rate=0.5)
    print(f"| {res['Users']} | {res['Bets']} | {u*0.5:.0f} | {res['Reads (M)']:.2f} | {res['Writes (M)']:.2f} | {res['Total (CHF)']:.2f} | {res['Per User (CHF)']:.2f} |")

