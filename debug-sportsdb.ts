
import { fetch } from "undici"; // Or native fetch in Node 18+

const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

async function run() {
    console.log("Searching for Bayer 04 Leverkusen...");
    // Use global fetch
    const teamRes = await globalThis.fetch(`${BASE_URL}/searchteams.php?t=Bayer%2004%20Leverkusen`);
    const teamData = await teamRes.json();
    const teamId = teamData.teams?.[0]?.idTeam;

    if (!teamId) {
        console.log("Team not found");
        return;
    }
    console.log(`Found Team: ${teamData.teams[0].strTeam} (ID: ${teamId})`);

    // Fetch Last 5 Events
    const eventsRes = await globalThis.fetch(`${BASE_URL}/eventslast.php?id=${teamId}`);
    const eventsData = await eventsRes.json();

    // Fetch Next 5 Events
    const nextEventsRes = await globalThis.fetch(`${BASE_URL}/eventsnext.php?id=${teamId}`);
    const nextEventsData = await nextEventsRes.json();

    const allEvents = [...(eventsData.results || []), ...(nextEventsData.events || [])];

    console.log("--- ALL FETCHED EVENTS ---");
    allEvents.forEach(e => console.log(`${e.strHomeTeam} vs ${e.strAwayTeam} (${e.dateEvent}) - ID: ${e.idEvent}`));

    // Find the Leipzig match
    const match = allEvents.find(e =>
        (e.strHomeTeam.includes("Leipzig") || e.strAwayTeam.includes("Leipzig"))
    );

    if (match) {
        console.log("\n--- FOUND MATCH DATA (List View) ---");
        console.log(`Event: ${match.strEvent}`);
        console.log(`Date: ${match.dateEvent} ${match.strTime}`);
        console.log(`Status (strStatus): "${match.strStatus}"`);
        console.log(`Progress (strProgress): "${match.strProgress}"`);
        console.log(`Scores: ${match.intHomeScore} - ${match.intAwayScore}`);

        // Strict Lookup by ID
        console.log(`\n--- FETCHING EXACT EVENT DETAILS (ID: ${match.idEvent}) ---`);
        const liveRes = await globalThis.fetch(`${BASE_URL}/lookupevent.php?id=${match.idEvent}`);
        const liveData = await liveRes.json();
        const liveEvent = liveData.events?.[0];

        if (liveEvent) {
            console.log(JSON.stringify(liveEvent, null, 2));
        } else {
            console.log("No detailed event data found.");
        }
    } else {
        console.log("\nMatch against Leverkusen not found. Recent games:");
        console.log(eventsData.results?.map(e => `${e.strEvent} (${e.dateEvent})`).join("\n"));
    }
}

run();
