#!/bin/bash

# Twitter OAuth Configuration Verification Script

echo "======================================"
echo "  Twitter OAuth Config Verification"
echo "======================================"
echo ""

# Check backend .env
echo "📂 Backend Configuration:"
echo "------------------------"
if [ -f "backend/.env" ]; then
    echo "✅ backend/.env exists"
    
    CLIENT_ID=$(grep "^TWITTER_CLIENT_ID=" backend/.env | cut -d'=' -f2)
    CLIENT_SECRET=$(grep "^TWITTER_CLIENT_SECRET=" backend/.env | cut -d'=' -f2)
    REDIRECT_URI=$(grep "^TWITTER_REDIRECT_URI=" backend/.env | cut -d'=' -f2)
    
    echo "   Client ID: ${CLIENT_ID:0:10}... (${#CLIENT_ID} chars)"
    echo "   Client Secret: ${CLIENT_SECRET:0:10}... (${#CLIENT_SECRET} chars)"
    echo "   Redirect URI: $REDIRECT_URI"
    
    # Check for common issues
    if [[ "$REDIRECT_URI" == */ ]]; then
        echo "   ❌ WARNING: Redirect URI has trailing slash!"
    fi
    
    if [[ "$REDIRECT_URI" == https://localhost* ]]; then
        echo "   ⚠️  WARNING: Using https for localhost (should be http)"
    fi
    
    if [[ "$REDIRECT_URI" == *127.0.0.1* ]]; then
        echo "   ⚠️  WARNING: Using 127.0.0.1 (use localhost instead)"
    fi
else
    echo "❌ backend/.env NOT FOUND"
fi

echo ""

# Check frontend .env.local
echo "🎨 Frontend Configuration:"
echo "-------------------------"
if [ -f "frontend/.env.local" ]; then
    echo "✅ frontend/.env.local exists"
    
    FE_CLIENT_ID=$(grep "^NEXT_PUBLIC_TWITTER_CLIENT_ID=" frontend/.env.local | cut -d'=' -f2)
    FE_REDIRECT_URI=$(grep "^NEXT_PUBLIC_TWITTER_REDIRECT_URI=" frontend/.env.local | cut -d'=' -f2)
    
    echo "   Client ID: ${FE_CLIENT_ID:0:10}... (${#FE_CLIENT_ID} chars)"
    echo "   Redirect URI: $FE_REDIRECT_URI"
    
    # Check for common issues
    if [[ "$FE_REDIRECT_URI" == */ ]]; then
        echo "   ❌ WARNING: Redirect URI has trailing slash!"
    fi
    
    if [[ "$FE_REDIRECT_URI" == https://localhost* ]]; then
        echo "   ⚠️  WARNING: Using https for localhost (should be http)"
    fi
    
    if [[ "$FE_REDIRECT_URI" == *127.0.0.1* ]]; then
        echo "   ⚠️  WARNING: Using 127.0.0.1 (use localhost instead)"
    fi
else
    echo "❌ frontend/.env.local NOT FOUND"
fi

echo ""

# Compare configurations
echo "🔍 Configuration Consistency:"
echo "----------------------------"

if [ "$CLIENT_ID" == "$FE_CLIENT_ID" ]; then
    echo "✅ Client IDs match"
else
    echo "❌ Client IDs DO NOT MATCH!"
    echo "   Backend:  $CLIENT_ID"
    echo "   Frontend: $FE_CLIENT_ID"
fi

if [ "$REDIRECT_URI" == "$FE_REDIRECT_URI" ]; then
    echo "✅ Redirect URIs match"
else
    echo "❌ Redirect URIs DO NOT MATCH!"
    echo "   Backend:  $REDIRECT_URI"
    echo "   Frontend: $FE_REDIRECT_URI"
fi

echo ""
echo "📋 Next Steps:"
echo "-------------"
echo "1. Verify these values match EXACTLY in Twitter Developer Portal:"
echo "   https://developer.twitter.com/en/portal/dashboard"
echo ""
echo "2. Go to: Your App → Settings → User authentication settings"
echo ""
echo "3. Ensure Redirect URI is EXACTLY:"
echo "   $REDIRECT_URI"
echo ""
echo "4. After fixing, restart both servers:"
echo "   Backend:  cd backend && pnpm start:dev"
echo "   Frontend: cd frontend && pnpm dev"
echo ""
