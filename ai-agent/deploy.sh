#!/bin/bash

# TrueCall AI Agent - Railway Deployment Script
# This script deploys the AI agent to Railway via CLI

set -e  # Exit on error

echo "🚀 TrueCall AI Agent - Railway Deployment"
echo "=========================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "Install it with: npm i -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"

# Check if logged in
echo "📋 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo "Please run: railway login"
    exit 1
fi

RAILWAY_USER=$(railway whoami)
echo "✅ Logged in as: $RAILWAY_USER"
echo ""

# Check if project is linked
echo "📋 Checking project link..."
if ! railway status &> /dev/null; then
    echo "⚠️  No project linked yet"
    echo ""
    echo "Choose an option:"
    echo "1. Create new project"
    echo "2. Link existing project"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            echo "Creating new project..."
            railway init
            ;;
        2)
            echo "Linking existing project..."
            railway link
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo "✅ Project linked"
echo ""

# Check if service exists, if not we need to deploy first to create it
echo "📋 Checking for service..."
SERVICE_CHECK=$(railway variables 2>&1)

if echo "$SERVICE_CHECK" | grep -q "Project has no services"; then
    echo "⚠️  No service found. Will create on first deployment."
    echo ""
    echo "📝 I'll set environment variables after the first deployment."
    echo ""
    
    # Build locally first
    echo "🔨 Building locally to check for errors..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed locally"
        echo "Fix TypeScript errors before deploying"
        exit 1
    fi
    
    echo "✅ Local build successful"
    echo ""
    
    echo "📦 Creating service with initial deployment..."
    railway up --detach
    
    echo "⏳ Waiting for service to be created..."
    sleep 5
    
    echo "✅ Service created"
    echo ""
fi

# Now set environment variables
echo "📋 Setting environment variables..."
echo ""

read -p "Do you want to set environment variables now? (y/n): " add_vars

if [ "$add_vars" = "y" ] || [ "$add_vars" = "Y" ]; then
        echo ""
        echo "Setting environment variables..."
        
        # CELO_RPC_URL
        if [[ " ${MISSING_VARS[@]} " =~ " CELO_RPC_URL " ]]; then
            railway variables set CELO_RPC_URL="https://forno.celo.org"
            echo "✅ Set CELO_RPC_URL"
        fi
        
        # CREATOR_EVENT_MANAGER_ADDRESS
        if [[ " ${MISSING_VARS[@]} " =~ " CREATOR_EVENT_MANAGER_ADDRESS " ]]; then
            railway variables set CREATOR_EVENT_MANAGER_ADDRESS="0xbA57166902064dE0EE16Df3A30839da7382F06E5"
            echo "✅ Set CREATOR_EVENT_MANAGER_ADDRESS"
        fi
        
        # BACKEND_API_URL
        if [[ " ${MISSING_VARS[@]} " =~ " BACKEND_API_URL " ]]; then
            railway variables set BACKEND_API_URL="https://truecall-production.up.railway.app/api"
            echo "✅ Set BACKEND_API_URL"
        fi
        
        # Optional variables
        railway variables set POLL_INTERVAL_MS="60000"
        railway variables set STARTUP_BLOCK_LOOKBACK="10000"
        railway variables set LOG_LEVEL="info"
        echo "✅ Set optional variables"
        
        # AGENT_PRIVATE_KEY (critical - needs user input)
        if [[ " ${MISSING_VARS[@]} " =~ " AGENT_PRIVATE_KEY " ]]; then
            echo ""
            echo "⚠️  CRITICAL: AGENT_PRIVATE_KEY required"
            echo "This is the private key of wallet: 0x684835A1f131dcC3D4fF49A356556Fe0188Bd062"
            echo ""
            read -sp "Enter AGENT_PRIVATE_KEY (input hidden): " private_key
            echo ""
            
            if [ -z "$private_key" ]; then
                echo "❌ Private key cannot be empty"
                exit 1
            fi
            
            railway variables set AGENT_PRIVATE_KEY="$private_key"
            echo "✅ Set AGENT_PRIVATE_KEY"
        fi
        
        echo ""
        echo "✅ All environment variables set"
        echo ""
        
        # Redeploy with environment variables
        echo "📦 Redeploying with environment variables..."
        railway up --detach
        
        echo "⏳ Waiting for deployment..."
        sleep 10
        
        echo ""
        echo "✅ Deployment complete!"
    else
        echo "⚠️  Skipping environment variables"
        echo "Set them later with: railway variables set VARIABLE_NAME=\"value\""
    fi
else
    echo "✅ All required environment variables present"
    echo ""
    
    # Build locally first
    echo "🔨 Building locally to check for errors..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed locally"
        echo "Fix TypeScript errors before deploying"
        exit 1
    fi
    
    echo "✅ Local build successful"
    echo ""
    
    # Deploy
    echo "📦 Deploying to Railway..."
    echo ""
    railway up
fi
echo ""
echo "✅ Script complete!"
echo ""
echo "📊 Useful commands:"
echo "   View logs:    railway logs"
echo "   Check status: railway status"
echo "   Open web:     railway open"
echo ""
echo "🔍 Monitor on CeloScan:"
echo "   https://celoscan.io/address/0xbA57166902064dE0EE16Df3A30839da7382F06E5#events"
echo ""
echo "💰 Check agent wallet balance:"
echo "   https://celoscan.io/address/0x684835A1f131dcC3D4fF49A356556Fe0188Bd062"
echo ""

