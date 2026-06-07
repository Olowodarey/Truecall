#!/bin/bash

echo "======================================"
echo "🏆 TrueCall World Cup Deployment"
echo "======================================"
echo ""

# Check if in correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "ai-agent" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Git Status Check${NC}"
git status --short
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled"
  exit 1
fi

# Add all changes
echo -e "${YELLOW}Step 2: Adding changes...${NC}"
git add .

# Commit
echo -e "${YELLOW}Step 3: Committing...${NC}"
COMMIT_MSG="feat: World Cup launch - database cache + 100 calls/day optimization

- Added database cache for matches (PostgreSQL)
- World Cup + International Friendlies focus
- Cron jobs: priority sync every 2h, finished every 1h
- API usage: ~40 calls/day (60% buffer)
- Database-first approach (0 API calls for users)
- Added usage statistics endpoints
- Updated AI agent to use database cache

Ready for World Cup 2026 launch! 🏆⚽"

git commit -m "$COMMIT_MSG"

# Push
echo -e "${YELLOW}Step 4: Pushing to GitHub...${NC}"
git push origin main

echo ""
echo -e "${GREEN}✅ Code pushed to GitHub!${NC}"
echo ""

# Railway deployment instructions
echo -e "${YELLOW}Step 5: Deploy to Railway${NC}"
echo ""
echo "Backend:"
echo "  1. Go to Railway dashboard"
echo "  2. Select 'backend' service"
echo "  3. Click 'Deploy' or wait for auto-deploy"
echo "  4. Run migration: railway run npx typeorm migration:run"
echo ""

echo "AI Agent:"
echo "  1. Go to Railway dashboard"
echo "  2. Select 'ai-agent' service"
echo "  3. Click 'Deploy' or wait for auto-deploy"
echo ""

echo -e "${YELLOW}Step 6: Verify Deployment${NC}"
echo ""
echo "Test these endpoints after deployment:"
echo ""
echo "  API Usage:"
echo "  curl https://truecall-production.up.railway.app/api/matches/stats/usage"
echo ""
echo "  Database Stats:"
echo "  curl https://truecall-production.up.railway.app/api/matches/stats/database"
echo ""
echo "  Priority Matches:"
echo "  curl https://truecall-production.up.railway.app/api/matches/priority"
echo ""

echo -e "${GREEN}======================================"
echo "🎉 Deployment Complete!"
echo "======================================${NC}"
echo ""
echo "⏰ World Cup starts in 4 days!"
echo "📊 API limit: 100 calls/day"
echo "🎯 Expected usage: ~40 calls/day"
echo "🏆 Focus: World Cup + Friendlies"
echo ""
echo "Next steps:"
echo "1. Monitor Railway logs for cron job execution"
echo "2. Wait for first sync (2 hours)"
echo "3. Test frontend match loading"
echo "4. Celebrate! 🎉"
echo ""
