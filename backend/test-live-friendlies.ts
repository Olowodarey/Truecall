/**
 * Test Live International Friendlies
 * Check for matches happening TODAY
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const FRIENDLIES_ID = 10;
const SEASON = 2026;

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'x-apisports-key': API_KEY },
  timeout: 30000,
});

async function checkLiveFriendlies() {
  console.log('\n🔴 LIVE International Friendlies Check');
  console.log('═══════════════════════════════════════\n');

  try {
    const today = new Date().toISOString().split('T')[0];

    console.log(`📅 Checking matches for TODAY: ${today}`);
    console.log();

    const response = await client.get('/fixtures', {
      params: {
        league: FRIENDLIES_ID,
        season: SEASON,
        date: today,
      },
    });

    const matches = response.data.response;

    console.log(`✅ API Call Made: 1/100`);
    console.log(`📊 Total Matches Today: ${matches.length}`);
    console.log();

    if (matches.length === 0) {
      console.log('⚠️  No matches found for today');
      console.log(
        '💡 Tip: International Friendlies are typically scheduled on FIFA match days',
      );
      return [];
    }

    // Group by status
    const byStatus: any = {};
    matches.forEach((match: any) => {
      const status = match.fixture.status.short;
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(match);
    });

    console.log('📋 Matches by Status:');
    Object.keys(byStatus).forEach((status) => {
      const statusName =
        {
          NS: 'Not Started',
          LIVE: 'Live',
          '1H': 'First Half',
          HT: 'Half Time',
          '2H': 'Second Half',
          FT: 'Full Time',
          PST: 'Postponed',
          CANC: 'Cancelled',
        }[status] || status;

      console.log(
        `\n   ${statusName} (${status}): ${byStatus[status].length} matches`,
      );

      byStatus[status].slice(0, 3).forEach((match: any, idx: number) => {
        const homeScore = match.goals.home !== null ? match.goals.home : '-';
        const awayScore = match.goals.away !== null ? match.goals.away : '-';
        const time = new Date(match.fixture.timestamp * 1000);

        console.log(
          `      ${idx + 1}. ${match.teams.home.name} ${homeScore} - ${awayScore} ${match.teams.away.name}`,
        );
        console.log(`         Time: ${time.toLocaleTimeString()}`);
        console.log(`         Venue: ${match.fixture.venue.name || 'TBD'}`);
      });
    });

    console.log();
    return matches;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error(
        '   Message:',
        error.response.data?.message || error.response.data,
      );
    }
    return [];
  }
}

async function checkTodayAllLeagues() {
  console.log("\n\n🌍 Checking TODAY's Matches (All Competitions)");
  console.log('═══════════════════════════════════════\n');

  try {
    const today = new Date().toISOString().split('T')[0];

    console.log(`📅 Date: ${today}`);
    console.log(`💡 This will show what matches API-Football has for today`);
    console.log();

    // Get today's matches across all leagues
    const response = await client.get('/fixtures', {
      params: {
        date: today,
      },
    });

    const allMatches = response.data.response;

    console.log(`✅ API Call Made: 1/100`);
    console.log(
      `📊 Total Matches TODAY (all competitions): ${allMatches.length}`,
    );
    console.log();

    // Group by league
    const byLeague: any = {};
    allMatches.forEach((match: any) => {
      const league = match.league.name;
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(match);
    });

    console.log(`🏆 Top 10 Leagues with matches today:`);
    const topLeagues = Object.entries(byLeague)
      .sort(([, a]: any, [, b]: any) => b.length - a.length)
      .slice(0, 10);

    topLeagues.forEach(([league, matches]: any, idx) => {
      console.log(`   ${idx + 1}. ${league}: ${matches.length} matches`);
    });

    console.log();
    return allMatches;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function checkLiveNow() {
  console.log('\n\n🔴 LIVE Matches Right NOW');
  console.log('═══════════════════════════════════════\n');

  try {
    const response = await client.get('/fixtures', {
      params: {
        live: 'all', // All live matches
      },
    });

    const liveMatches = response.data.response;

    console.log(`✅ API Call Made: 1/100`);
    console.log(`📊 Live Matches Now: ${liveMatches.length}`);
    console.log();

    if (liveMatches.length === 0) {
      console.log('⚠️  No live matches at this moment');
      console.log('💡 This is normal - matches happen during specific hours');
      return [];
    }

    console.log('🔴 Live Matches:');
    liveMatches.slice(0, 10).forEach((match: any, idx: number) => {
      console.log(
        `\n   ${idx + 1}. ${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name}`,
      );
      console.log(`      League: ${match.league.name}`);
      console.log(
        `      Status: ${match.fixture.status.long} ${match.fixture.status.elapsed ? `(${match.fixture.status.elapsed}')` : ''}`,
      );
    });

    console.log();
    return liveMatches;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  Live Friendlies Test                 ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log();
  console.log(`🔑 API Key: ${API_KEY?.substring(0, 8)}...`);
  console.log(`📅 Current Time: ${new Date().toLocaleString()}`);
  console.log();

  let apiCalls = 0;

  // Test 1: Today's Friendlies
  const friendlies = await checkLiveFriendlies();
  apiCalls += 1;

  // Test 2: All matches today
  const allMatches = await checkTodayAllLeagues();
  apiCalls += 1;

  // Test 3: Live right now
  const liveNow = await checkLiveNow();
  apiCalls += 1;

  // Summary
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  Summary                              ║');
  console.log('╚═══════════════════════════════════════╝\n');

  console.log(
    `📊 API Calls Used: ${apiCalls}/100 (${100 - apiCalls} remaining)`,
  );
  console.log(`📈 Matches Found:`);
  console.log(`   International Friendlies Today: ${friendlies.length}`);
  console.log(`   All Matches Today: ${allMatches.length}`);
  console.log(`   Live Right Now: ${liveNow.length}`);
  console.log();

  if (friendlies.length > 0 || liveNow.length > 0) {
    console.log('✅ Great! We have matches to work with!');
    console.log('💡 Our system will:');
    console.log('   1. Sync these to database every 2 hours');
    console.log('   2. Update finished matches every 1 hour');
    console.log('   3. Serve all requests from database (0 API calls)');
  } else {
    console.log('💡 No matches right now, but our system is ready!');
    console.log('   When matches are scheduled, cron will auto-sync them');
  }

  console.log('\n🎉 Test Complete!\n');
}

main().catch(console.error);
