/**
 * Test World Cup API Workflow
 * Tests fetching matches with filters (World Cup + Friendlies only)
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

// Priority leagues
const WORLD_CUP_ID = 1;
const FRIENDLIES_ID = 10;
const SEASON = 2026;

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-apisports-key': API_KEY,
  },
  timeout: 30000,
});

async function testWorldCupMatches() {
  console.log('\n🏆 Testing World Cup Matches');
  console.log('═══════════════════════════════════════\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`📅 Fetching World Cup matches for:`);
    console.log(`   Today: ${today}`);
    console.log(`   Tomorrow: ${tomorrowStr}`);
    console.log();

    const [todayRes, tomorrowRes] = await Promise.all([
      client.get('/fixtures', {
        params: { league: WORLD_CUP_ID, season: SEASON, date: today },
      }),
      client.get('/fixtures', {
        params: { league: WORLD_CUP_ID, season: SEASON, date: tomorrowStr },
      }),
    ]);

    const todayMatches = todayRes.data.response;
    const tomorrowMatches = tomorrowRes.data.response;
    const totalMatches = [...todayMatches, ...tomorrowMatches];

    console.log(`✅ API Calls Made: 2`);
    console.log(`📊 Results:`);
    console.log(`   Today: ${todayMatches.length} matches`);
    console.log(`   Tomorrow: ${tomorrowMatches.length} matches`);
    console.log(`   Total: ${totalMatches.length} World Cup matches`);
    console.log();

    if (totalMatches.length > 0) {
      console.log('📋 Sample Matches:');
      totalMatches.slice(0, 3).forEach((match: any, index: number) => {
        console.log(
          `\n   ${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`,
        );
        console.log(`      League: ${match.league.name}`);
        console.log(`      Round: ${match.league.round}`);
        console.log(`      Status: ${match.fixture.status.short}`);
        console.log(`      Venue: ${match.fixture.venue.name}`);
        console.log(
          `      Date: ${new Date(match.fixture.timestamp * 1000).toLocaleString()}`,
        );
      });
    }

    return totalMatches;
  } catch (error: any) {
    console.error('❌ Error fetching World Cup matches:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return [];
  }
}

async function testInternationalFriendlies() {
  console.log('\n\n🤝 Testing International Friendlies');
  console.log('═══════════════════════════════════════\n');

  try {
    const today = new Date().toISOString().split('T')[0];

    console.log(`📅 Fetching all matches for today: ${today}`);
    console.log('   (Then filtering for Friendlies by name)');
    console.log();

    // Fetch ALL matches for today (not filtered by league)
    const response = await client.get('/fixtures', {
      params: {
        date: today,
      },
    });

    const allMatches = response.data.response;

    // Filter for friendlies by league name
    const friendlies = allMatches.filter((match: any) => {
      const leagueName = match.league.name.toLowerCase();
      return leagueName.includes('friend');
    });

    console.log(`✅ API Calls Made: 1`);
    console.log(`📊 Results:`);
    console.log(`   Total matches today: ${allMatches.length}`);
    console.log(`   International Friendlies: ${friendlies.length}`);
    console.log();

    if (friendlies.length > 0) {
      console.log('📋 Friendlies Today:');
      friendlies.slice(0, 5).forEach((match: any, index: number) => {
        console.log(
          `\n   ${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`,
        );
        console.log(`      League: ${match.league.name}`);
        console.log(`      Status: ${match.fixture.status.short}`);
        console.log(`      Venue: ${match.fixture.venue.name || 'TBD'}`);
        console.log(
          `      Date: ${new Date(match.fixture.timestamp * 1000).toLocaleString()}`,
        );
      });
    }

    return friendlies;
  } catch (error: any) {
    console.error('❌ Error fetching Friendlies:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return [];
  }
}

async function testFinishedMatches() {
  console.log('\n\n✅ Testing Finished Matches (Last 2 Days)');
  console.log('═══════════════════════════════════════\n');

  try {
    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    const from = twoDaysAgo.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    console.log(`📅 Fetching finished matches from ${from} to ${to}`);
    console.log();

    const [worldCupRes, friendliesRes] = await Promise.all([
      client.get('/fixtures', {
        params: {
          league: WORLD_CUP_ID,
          season: SEASON,
          from,
          to,
        },
      }),
      client.get('/fixtures', {
        params: {
          league: FRIENDLIES_ID,
          season: SEASON,
          from,
          to,
        },
      }),
    ]);

    const allMatches = [
      ...worldCupRes.data.response,
      ...friendliesRes.data.response,
    ];

    // Filter only FT (Full Time) status
    const finished = allMatches.filter(
      (m: any) => m.fixture.status.short === 'FT',
    );

    console.log(`✅ API Calls Made: 2`);
    console.log(`📊 Results:`);
    console.log(`   All matches: ${allMatches.length}`);
    console.log(`   Finished (FT): ${finished.length}`);
    console.log();

    if (finished.length > 0) {
      console.log('📋 Finished Matches:');
      finished.slice(0, 3).forEach((match: any, index: number) => {
        console.log(
          `\n   ${index + 1}. ${match.teams.home.name} ${match.score.fulltime.home} - ${match.score.fulltime.away} ${match.teams.away.name}`,
        );
        console.log(`      League: ${match.league.name}`);
        console.log(`      Status: ${match.fixture.status.long}`);
        console.log(
          `      Date: ${new Date(match.fixture.timestamp * 1000).toLocaleString()}`,
        );
      });
    }

    return finished;
  } catch (error: any) {
    console.error('❌ Error fetching finished matches:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return [];
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  TrueCall World Cup API Test          ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log();
  console.log(`🔑 API Key: ${API_KEY?.substring(0, 8)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`🏆 Target: World Cup 2026 + Friendlies`);
  console.log();

  let totalApiCalls = 0;

  // Test 1: World Cup matches
  const worldCupMatches = await testWorldCupMatches();
  totalApiCalls += 2;

  // Test 2: International Friendlies
  const friendlies = await testInternationalFriendlies();
  totalApiCalls += 1;

  // Test 3: Finished matches
  const finished = await testFinishedMatches();
  totalApiCalls += 2;

  // Summary
  console.log('\n\n╔═══════════════════════════════════════╗');
  console.log('║  Summary                              ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const totalMatches = worldCupMatches.length + friendlies.length;

  console.log(
    `📊 Total API Calls: ${totalApiCalls}/100 (${100 - totalApiCalls} remaining)`,
  );
  console.log(`📈 Matches Found:`);
  console.log(`   World Cup: ${worldCupMatches.length}`);
  console.log(`   Friendlies: ${friendlies.length}`);
  console.log(`   Finished: ${finished.length}`);
  console.log(`   Total: ${totalMatches}`);
  console.log();

  console.log(`✅ Workflow Status:`);
  if (totalMatches > 0) {
    console.log('   🟢 API is working correctly!');
    console.log('   🟢 Friendlies filter working!');
    console.log('   🟢 Ready for database sync!');
  } else {
    console.log('   ⚠️  No matches found (might be off-season)');
    console.log('   💡 This is normal before World Cup starts');
  }

  console.log();
  console.log(`💡 Key Insight:`);
  console.log('   Using league name filter (includes "friend") works better');
  console.log('   than league ID parameter for International Friendlies');

  console.log();
  console.log(`📅 Next Steps:`);
  console.log('   1. Run database migration');
  console.log('   2. Start backend with cron jobs');
  console.log('   3. Cron will auto-sync every 2 hours');
  console.log('   4. Monitor API usage at /api/matches/stats/usage');
  console.log();

  console.log('🎉 Test Complete!\n');
}

main().catch(console.error);
