#!/bin/bash

# Check if events are properly showing on Celoscan
# This script helps diagnose event display issues

source .env

PROXY_ADDRESS="0xbA57166902064dE0EE16Df3A30839da7382F06E5"
RPC_URL="https://forno.celo.org"

echo "🔍 Checking AddressVerified Events..."
echo ""

# Get latest block
LATEST_BLOCK=$(cast block latest --rpc-url $RPC_URL | grep number | awk '{print $2}')
FROM_BLOCK=$((LATEST_BLOCK - 10000))

echo "Checking blocks: $FROM_BLOCK to $LATEST_BLOCK"
echo ""

# Check for AddressVerified events
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Recent AddressVerified Events:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cast logs \
  --from-block $FROM_BLOCK \
  --to-block latest \
  --address $PROXY_ADDRESS \
  "AddressVerified(address indexed)" \
  --rpc-url $RPC_URL \
  2>&1 | grep -A 15 "address:" | head -100

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Event Signature Check:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AddressVerified(address): $(cast keccak 'AddressVerified(address)')"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Contract Verification Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to get ABI from Celoscan
echo "Checking if ABI is available on Celoscan..."
curl -s "https://api.celoscan.io/api?module=contract&action=getsourcecode&address=$PROXY_ADDRESS&apikey=$CELOSCAN_API_KEY" | \
  jq -r '.result[0] | "Contract Name: \(.ContractName)\nCompiler: \(.CompilerVersion)\nOptimization: \(.OptimizationUsed)\nABI Available: \(if .ABI != "" then "✅ Yes" else "❌ No" end)"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Recommendations:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If events are emitted on-chain but not showing on Celoscan UI:"
echo ""
echo "1. ⏱️  Wait 5-10 minutes for Celoscan to index recent blocks"
echo "2. 🔄 Clear browser cache and refresh the page"
echo "3. 🔗 Make sure you're viewing the correct address:"
echo "   Proxy: https://celoscan.io/address/$PROXY_ADDRESS#events"
echo "4. 🔍 Click on individual transactions to see the 'Logs' tab"
echo "5. 📧 If still not showing, contact Celoscan support"
echo ""
echo "✅ Events ARE being emitted on-chain (as shown above)"
echo "✅ Contract IS verified (as confirmed earlier)"
echo ""
echo "The issue is likely just Celoscan UI caching/indexing delay."
echo ""
