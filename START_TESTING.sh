#!/bin/bash

# 🧪 TrueCall - Quick Start for Testing
# This script helps you start all services for testing the unified data architecture

set -e

echo "════════════════════════════════════════════════════════"
echo "  🚀 TrueCall - Start Testing Environment"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is needed
if ! curl -s http://localhost:3001/api/matches > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend not running!${NC}"
    echo ""
    echo "Starting backend..."
    echo -e "${BLUE}Run in a separate terminal:${NC}"
    echo "  cd backend && pnpm start:dev"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Backend running at http://localhost:3001${NC}"

# Test backend API
MATCH_COUNT=$(curl -s http://localhost:3001/api/matches | jq '. | length' 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ Backend API serving ${MATCH_COUNT} matches${NC}"
echo ""

# Check AI agent
echo "════════════════════════════════════════════════════════"
echo "  🤖 AI Agent Status"
echo "════════════════════════════════════════════════════════"
echo ""

cd ai-agent

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo "Copying from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your credentials${NC}"
    exit 1
fi

# Check BACKEND_API_URL
if ! grep -q "BACKEND_API_URL" .env; then
    echo -e "${YELLOW}⚠️  BACKEND_API_URL not set in .env${NC}"
    echo "Adding default..."
    echo "BACKEND_API_URL=http://localhost:3001/api" >> .env
fi

echo -e "${GREEN}✅ AI agent configured${NC}"
echo -e "${BLUE}BACKEND_API_URL:${NC} $(grep BACKEND_API_URL .env | cut -d '=' -f2)"
echo ""

# Build AI agent
echo "Building AI agent..."
npm run build > /dev/null 2>&1
echo -e "${GREEN}✅ AI agent built successfully${NC}"
echo ""

# Instructions
echo "════════════════════════════════════════════════════════"
echo "  📋 Next Steps"
echo "════════════════════════════════════════════════════════"
echo ""
echo "1. ${GREEN}Start AI Agent${NC} (in a new terminal):"
echo "   cd ai-agent && npm start"
echo ""
echo "2. ${GREEN}Start Frontend${NC} (in a new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. ${GREEN}Test the workflow:${NC}"
echo "   - Open http://localhost:3000"
echo "   - Connect wallet"
echo "   - Link Twitter (if not done)"
echo "   - Create event with a match"
echo "   - Join event and make predictions"
echo ""
echo "4. ${GREEN}Watch AI agent logs${NC} for:"
echo "   ✅ Loaded X matches from backend API"
echo "   🤖 Creator Match Watcher starting"
echo "   📊 Submitting match result"
echo ""
echo "════════════════════════════════════════════════════════"
echo "  📚 Documentation"
echo "════════════════════════════════════════════════════════"
echo ""
echo "- SINGLE_SOURCE_OF_TRUTH_COMPLETE.md - Overview"
echo "- UNIFIED_DATA_ARCHITECTURE.md - Technical details"
echo "- TEST_EVENT_WORKFLOW.md - Complete testing guide"
echo ""
echo -e "${GREEN}✅ Setup complete! Ready for testing.${NC}"
echo ""
