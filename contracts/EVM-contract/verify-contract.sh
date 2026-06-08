#!/bin/bash

# Verify CreatorEventManager on Celoscan
# This script verifies the proxy contract on Celo Mainnet

# Load environment variables
source .env

# Contract address to verify (proxy)
PROXY_ADDRESS="0xbA57166902064dE0EE16Df3A30839da7382F06E5"

# Implementation address (retrieved from proxy)
IMPLEMENTATION_ADDRESS="0xf78f5c9e8356a89ac2c43c19017595bbf371bf27"

# Check if API key is set
if [ "$CELOSCAN_API_KEY" == "YOUR_CELOSCAN_API_KEY_HERE" ]; then
    echo "❌ ERROR: Please set your CELOSCAN_API_KEY in .env file"
    echo ""
    echo "Steps to get API key:"
    echo "1. Go to https://celoscan.io/myapikey"
    echo "2. Sign up or log in"
    echo "3. Create a new API key"
    echo "4. Update .env file with: CELOSCAN_API_KEY=your_key_here"
    exit 1
fi

echo "🔍 Verifying CreatorEventManager contract on Celo Mainnet..."
echo "Proxy Address: $PROXY_ADDRESS"
echo "Implementation Address: $IMPLEMENTATION_ADDRESS"
echo ""

# Verify the implementation contract
echo "📝 Step 1: Verifying implementation contract..."
forge verify-contract \
    $IMPLEMENTATION_ADDRESS \
    src/CreatorEventManager.sol:CreatorEventManager \
    --chain celo \
    --etherscan-api-key $CELOSCAN_API_KEY \
    --watch \
    --constructor-args $(cast abi-encode "constructor()")

if [ $? -eq 0 ]; then
    echo "✅ Implementation contract verified successfully!"
else
    echo "⚠️  Implementation verification failed or already verified"
fi

echo ""
echo "📝 Step 2: Verifying proxy contract..."

# For UUPS proxies, we need to verify it as a proxy
# Celoscan should auto-detect the proxy pattern
forge verify-contract \
    $PROXY_ADDRESS \
    src/CreatorEventManager.sol:CreatorEventManager \
    --chain celo \
    --etherscan-api-key $CELOSCAN_API_KEY \
    --watch

if [ $? -eq 0 ]; then
    echo "✅ Proxy contract verified successfully!"
    echo ""
    echo "🎉 Contract verification complete!"
    echo "📊 View on Celoscan: https://celoscan.io/address/$PROXY_ADDRESS"
else
    echo "⚠️  Proxy verification failed or already verified"
    echo ""
    echo "ℹ️  If verification failed, try manual verification at:"
    echo "   https://celoscan.io/verifyContract?a=$PROXY_ADDRESS"
fi
