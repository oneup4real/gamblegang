
const fs = require('fs');
const path = require('path');

const LEAGUES = [
    { sport: 'basketball', league: 'nba' },
    { sport: 'football', league: 'nfl' },
    { sport: 'baseball', league: 'mlb' },
    { sport: 'hockey', league: 'nhl' },
    { sport: 'hockey', league: 'sui.1' }, // Swiss National League
    { sport: 'hockey', league: 'ger.1' }, // DEL (German Ice Hockey League)
    { sport: 'soccer', league: 'eng.1' }, // EPL
    { sport: 'soccer', league: 'usa.1' }, // MLS
    { sport: 'soccer', league: 'esp.1' }, // La Liga
    { sport: 'soccer', league: 'ger.1' }, // Bundesliga
    { sport: 'soccer', league: 'ita.1' }, // Serie A
    { sport: 'soccer', league: 'fra.1' }, // Ligue 1
    { sport: 'soccer', league: 'uefa.champions' }, // UCL
    { sport: 'soccer', league: 'sui.1' }, // Swiss Super League
    { sport: 'soccer', league: 'sui.2' }, // Swiss Challenge League
    { sport: 'soccer', league: 'ger.2' }, // German 2. Bundesliga
];

async function fetchTeams() {
    const allTeams = {};

    for (const { sport, league } of LEAGUES) {
        console.log(`Fetching ${league.toUpperCase()}...`);
        try {
            const url = `http://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams?limit=1000`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.sports && data.sports[0].leagues && data.sports[0].leagues[0].teams) {
                const teams = data.sports[0].leagues[0].teams;
                teams.forEach(t => {
                    const team = t.team;
                    // Map by full name, display name, abbreviation, etc.
                    // normalize keys to lowercase for easy lookup
                    if (team.displayName) allTeams[team.displayName.toLowerCase()] = team.logos?.[0]?.href;
                    if (team.name) allTeams[team.name.toLowerCase()] = team.logos?.[0]?.href;
                    if (team.abbreviation) allTeams[team.abbreviation.toLowerCase()] = team.logos?.[0]?.href;
                    // Handle location + name (e.g. "Los Angeles" + "Lakers")
                    if (team.shortDisplayName) allTeams[team.shortDisplayName.toLowerCase()] = team.logos?.[0]?.href;
                });
            }
        } catch (err) {
            console.error(`Failed to fetch ${league}:`, err.message);
        }
    }

    const outputPath = path.join(__dirname, '../src/lib/data/team-logos.json');
    fs.writeFileSync(outputPath, JSON.stringify(allTeams, null, 2));
    console.log(`Saved ${Object.keys(allTeams).length} team logos to ${outputPath}`);
}

fetchTeams();
