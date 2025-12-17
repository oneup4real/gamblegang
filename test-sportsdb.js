/**
 * Test script for TheSportsDB API integration
 * This will test if we can fetch real game results from TheSportsDB
 */

const SPORTSDB_API_KEY = process.env.SPORTS_DB_API_KEY || "3"; // Free tier
const SPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json";

async function testSportsDB() {
    console.log("🏀 Testing TheSportsDB API Integration\n");
    console.log("=".repeat(60));

    // Test parameters for Knicks vs Nets game on Nov 15, 2024
    const homeTeam = "New York Knicks";
    const awayTeam = "Brooklyn Nets";
    const gameDate = new Date("2024-11-15");
    const year = gameDate.getFullYear();
    const month = (gameDate.getMonth() + 1).toString().padStart(2, '0');
    const day = gameDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    console.log("\n📋 Test Parameters:");
    console.log(`   Home Team: ${homeTeam}`);
    console.log(`   Away Team: ${awayTeam}`);
    console.log(`   Game Date: ${formattedDate}`);
    console.log(`   API Key: ${SPORTSDB_API_KEY}\n`);
    console.log("=".repeat(60));

    try {
        // Step 1: Try to get events for a specific date
        console.log("\n🔍 Step 1: Fetching all events on", formattedDate);
        const url = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/eventsday.php?d=${formattedDate}`;
        console.log("   URL:", url);

        const response = await fetch(url);
        const data = await response.json();

        if (!data.events || data.events.length === 0) {
            console.log("\n⚠️  No events found on this date");
            console.log("   This could mean:");
            console.log("   - The free API key has limited sports/dates");
            console.log("   - The date might not have NBA games");
            console.log("   - The event data isn't available for this date\n");

            // Try searching for the team instead
            console.log("🔍 Step 2: Trying to search for team:", homeTeam);
            const teamSearchUrl = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(homeTeam)}`;
            console.log("   URL:", teamSearchUrl);

            const teamResponse = await fetch(teamSearchUrl);
            const teamData = await teamResponse.json();

            if (teamData.teams && teamData.teams.length > 0) {
                const team = teamData.teams[0];
                console.log("\n✅ Team found!");
                console.log("   Team ID:", team.idTeam);
                console.log("   Team Name:", team.strTeam);
                console.log("   League:", team.strLeague);

                // Try to get recent events for this team
                console.log("\n🔍 Step 3: Fetching recent past events for team ID:", team.idTeam);
                const eventsUrl = `${SPORTSDB_BASE_URL}/${SPORTSDB_API_KEY}/eventslast.php?id=${team.idTeam}`;
                console.log("   URL:", eventsUrl);

                const eventsResponse = await fetch(eventsUrl);
                const eventsData = await eventsResponse.json();

                if (eventsData.results && eventsData.results.length > 0) {
                    console.log(`\n✅ Found ${eventsData.results.length} recent events:`);

                    // Look for our specific game
                    const targetGame = eventsData.results.find((event) => {
                        const eventDate = event.dateEvent;
                        const isDateMatch = eventDate === formattedDate ||
                            Math.abs((new Date(eventDate).getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24)) <= 1;
                        const isAwayMatch = event.strAwayTeam?.toLowerCase().includes(awayTeam.toLowerCase().split(' ')[0]);
                        return isDateMatch && isAwayMatch;
                    });

                    if (targetGame) {
                        console.log("\n🎯 FOUND THE GAME!");
                        console.log("   Event:", targetGame.strEvent);
                        console.log("   Date:", targetGame.dateEvent);
                        console.log("   Home Team:", targetGame.strHomeTeam);
                        console.log("   Away Team:", targetGame.strAwayTeam);
                        console.log("   Home Score:", targetGame.intHomeScore);
                        console.log("   Away Score:", targetGame.intAwayScore);
                        console.log("   Status:", targetGame.strStatus);

                        if (targetGame.intHomeScore && targetGame.intAwayScore) {
                            console.log("\n✅ SCORE VERIFIED:");
                            console.log(`   ${targetGame.strHomeTeam}: ${targetGame.intHomeScore}`);
                            console.log(`   ${targetGame.strAwayTeam}: ${targetGame.intAwayScore}`);

                            if (targetGame.intHomeScore === "124" && targetGame.intAwayScore === "122") {
                                console.log("\n🎉 SUCCESS! Score matches the expected result!");
                            }
                        } else {
                            console.log("\n⚠️  Game found but scores are not available");
                        }
                    } else {
                        console.log("\n⚠️  Could not find the specific game in recent events");
                        console.log("\n   Recent events for debugging:");
                        eventsData.results.slice(0, 5).forEach((event, i) => {
                            console.log(`\n   ${i + 1}. ${event.strEvent}`);
                            console.log(`      Date: ${event.dateEvent}`);
                            console.log(`      Score: ${event.intHomeScore} - ${event.intAwayScore}`);
                        });
                    }
                } else {
                    console.log("\n⚠️  No past events found for this team");
                }
            } else {
                console.log("\n❌ Team not found");
            }
        } else {
            console.log(`\n✅ Found ${data.events.length} events on this date`);

            // Filter for our specific game
            const nbaEvents = data.events.filter(e => e.strLeague?.includes("NBA"));
            console.log(`   NBA Events: ${nbaEvents.length}`);

            const targetGame = data.events.find(e =>
                (e.strHomeTeam?.includes("Knicks") && e.strAwayTeam?.includes("Nets")) ||
                (e.strHomeTeam?.includes("Nets") && e.strAwayTeam?.includes("Knicks"))
            );

            if (targetGame) {
                console.log("\n🎯 FOUND THE GAME!");
                console.log("   Event:", targetGame.strEvent);
                console.log("   Home Team:", targetGame.strHomeTeam);
                console.log("   Away Team:", targetGame.strAwayTeam);
                console.log("   Home Score:", targetGame.intHomeScore);
                console.log("   Away Score:", targetGame.intAwayScore);
                console.log("   Status:", targetGame.strStatus);
            } else {
                console.log("\n⚠️  Knicks vs Nets game not found on this date");
                console.log("   Sample events:");
                data.events.slice(0, 3).forEach((e, i) => {
                    console.log(`\n   ${i + 1}. ${e.strEvent} (${e.strLeague})`);
                });
            }
        }

    } catch (error) {
        console.error("\n❌ Error testing TheSportsDB:");
        console.error(error);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n💡 Notes:");
    console.log("   - Free API key (3) has limitations");
    console.log("   - Premium API key provides more data and features");
    console.log("   - You can sign up at: https://www.thesportsdb.com/");
    console.log("\n");
}

// Run the test
testSportsDB();
