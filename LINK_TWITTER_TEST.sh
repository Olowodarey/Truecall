#!/bin/bash

# Quick script to link Twitter accounts for testing
# Usage: ./LINK_TWITTER_TEST.sh <wallet_address> <twitter_handle>

if [ "$#" -ne 2 ]; then
    echo "Usage: ./LINK_TWITTER_TEST.sh <wallet_address> <twitter_handle>"
    echo "Example: ./LINK_TWITTER_TEST.sh 0xDE802A020DA18B561e5203a3585DCb66d313e7b3 john_crypto"
    exit 1
fi

ADDRESS=$1
TWITTER=$2

echo "🔗 Linking Twitter @$TWITTER to wallet $ADDRESS..."

curl -X POST http://localhost:3001/users/twitter/link \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"$ADDRESS\",\"twitterHandle\":\"$TWITTER\"}"

echo ""
echo ""
echo "✅ Done! Now check profile:"
echo "curl http://localhost:3001/users/profile/$ADDRESS"
