/**
 * Update Team Logos Script
 * Fetches team logos from ESPN and TheSportsDB V2 API
 * 
 * Run with: node scripts/update-team-logos.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// TheSportsDB V2 API - key goes in headers
const SPORTS_DB_API_KEY = process.env.SPORTS_DB_API_KEY || "3";
const SPORTS_DB_BASE_URL = "https://www.thesportsdb.com/api/v2/json";

// ESPN Leagues to fetch
const ESPN_LEAGUES = [
    { sport: 'basketball', league: 'nba' },
    { sport: 'football', league: 'nfl' },
    { sport: 'baseball', league: 'mlb' },
    { sport: 'hockey', league: 'nhl' },
    { sport: 'soccer', league: 'eng.1' }, // EPL
    { sport: 'soccer', league: 'usa.1' }, // MLS
    { sport: 'soccer', league: 'esp.1' }, // La Liga
    { sport: 'soccer', league: 'ger.1' }, // Bundesliga
    { sport: 'soccer', league: 'ita.1' }, // Serie A
    { sport: 'soccer', league: 'fra.1' }, // Ligue 1
    { sport: 'soccer', league: 'uefa.champions' }, // UCL
    { sport: 'soccer', league: 'sui.1' }, // Swiss Super League (soccer)
    { sport: 'soccer', league: 'sui.2' }, // Swiss Challenge League
    { sport: 'soccer', league: 'ger.2' }, // German 2. Bundesliga
];

// TheSportsDB League IDs (V2 uses /list/teams/{leagueId})
const SPORTSDB_LEAGUES = [
    // Ice Hockey - Switzerland
    { id: '4934', name: 'Swiss National League' },
    { id: '5163', name: 'Swiss League' },
    // Ice Hockey - Germany
    { id: '4925', name: 'German DEL' },
    { id: '4936', name: 'German DEL 2' },
    // Ice Hockey - Other European
    { id: '4931', name: 'Finnish Liiga' },
    { id: '4419', name: 'Swedish Hockey League' },
    { id: '4923', name: 'Czech Extraliga' },
    { id: '4933', name: 'Austrian ICE Hockey League' },
    { id: '4920', name: 'Russian KHL' },
    // Champions Hockey League
    { id: '5277', name: 'Champions Hockey League' },
];

async function fetchFromESPN(allTeams) {
    console.log('\n📺 Fetching from ESPN...\n');

    for (const { sport, league } of ESPN_LEAGUES) {
        console.log(`  ESPN: ${league.toUpperCase()}...`);
        try {
            const url = `http://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams?limit=1000`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.sports && data.sports[0].leagues && data.sports[0].leagues[0].teams) {
                const teams = data.sports[0].leagues[0].teams;
                let count = 0;
                teams.forEach(t => {
                    const team = t.team;
                    const logoUrl = team.logos?.[0]?.href;
                    if (!logoUrl) return;

                    if (team.displayName && !allTeams[team.displayName.toLowerCase()]) {
                        allTeams[team.displayName.toLowerCase()] = logoUrl;
                        count++;
                    }
                    if (team.name && !allTeams[team.name.toLowerCase()]) {
                        allTeams[team.name.toLowerCase()] = logoUrl;
                    }
                    if (team.abbreviation && !allTeams[team.abbreviation.toLowerCase()]) {
                        allTeams[team.abbreviation.toLowerCase()] = logoUrl;
                    }
                    if (team.shortDisplayName && !allTeams[team.shortDisplayName.toLowerCase()]) {
                        allTeams[team.shortDisplayName.toLowerCase()] = logoUrl;
                    }
                });
                console.log(`    ✓ Added ${count} teams`);
            }
        } catch (err) {
            console.error(`    ✗ Failed: ${err.message}`);
        }
    }
}

async function fetchFromSportsDB(allTeams) {
    console.log('\n🏒 Fetching from TheSportsDB V2...\n');

    for (const { id, name } of SPORTSDB_LEAGUES) {
        console.log(`  SportsDB: ${name}...`);
        try {
            // V2 API: /list/teams/{leagueId} with X-API-KEY header
            const url = `${SPORTS_DB_BASE_URL}/list/teams/${id}`;
            const res = await fetch(url, {
                headers: {
                    'X-API-KEY': SPORTS_DB_API_KEY
                }
            });

            const text = await res.text();
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                console.log(`    ⚠ API returned HTML error`);
                continue;
            }

            const data = JSON.parse(text);
            // V2 uses 'list' instead of 'teams'
            const teams = data.list || data.teams || [];

            if (teams.length > 0) {
                let count = 0;
                teams.forEach(team => {
                    const logoUrl = team.strBadge || team.strLogo;
                    if (!logoUrl) return;

                    // Add full team name
                    if (team.strTeam && !allTeams[team.strTeam.toLowerCase()]) {
                        allTeams[team.strTeam.toLowerCase()] = logoUrl;
                        count++;
                    }

                    // Add alternate names
                    if (team.strAlternate) {
                        const alternates = team.strAlternate.split(',').map(a => a.trim().toLowerCase());
                        alternates.forEach(alt => {
                            if (alt && alt.length > 1 && !allTeams[alt]) {
                                allTeams[alt] = logoUrl;
                            }
                        });
                    }

                    // Add short name
                    if (team.strTeamShort && !allTeams[team.strTeamShort.toLowerCase()]) {
                        allTeams[team.strTeamShort.toLowerCase()] = logoUrl;
                    }

                    // Extract simpler names
                    const teamName = team.strTeam.toLowerCase();
                    const words = teamName.split(/[\s-]+/);

                    if (words.length > 1) {
                        const lastWord = words[words.length - 1];
                        if (lastWord.length > 2 && !allTeams[lastWord]) {
                            allTeams[lastWord] = logoUrl;
                        }
                    }

                    // Remove common prefixes (hc, sc, ehc, ev, fc)
                    const prefixes = ['hc', 'sc', 'ehc', 'ev', 'fc', 'ef'];
                    if (prefixes.includes(words[0]) && words.length > 1) {
                        const withoutPrefix = words.slice(1).join(' ');
                        if (!allTeams[withoutPrefix]) {
                            allTeams[withoutPrefix] = logoUrl;
                        }
                    }
                });
                console.log(`    ✓ Added ${count} teams`);
            } else {
                console.log(`    ⚠ No teams found`);
            }
        } catch (err) {
            console.error(`    ✗ Failed: ${err.message}`);
        }
    }
}

// Manual teams for edge cases (national teams, etc.)
function addManualTeams(allTeams) {
    console.log('\n🌍 Adding manual/special teams...\n');

    const manualTeams = {
        // Team Canada (Hockey) - not in regular leagues
        "team canada": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Hockey_Canada_Logo.svg/200px-Hockey_Canada_Logo.svg.png",
        "canada": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Hockey_Canada_Logo.svg/200px-Hockey_Canada_Logo.svg.png",
        "team canada hockey": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Hockey_Canada_Logo.svg/200px-Hockey_Canada_Logo.svg.png",

        // Spengler Cup logo
        "spengler cup": "https://upload.wikimedia.org/wikipedia/de/thumb/e/e7/Spengler_Cup_Logo.svg/200px-Spengler_Cup_Logo.svg.png",
    };

    let count = 0;
    for (const [key, url] of Object.entries(manualTeams)) {
        if (!allTeams[key]) {
            allTeams[key] = url;
            count++;
        }
    }
    console.log(`  ✓ Added ${count} manual teams`);
}

async function fetchTeams() {
    console.log('🚀 Starting team logos update (using TheSportsDB V2 API)...');
    console.log(`   API key: ${SPORTS_DB_API_KEY.substring(0, 3)}...`);

    const allTeams = {};

    // Fetch from all sources
    await fetchFromESPN(allTeams);
    await fetchFromSportsDB(allTeams);
    addManualTeams(allTeams);

    // Sort alphabetically
    const sortedTeams = Object.keys(allTeams)
        .sort()
        .reduce((obj, key) => {
            obj[key] = allTeams[key];
            return obj;
        }, {});

    const outputPath = path.join(__dirname, '../src/lib/data/team-logos.json');
    fs.writeFileSync(outputPath, JSON.stringify(sortedTeams, null, 2));

    console.log(`\n✅ Saved ${Object.keys(sortedTeams).length} team logos to ${outputPath}`);
}

fetchTeams().catch(console.error);
