#!/bin/bash

# TrueCall Twitter OAuth Testing Script
# This helps you start both servers and test the Twitter verification

echo "🚀 Starting TrueCall Twitter OAuth Test"
echo "========================================"
echo ""

# Check if backend is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✓ Backend already running on port 3001"
else
    echo "❌ Backend not running on port 3001"
    echo ""
    echo "Please start backend in a separate terminal:"
    echo "  cd backend && npm run start:dev"
    echo ""
fi

# Check if frontend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✓ Frontend already running on port 3000"
else
    echo "❌ Frontend not running on port 3000"
    echo ""
    echo "Please start frontend in a separate terminal:"
    echo "  cd frontend && npm run dev"
    echo ""
fi

echo ""
echo "📋 Test Steps:"
echo "1. Open browser → http://127.0.0.1:3000/profile"
echo "2. Connect your wallet"
echo "3. Click 'Link Twitter Account'"
echo "4. You should see Twitter authorization page (not login error!)"
echo "5. Authorize the app"
echo "6. You'll be redirected back with success message"
echo "7. Your Twitter handle should show on profile"
echo ""
echo "📝 See TEST_TWITTER_OAUTH.md for detailed testing guide"
echo ""
