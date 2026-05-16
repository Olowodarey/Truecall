#!/bin/bash

# Test createPublicEvent via cast (Foundry CLI)
# Usage: ./test-create-event.sh

set -e

# Configuration
RPC_URL="https://forno.celo-sepolia.celo-testnet.org"
EVENT_MANAGER="0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89"
PRIVATE_KEY="${PRIVATE_KEY:-}"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

# Calculate timestamps (4 days from now for start, 11 days for end)
START_DATE=$(($(date +%s) + 4*24*60*60))
END_DATE=$(($(date +%s) + 11*24*60*60))
ENTRY_FEE="1000000000000000000"  # 1 cUSD in wei
SCORING_RULE="2"  # BOTH

echo "=== Testing createPublicEvent via cast ==="
echo "RPC URL: $RPC_URL"
echo "EventManager: $EVENT_MANAGER"
echo "Start Date: $START_DATE ($(date -d @$START_DATE))"
echo "End Date: $END_DATE ($(date -d @$END_DATE))"
echo "Entry Fee: $ENTRY_FEE wei"
echo "Scoring Rule: $SCORING_RULE (BOTH)"
echo ""

# Call the function
echo "Calling createPublicEvent..."
cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    "$EVENT_MANAGER" \
    "createPublicEvent(string,uint256,uint256,uint256,uint8)" \
    "Test Event from CLI" \
    "$START_DATE" \
    "$END_DATE" \
    "$ENTRY_FEE" \
    "$SCORING_RULE"

echo ""
echo "✓ Transaction sent successfully!"
