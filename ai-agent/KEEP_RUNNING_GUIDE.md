# Keep AI Agent Running - Production Guide

## 🚀 Current Deployment Status

Your AI agent is deployed on **Railway** and configured to:

- ✅ Run 24/7 automatically
- ✅ Auto-restart if it crashes
- ✅ Auto-redeploy on git push
- ✅ Scale automatically

## 🛡️ Railway Built-in Reliability Features

Railway already provides:

### 1. **Automatic Restarts**

If your agent crashes, Railway automatically restarts it within seconds.

### 2. **Health Checks**

Railway monitors your service and restarts if it becomes unresponsive.

### 3. **Zero-Downtime Deploys**

When you deploy updates, Railway keeps the old version running until the new one is ready.

### 4. **Resource Monitoring**

Railway tracks CPU, memory, and network usage.

---

## 🔧 Additional Safeguards to Add

### 1. Add Health Check Endpoint

Create a simple HTTP server for Railway to ping:

**File: `src/healthCheck.ts`** (create this file)

```typescript
import express from "express";
import { logger } from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Status endpoint (optional - shows what matches are being tracked)
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "running",
    uptime: process.uptime(),
    version: "2.0.0",
  });
});

export function startHealthServer() {
  app.listen(PORT, () => {
    logger.info("Health check server started", { port: PORT });
  });
}
```

**Update `src/index.ts`** - Add at the top:

```typescript
import { startHealthServer } from "./healthCheck";

async function main(): Promise<void> {
  // Start health check server
  startHealthServer();

  // ... rest of your code
}
```

### 2. Better Error Handling

The code already has good error handling, but let's verify:

**Check `src/creatorMatchWatcher.ts`** has:

```typescript
// Already implemented ✅
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
  // Don't exit - keep running
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  // Log but don't exit - let Railway restart if needed
});
```

### 3. Wallet Balance Monitoring

Add a check to ensure the agent wallet has enough CELO for gas:

**File: `src/walletMonitor.ts`** (create this)

```typescript
import { publicClient } from "./services/creatorMatchClient";
import { config } from "./config";
import { logger } from "./utils/logger";
import { formatEther } from "viem";

const MIN_BALANCE_CELO = 0.1; // Alert if below 0.1 CELO

export async function checkWalletBalance(): Promise<void> {
  try {
    const balance = await publicClient.getBalance({
      address: config.agentWalletAddress,
    });

    const balanceCelo = parseFloat(formatEther(balance));

    logger.info("Wallet balance check", {
      balance: `${balanceCelo} CELO`,
      address: config.agentWalletAddress,
    });

    if (balanceCelo < MIN_BALANCE_CELO) {
      logger.error("⚠️ LOW WALLET BALANCE!", {
        balance: `${balanceCelo} CELO`,
        minimum: `${MIN_BALANCE_CELO} CELO`,
        message: "Please add funds to continue submitting results",
      });
    }
  } catch (err) {
    logger.error("Failed to check wallet balance", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Check balance every hour
export function startWalletMonitor(): void {
  // Check immediately
  checkWalletBalance();

  // Then check every hour
  setInterval(checkWalletBalance, 60 * 60 * 1000);
}
```

---

## 📊 Monitoring & Alerts

### Option 1: Railway Dashboard (Built-in)

1. Go to https://railway.app
2. Select your AI Agent project
3. View metrics: CPU, Memory, Network
4. Check logs in real-time

### Option 2: Email Alerts (Recommended)

Set up email notifications in Railway:

1. Go to Project Settings
2. Enable "Deployment Failed" notifications
3. Enable "Resource Limit" notifications

### Option 3: External Monitoring (Advanced)

Use **UptimeRobot** (free) or **Better Uptime**:

1. **Sign up:** https://uptimerobot.com
2. **Add Monitor:**
   - Type: HTTP(s)
   - URL: Your Railway URL + `/health`
   - Interval: 5 minutes
3. **Set alerts:**
   - Email when down
   - SMS (optional)

### Option 4: Custom Webhook Alerts

Add to your agent code:

```typescript
// Send alert to Discord/Telegram/Slack
async function sendAlert(message: string) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    logger.error("Failed to send alert", { error: err });
  }
}
```

---

## 🔍 Daily Maintenance Checklist

### Automated (No Action Needed)

- ✅ Railway auto-restarts on crashes
- ✅ Railway monitors health
- ✅ Railway auto-scales resources
- ✅ Logs are stored for 7 days

### Weekly Check (5 minutes)

```bash
# 1. Check if agent is running
railway logs --tail 20

# 2. Verify recent submissions
railway logs | grep "✅ Match result submitted"

# 3. Check wallet balance
# Look for "Wallet balance check" in logs

# 4. Check for errors
railway logs | grep -i "error\|fail\|crash"
```

### Monthly Tasks

1. **Check Wallet Balance**
   - Ensure agent wallet has enough CELO for gas
   - Add funds if below 0.5 CELO

2. **Review Logs**
   - Check for any recurring errors
   - Verify submission success rate

3. **Update Dependencies** (if needed)
   ```bash
   cd ai-agent
   npm update
   git commit -am "Update dependencies"
   git push
   # Railway auto-deploys
   ```

---

## 🚨 Common Issues & Fixes

### Issue 1: Agent Stops Submitting Results

**Symptoms:** No new submissions in logs
**Causes:**

- Wallet out of gas (CELO)
- RPC endpoint down
- Backend API down

**Fix:**

```bash
# Check logs
railway logs --tail 50

# If wallet issue - add CELO to:
# 0x684835A1f131dcC3D4fF49A356556Fe0188Bd062

# If RPC issue - Railway will auto-restart
# If Backend issue - check backend deployment
```

### Issue 2: High Memory Usage

**Symptoms:** Railway shows high memory usage
**Cause:** Tracked matches not being cleaned up

**Fix:**
Already handled in code - matches are removed after submission.
If issue persists, restart:

```bash
railway restart
```

### Issue 3: Missing Match Results

**Symptoms:** Match not being tracked
**Cause:** MatchAdded event outside block lookback range

**Fix:**
Already fixed with `STARTUP_BLOCK_LOOKBACK=500000`

### Issue 4: Transaction Failures

**Symptoms:** "Failed to submit match result" in logs
**Causes:**

- Low gas
- RPC timeout
- Network congestion

**Fix:**
Agent auto-retries on next poll (60 seconds).
Check wallet has sufficient CELO.

---

## 📱 Quick Commands Reference

```bash
# View live logs
railway logs -f

# Check recent activity
railway logs --tail 50

# Check variables
railway variables

# Restart agent
railway restart

# Redeploy
railway up --detach

# Check wallet balance (on Celo)
# Visit: https://celoscan.io/address/0x684835A1f131dcC3D4fF49A356556Fe0188Bd062
```

---

## 💰 Cost & Resource Management

### Railway Free Tier

- **$5 free credit/month**
- **500 hours execution time**
- Your agent uses ~720 hours/month (24/7)

**Recommendation:** Upgrade to Railway Pro ($5/month) for:

- Unlimited execution time
- Better support
- Higher resource limits

### Optimize Resource Usage

Already optimized:

- ✅ 60-second poll interval (not too frequent)
- ✅ Efficient event scanning
- ✅ Memory cleanup after submissions
- ✅ No unnecessary API calls

---

## 🔐 Security Best Practices

### Current Setup ✅

- ✅ Private key stored in Railway environment variables (encrypted)
- ✅ Not committed to git
- ✅ Only agent wallet can submit results (ORACLE_ROLE)

### Additional Recommendations

1. **Rotate keys annually** (optional)
2. **Use separate wallet** for agent (already done ✅)
3. **Monitor wallet transactions** on Celoscan
4. **Keep agent wallet balance low** (only what's needed for gas)

---

## 📈 Success Metrics

Monitor these to ensure agent health:

### Daily

- ✅ Agent uptime: Should be 99%+
- ✅ Successful submissions: Should match finished matches
- ✅ Response time: < 10 seconds per submission

### Weekly

- ✅ Error rate: < 1%
- ✅ Wallet balance: > 0.1 CELO
- ✅ Memory usage: Stable (not growing)

---

## 🎯 Final Checklist

- [x] Agent deployed on Railway
- [x] Auto-restart enabled (Railway default)
- [x] Environment variables set correctly
- [x] Wallet has ORACLE_ROLE
- [x] Wallet has sufficient CELO
- [x] Logs showing successful submissions
- [x] STARTUP_BLOCK_LOOKBACK = 500000
- [x] LOG_LEVEL = debug (for monitoring)

### Optional but Recommended

- [ ] Add health check endpoint
- [ ] Set up UptimeRobot monitoring
- [ ] Enable Railway email alerts
- [ ] Add wallet balance monitoring
- [ ] Create Discord/Slack webhook for alerts

---

## 🆘 Emergency Contacts

**Railway Issues:**

- Dashboard: https://railway.app
- Support: https://help.railway.app

**Celo Network Status:**

- Status: https://status.celo.org
- Explorer: https://celoscan.io

**Your Deployments:**

- AI Agent: Railway Project "AI agent"
- Backend: https://truecall-production.up.railway.app
- Frontend: (Your Vercel/hosting URL)

---

## Summary

**Your AI agent will keep running because:**

1. ✅ Railway auto-restarts on crashes
2. ✅ Code has proper error handling
3. ✅ Errors don't crash the process
4. ✅ Resources are managed efficiently
5. ✅ Wallet has funds for gas

**You just need to:**

1. Check logs weekly (5 minutes)
2. Top up wallet CELO monthly (~0.5 CELO)
3. Monitor Railway dashboard occasionally

**The agent is production-ready and will run reliably 24/7!** 🚀
