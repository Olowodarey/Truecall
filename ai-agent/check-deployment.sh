#!/bin/bash

echo "🔍 Checking AI Agent Deployment Status"
echo "========================================"
echo ""

cd ~/Desktop/my\ projects/Truecall/ai-agent

# Check Railway status
echo "📊 Railway Status:"
railway status
echo ""

# Check if private key is still placeholder
echo "🔑 Checking Private Key:"
PRIVATE_KEY=$(railway variables | grep "AGENT_PRIVATE_KEY" | awk -F '│' '{print $3}' | tr -d ' ')

if [ "$PRIVATE_KEY" = "0xYOUR_ACTUAL_PRIVATE_KEY_HERE" ]; then
    echo "❌ PRIVATE KEY IS STILL PLACEHOLDER!"
    echo ""
    echo "You need to set the real private key:"
    echo "  railway variables set AGENT_PRIVATE_KEY=\"0xYOUR_REAL_KEY\""
    echo ""
else
    echo "✅ Private key is set (not placeholder)"
fi

# Check recent logs
echo ""
echo "📋 Recent Logs (last 20 lines):"
echo "--------------------------------"
railway logs --tail 20

echo ""
echo "💡 To view live logs: railway logs -f"
echo "💡 To redeploy: railway up"
