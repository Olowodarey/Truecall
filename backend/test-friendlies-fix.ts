/**
 * Debug Friendlies - Find the correct way to fetch them
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'x-apisports-key': API_KEY },
  timeout: 30000,
});

async function testDifferentApproaches() {
  console.log('\n🔍 Testing Different Approaches to Get Friendlies');
  console.log('═══════════════════════════════════════════════\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today: ${today}\n`);

  // Approach 1: League ID with season
  console.log('1️⃣  Approach: league=10, season=2026');
  try {
    const res1 = await client.get('/fixtures', {
      params: { league: 10, season: 2026, date: today },
    });
    console.log(`   Result: ${res1.data.results} matches`);
  } catch (error: any) {
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
  }

  // Approach 2: League ID without season
  console.log('\n2️⃣  Approach: league=10, NO season');
  try {
    const res2 = await client.get('/fixtures', {
      params: { league: 10, date: today },
    });
    console.log(`   Result: ${res2.data.results} matches`);
  } catch (error: any) {
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
  }

  // Approach 3: Just date, then filter
  console.log('\n3️⃣  Approach: Get all today, filter "Friendlies"');
  try {
    const res3 = await client.get('/fixtures', {
      params: { date: today },
    });

    const allMatches = res3.data.response;
    const friendlies = allMatches.filter((m: any) =>
      m.league.name.toLowerCase().includes('friend'),
    );

    console.log(`   Total matches today: ${allMatches.length}`);
    console.log(`   Friendlies found: ${friendlies.length}`);

    if (friendlies.length > 0) {
      console.log('\n   📋 Sample Friendlies:');
      friendlies.slice(0, 5).forEach((match: any, idx: number) => {
        console.log(
          `\n      ${idx + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`,
        );
        console.log(
          `         League: ${match.league.name} (ID: ${match.league.id})`,
        );
        console.log(`         Season: ${match.league.season}`);
        console.log(`         Status: ${match.fixture.status.short}`);
        console.log(
          `         Time: ${new Date(match.fixture.timestamp * 1000).toLocaleString()}`,
        );
      });

      // Extract unique league IDs
      const leagueIds = new Set(friendlies.map((m: any) => m.league.id));
      const leagueNames = new Set(friendlies.map((m: any) => m.league.name));

      console.log(
        `\n   🔑 Unique League IDs found: ${Array.from(leagueIds).join(', ')}`,
      );
      console.log(
        `   📝 Unique League Names: ${Array.from(leagueNames).join(', ')}`,
      );
    }

    return friendlies;
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
    return [];
  }
}

async function testNextWeek() {
  console.log('\n\n📅 Testing Next 7 Days (More likely to have friendlies)');
  console.log('═══════════════════════════════════════════════\n');

  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const from = today.toISOString().split('T')[0];
    const to = nextWeek.toISOString().split('T')[0];

    console.log(`📅 From: ${from}`);
    console.log(`📅 To: ${to}\n`);

    const response = await client.get('/fixtures', {
      params: { from, to },
    });

    const allMatches = response.data.response;
    const friendlies = allMatches.filter((m: any) =>
      m.league.name.toLowerCase().includes('friend'),
    );

    console.log(`📊 Results:`);
    console.log(`   Total matches (7 days): ${allMatches.length}`);
    console.log(`   Friendlies: ${friendlies.length}`);

    if (friendlies.length > 0) {
      // Group by date
      const byDate: any = {};
      friendlies.forEach((match: any) => {
        const date = new Date(
          match.fixture.timestamp * 1000,
        ).toLocaleDateString();
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(match);
      });

      console.log(`\n   📅 Friendlies by Date:`);
      Object.entries(byDate).forEach(([date, matches]: any) => {
        console.log(`      ${date}: ${matches.length} matches`);
      });
    }

    return friendlies;
  } catch (error: any) {
    console.log(`   Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  Friendlies Debug Test                    ║');
  console.log('╚═══════════════════════════════════════════╝');

  const todayFriendlies = await testDifferentApproaches();
  const weekFriendlies = await testNextWeek();

  console.log('\n\n╔═══════════════════════════════════════════╗');
  console.log('║  Recommendation                           ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  if (todayFriendlies.length > 0 || weekFriendlies.length > 0) {
    console.log('✅ SOLUTION: Fetch all matches, then filter by league name');
    console.log(
      '💡 Reason: League ID approach not working, but filtering works!',
    );
    console.log();
    console.log('📝 Implementation:');
    console.log('   1. Fetch: /fixtures?date=YYYY-MM-DD');
    console.log('   2. Filter: matches where league.name includes "Friend"');
    console.log('   3. Store in database');
    console.log();
    console.log('📊 API Efficiency:');
    console.log('   - 1 call gets ALL matches for a day (~400-600 matches)');
    console.log('   - Extract World Cup + Friendlies from same response');
    console.log('   - BETTER: Only 1 API call instead of 2!');
  } else {
    console.log('⚠️  No friendlies found in test period');
    console.log(
      '💡 This might be normal - friendlies are scheduled sporadically',
    );
  }

  console.log('\n🎉 Debug Complete!\n');
}

main().catch(console.error);
