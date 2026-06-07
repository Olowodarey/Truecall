#!/bin/bash

echo "🔍 TrueCall AI Agent Health Check"
echo "=================================="
echo ""

# Get the Railway domain
AGENT_URL=$(railway domain 2>/dev/null || echo "")

if [ -z "$AGENT_URL" ]; then
  echo "❌ No Railway domain found. Checking logs instead..."
  echo ""
  railway logs --tail 20
  exit 1
fi

echo "📍 Agent URL: $AGENT_URL"
echo ""

# Check health endpoint
echo "🏥 Health Check:"
curl -s "https://$AGENT_URL/health" | python3 -m json.tool 2>/dev/null || echo "❌ Health endpoint not responding"
echo ""

# Check status endpoint
echo "📊 Status:"
curl -s "https://$AGENT_URL/status" | python3 -m json.tool 2>/dev/null || echo "❌ Status endpoint not responding"
echo ""

# Check recent logs
echo "📋 Recent Logs (last 10 lines):"
echo "--------------------------------"
railway logs --tail 10 | grep -v "^$"
echo ""

# Check for recent submissions
echo "✅ Recent Submissions:"
echo "---------------------"
railway logs --tail 100 | grep "✅ Match result submitted" | tail -5
echo ""

# Check for errors
ERROR_COUNT=$(railway logs --tail 100 | grep -i "error\|fail" | wc -l)
echo "⚠️  Recent Errors: $ERROR_COUNT"
if [ $ERROR_COUNT -gt 0 ]; then
  echo "Last errors:"
  railway logs --tail 100 | grep -i "error\|fail" | tail -3
fi
echo ""

echo "=================================="
echo "✅ Health check complete!"
echo ""
echo "💡 For live monitoring, run: railway logs -f"
