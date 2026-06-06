#!/bin/bash

echo "======================================"
echo "🤖 Testing AI Agent Integration"
echo "======================================"
echo ""

# Check backend is running
echo "1️⃣  Checking Backend..."
if curl -s http://localhost:3001/api/matches/realtime/status > /dev/null 2>&1; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend is NOT running"
  echo "   💡 Start it with: cd backend && pnpm start"
  exit 1
fi
echo ""

# Check finished matches endpoint
echo "2️⃣  Checking Finished Matches Endpoint..."
FINISHED_COUNT=$(curl -s "http://localhost:3001/api/matches?status=finished" | jq 'length')
echo "   Found $FINISHED_COUNT finished matches"
if [ "$FINISHED_COUNT" -gt 0 ]; then
  echo "   ✅ Finished matches available"
  echo ""
  echo "   Sample finished match:"
  curl -s "http://localhost:3001/api/matches?status=finished" | jq '.[0] | {id, homeTeam, awayTeam, status, finalHomeScore, finalAwayScore}' 
else
  echo "   ⚠️  No finished matches (expected - check API-Football)"
fi
echo ""

# Check AI agent config
echo "3️⃣  Checking AI Agent Configuration..."
if [ -f "ai-agent/.env" ]; then
  BACKEND_URL=$(grep BACKEND_API_URL ai-agent/.env | cut -d'=' -f2)
  echo "   Backend URL: $BACKEND_URL"
  
  if [ -z "$BACKEND_URL" ]; then
    echo "   ⚠️  BACKEND_API_URL not set"
  else
    echo "   ✅ Backend URL configured"
  fi
  
  AGENT_KEY=$(grep AGENT_PRIVATE_KEY ai-agent/.env | cut -d'=' -f2)
  if [[ "$AGENT_KEY" == *"your_agent"* ]]; then
    echo "   ⚠️  AGENT_PRIVATE_KEY needs to be set"
  else
    echo "   ✅ Agent private key configured"
  fi
else
  echo "   ❌ ai-agent/.env not found"
fi
echo ""

# Check AI agent build
echo "4️⃣  Checking AI Agent Build..."
if [ -d "ai-agent/dist" ]; then
  echo "   ✅ AI agent built (dist/ exists)"
else
  echo "   ❌ AI agent not built"
  echo "   💡 Build it with: cd ai-agent && npm run build"
fi
echo ""

echo "======================================"
echo "📋 Summary"
echo "======================================"
echo ""
echo "Backend:  http://localhost:3001"
echo "Finished: $FINISHED_COUNT matches with FT status"
echo ""
echo "🎯 To start AI Agent:"
echo "   cd ai-agent"
echo "   npm start"
echo ""
echo "📊 AI Agent will:"
echo "   • Watch for MatchAdded events"
echo "   • Fetch match results from backend"
echo "   • Only submit when status = 'FT'"
echo "   • Submit to CreatorEventManager contract"
echo ""
