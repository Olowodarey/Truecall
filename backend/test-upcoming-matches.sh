#!/bin/bash

echo "=== Testing Upcoming Matches API ==="
echo ""

echo "1. Checking Real-time API Status..."
curl -s "http://localhost:3001/api/matches/realtime/status" | jq '.'
echo ""

echo "2. Fetching upcoming matches..."
MATCHES=$(curl -s "http://localhost:3001/api/matches?upcoming=true")
COUNT=$(echo "$MATCHES" | jq 'length')
echo "Found $COUNT upcoming matches"
echo ""

if [ "$COUNT" -gt 0 ]; then
  echo "3. Sample of first 3 matches:"
  echo "$MATCHES" | jq '.[0:3] | .[] | {id, homeTeam, awayTeam, league, status, kickoffTime}'
  echo ""
  echo "✅ SUCCESS: Upcoming matches are being fetched from API-Football!"
else
  echo "❌ ISSUE: No upcoming matches found"
  echo ""
  echo "Checking today's matches:"
  TODAY=$(date +%Y-%m-%d)
  curl -s "http://localhost:3001/api/matches/realtime/date/$TODAY" | jq '[.[] | select(.status == "NS")] | length' | xargs -I {} echo "Found {} matches with NS status today"
fi
