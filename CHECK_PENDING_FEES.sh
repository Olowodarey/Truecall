#!/bin/bash

# Check Pending Fees in CreatorEventManager Contract

set -e

# Load environment variables
source contracts/EVM-contract/.env

echo "════════════════════════════════════════════════════════════"
echo "  Checking CreatorEventManager Fees"
echo "════════════════════════════════════════════════════════════"
echo ""

CONTRACT=$CREATOR_EVENT_MANAGER_ADDRESS
RPC=$CELO_RPC_URL

echo "Contract: $CONTRACT"
echo "RPC: $RPC"
echo ""

# 1. Check contract balance
echo "1. Contract CELO Balance:"
BALANCE=$(cast balance $CONTRACT --rpc-url $RPC)
echo "   $BALANCE wei"
echo "   $(cast --to-unit $BALANCE ether) CELO"
echo ""

# 2. Check pendingFees
echo "2. Pending Fees (recorded in contract):"
PENDING=$(cast call $CONTRACT "pendingFees()" --rpc-url $RPC)
echo "   $PENDING wei"
echo "   $(cast --to-unit $PENDING ether) CELO"
echo ""

# 3. Check creation fee
echo "3. Creation Fee (per event):"
FEE=$(cast call $CONTRACT "creationFee()" --rpc-url $RPC)
echo "   $FEE wei"
echo "   $(cast --to-unit $FEE ether) CELO"
echo ""

# 4. Check treasury address
echo "4. Treasury Address:"
TREASURY=$(cast call $CONTRACT "treasury()" --rpc-url $RPC)
echo "   $TREASURY"
echo ""

# 5. Check owner
echo "5. Contract Owner:"
OWNER=$(cast call $CONTRACT "owner()" --rpc-url $RPC)
echo "   $OWNER"
echo ""

# 6. Summary
echo "════════════════════════════════════════════════════════════"
echo "  Summary"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ "$PENDING" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "⚠️  No pending fees to withdraw!"
    echo ""
    echo "Possible reasons:"
    echo "1. No events have been created yet"
    echo "2. Creation fee is not set"
    echo "3. Fees were already withdrawn"
else
    echo "✅ Pending fees available: $(cast --to-unit $PENDING ether) CELO"
    echo ""
    echo "To withdraw to your wallet:"
    echo "cast send $CONTRACT \\"
    echo "  'withdrawFees(address)' \\"
    echo "  <YOUR_WALLET_ADDRESS> \\"
    echo "  --rpc-url $RPC \\"
    echo "  --private-key <OWNER_PRIVATE_KEY>"
fi

echo ""
