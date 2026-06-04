#!/bin/bash

# Test script for Netlify deployment
# This script tests if the Netlify deployment is working correctly

echo "🧪 Testing TrueCall Netlify Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NETLIFY_URL="https://truecall.netlify.app"
BACKEND_URL="https://truecall-production.up.railway.app/api"
TEST_ADDRESS="0xc232b9Fa329255078A8Cc13e585215e69c44f4D3"

# Test 1: Check if Netlify site is accessible
echo "Test 1: Checking Netlify site accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "$NETLIFY_URL" | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Netlify site is accessible"
else
    echo -e "${RED}✗${NC} Netlify site is NOT accessible"
fi
echo ""

# Test 2: Check backend API directly
echo "Test 2: Checking backend API (Railway)..."
BACKEND_RESPONSE=$(curl -s "$BACKEND_URL/creator-events")
if echo "$BACKEND_RESPONSE" | grep -q "eventId\|events\|\[\]"; then
    echo -e "${GREEN}✓${NC} Backend API is responding"
    echo "   Response preview: ${BACKEND_RESPONSE:0:100}..."
else
    echo -e "${RED}✗${NC} Backend API is NOT responding correctly"
    echo "   Response: $BACKEND_RESPONSE"
fi
echo ""

# Test 3: Check Netlify API proxy
echo "Test 3: Checking Netlify API proxy..."
PROXY_RESPONSE=$(curl -s "$NETLIFY_URL/api/creator-events")
if echo "$PROXY_RESPONSE" | grep -q "eventId\|events\|\[\]"; then
    echo -e "${GREEN}✓${NC} Netlify API proxy is working"
    echo "   Response preview: ${PROXY_RESPONSE:0:100}..."
else
    echo -e "${RED}✗${NC} Netlify API proxy is NOT working"
    echo "   Response: $PROXY_RESPONSE"
    echo -e "${YELLOW}   → Check NEXT_PUBLIC_API_URL environment variable in Netlify${NC}"
fi
echo ""

# Test 4: Check Twitter verification status (backend)
echo "Test 4: Checking Twitter verification (backend)..."
BACKEND_VERIFY=$(curl -s "$BACKEND_URL/users/twitter/verify-status/$TEST_ADDRESS")
if echo "$BACKEND_VERIFY" | grep -q "verified"; then
    echo -e "${GREEN}✓${NC} Backend verification endpoint is working"
    echo "   Response: $BACKEND_VERIFY"
else
    echo -e "${RED}✗${NC} Backend verification endpoint failed"
    echo "   Response: $BACKEND_VERIFY"
fi
echo ""

# Test 5: Check Twitter verification status (Netlify proxy)
echo "Test 5: Checking Twitter verification (Netlify proxy)..."
NETLIFY_VERIFY=$(curl -s "$NETLIFY_URL/api/users/twitter/verify-status/$TEST_ADDRESS")
if echo "$NETLIFY_VERIFY" | grep -q "verified"; then
    echo -e "${GREEN}✓${NC} Netlify verification proxy is working"
    echo "   Response: $NETLIFY_VERIFY"
    
    # Check if user is actually verified
    if echo "$NETLIFY_VERIFY" | grep -q '"verified":true'; then
        echo -e "${GREEN}   ✓ User @kryptkage is verified!${NC}"
    else
        echo -e "${YELLOW}   ⚠ User is not verified yet${NC}"
    fi
else
    echo -e "${RED}✗${NC} Netlify verification proxy failed"
    echo "   Response: $NETLIFY_VERIFY"
    echo -e "${YELLOW}   → Check NEXT_PUBLIC_API_URL in Netlify environment variables${NC}"
fi
echo ""

# Test 6: Check user profile (backend)
echo "Test 6: Checking user profile (backend)..."
BACKEND_PROFILE=$(curl -s "$BACKEND_URL/users/profile/$TEST_ADDRESS")
if echo "$BACKEND_PROFILE" | grep -q "address\|twitterHandle"; then
    echo -e "${GREEN}✓${NC} Backend profile endpoint is working"
    echo "   Response: $BACKEND_PROFILE"
else
    echo -e "${RED}✗${NC} Backend profile endpoint failed"
    echo "   Response: $BACKEND_PROFILE"
fi
echo ""

# Test 7: Check user profile (Netlify proxy)
echo "Test 7: Checking user profile (Netlify proxy)..."
NETLIFY_PROFILE=$(curl -s "$NETLIFY_URL/api/users/profile/$TEST_ADDRESS")
if echo "$NETLIFY_PROFILE" | grep -q "address\|twitterHandle"; then
    echo -e "${GREEN}✓${NC} Netlify profile proxy is working"
    echo "   Response: $NETLIFY_PROFILE"
else
    echo -e "${RED}✗${NC} Netlify profile proxy failed"
    echo "   Response: $NETLIFY_PROFILE"
fi
echo ""

# Summary
echo "========================================"
echo "📋 Test Summary"
echo "========================================"
echo ""
echo "Frontend URL: $NETLIFY_URL"
echo "Backend URL:  $BACKEND_URL"
echo "Test Address: $TEST_ADDRESS"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Visit https://truecall.netlify.app in your browser"
echo "2. Connect your wallet"
echo "3. Check if verification status shows correctly"
echo "4. If not, check environment variables in Netlify dashboard"
echo ""
echo -e "${YELLOW}Required Netlify Environment Variables:${NC}"
echo "   NEXT_PUBLIC_API_URL=$BACKEND_URL"
echo "   NEXT_PUBLIC_TWITTER_CLIENT_ID=ZGFtYjlOY2ZlRTF3ZDFYMGJVTHo6MTpjaQ"
echo "   NEXT_PUBLIC_TWITTER_REDIRECT_URI=$NETLIFY_URL/profile/twitter/callback"
echo ""
