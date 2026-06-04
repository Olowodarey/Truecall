# 🔧 TrueCall Deployment Troubleshooting Guide

Common issues and solutions when deploying to Railway + Vercel.

---

## 🚂 Railway Backend Issues

### Issue: Build Failed

**Symptoms:**

- Railway shows "Build failed" status
- Logs show compilation errors

**Solutions:**

1. Check Railway logs for specific error
2. Ensure `package.json` has correct scripts:
   ```json
   "scripts": {
     "build": "nest build",
     "start:prod": "node dist/main"
   }
   ```
3. Verify TypeScript compiles locally:
   ```bash
   cd backend
   npm run build
   ```
4. Check if `tsconfig.json` and `nest-cli.json` are present

---

### Issue: Database Connection Failed

**Symptoms:**

- Backend starts but crashes immediately
- Logs show: "Could not connect to database"
- Logs show: "Connection terminated unexpectedly"

**Solutions:**

**Option 1: Use Railway Variable References (Recommended)**

```bash
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
```

**Option 2: Manually Copy Values**

1. Go to PostgreSQL service in Railway
2. Click **Connect** → **Variables**
3. Copy each value exactly:
   - `PGHOST` → `DATABASE_HOST`
   - `PGPORT` → `DATABASE_PORT`
   - `PGUSER` → `DATABASE_USERNAME`
   - `PGPASSWORD` → `DATABASE_PASSWORD`
   - `PGDATABASE` → `DATABASE_NAME`

**Option 3: Use DATABASE_URL**
Some Railway setups provide a single `DATABASE_URL`. If so, update your TypeORM config to use it:

```typescript
// In app.module.ts or database config
url: process.env.DATABASE_URL;
```

---

### Issue: "Connected to Celo Sepolia" in Logs

**Symptoms:**

- Logs show "Connected to Celo Sepolia" instead of "Celo Mainnet"
- Using wrong blockchain network

**Solutions:**

1. Update blockchain service initialization in `backend/src/blockchain/blockchain.service.ts`
2. Ensure it uses `celoMainnet` (Chain ID 42220) not `celoSepolia`
3. Verify `CELO_RPC_URL=https://forno.celo.org` (mainnet RPC)
4. Redeploy backend after changes

---

### Issue: Backend URL Returns 404

**Symptoms:**

- Can't access `https://your-backend.up.railway.app`
- 404 Not Found error

**Solutions:**

1. Check if domain is generated in Railway:
   - Go to Settings → Networking
   - Click "Generate Domain" if not present
2. Verify backend is running (check Logs tab)
3. Try accessing with `/api` path: `https://your-backend.up.railway.app/api`

---

### Issue: CORS Errors

**Symptoms:**

- Browser console shows: "CORS policy blocked"
- Frontend can't call backend API

**Solutions:**

1. Verify `app.enableCors()` is in `backend/src/main.ts` ✅ (already added)
2. Check backend logs for incoming requests
3. Ensure frontend is using correct Railway backend URL
4. Try accessing backend directly in browser to verify it's running

---

### Issue: Environment Variables Not Working

**Symptoms:**

- Backend uses wrong values
- Features not working as expected

**Solutions:**

1. In Railway Variables tab, check each variable is set
2. No quotes needed around values in Railway (Railway handles this)
3. Redeploy after adding/changing variables:
   - Click service → Deployments
   - Click "..." → Redeploy
4. Check logs to see if variables are loaded:
   ```
   console.log('Contract Address:', process.env.CREATOR_EVENT_MANAGER_ADDRESS);
   ```

---

### Issue: Private Key Insufficient Gas

**Symptoms:**

- Twitter verification fails
- Logs show: "insufficient funds for gas"

**Solutions:**

1. Check balance of admin wallet: `0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b`
2. Send some CELO to this address for gas fees
3. Minimum: 0.1 CELO should be enough for many verifications
4. Check on Celoscan: https://celoscan.io/address/0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b

---

## 🎨 Vercel Frontend Issues

### Issue: Environment Variable Not Loading

**Symptoms:**

- `process.env.NEXT_PUBLIC_API_URL` is undefined
- Frontend can't connect to backend

**Solutions:**

1. In Vercel, go to Settings → Environment Variables
2. Ensure variable name starts with `NEXT_PUBLIC_`
3. After adding variable, **MUST redeploy**:
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
4. Verify in browser console:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL);
   ```

---

### Issue: API Calls Return 404

**Symptoms:**

- Frontend loads but API calls fail
- Network tab shows 404 errors

**Solutions:**

1. Check `NEXT_PUBLIC_API_URL` includes `/api` at the end
2. Correct format: `https://backend.up.railway.app/api`
3. Not: `https://backend.up.railway.app` (missing `/api`)
4. Verify Railway backend is actually running (check Railway logs)

---

### Issue: Wrong Network Showing

**Symptoms:**

- Frontend shows "Celo Sepolia Testnet"
- Contract calls fail

**Solutions:**

1. Check `frontend/lib/wagmi.ts` uses `celo` not `celoSepolia`
2. Verify contract address is mainnet address: `0x8A18Da2A173b3951c797a438102345cF92838880`
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. Check MetaMask/wallet is connected to Celo Mainnet (Chain ID 42220)

---

### Issue: Build Failed on Vercel

**Symptoms:**

- Vercel deployment fails
- Build logs show errors

**Solutions:**

1. Check Vercel build logs for specific error
2. Verify build works locally:
   ```bash
   cd frontend
   npm run build
   ```
3. Ensure all dependencies are in `package.json`
4. Check if TypeScript errors exist (run `npm run type-check` locally)

---

## 🐦 Twitter OAuth Issues

### Issue: Callback URL Mismatch

**Symptoms:**

- Error: "Callback URL mismatch" when linking Twitter
- Twitter OAuth fails

**Solutions:**

1. **Twitter Developer Portal must match backend env:**
   - Twitter Portal: `https://your-app.vercel.app/profile/twitter/callback`
   - Railway `TWITTER_REDIRECT_URI`: `https://your-app.vercel.app/profile/twitter/callback`
2. Both must be **exactly the same** (including `https://`)
3. Both must use Vercel URL, not localhost
4. Save changes in Twitter Portal and redeploy backend

---

### Issue: Redirects to Localhost After Twitter Auth

**Symptoms:**

- After Twitter authorization, redirects to `localhost:3000`
- Should redirect to Vercel URL

**Solutions:**

1. Update `TWITTER_REDIRECT_URI` in Railway to Vercel URL
2. Update Twitter Developer Portal callback URI to Vercel URL
3. Clear browser cookies and try again
4. Check if multiple callback URIs exist - remove localhost from production

---

### Issue: Twitter Linked but Not Verified on Chain

**Symptoms:**

- Twitter links successfully
- Profile shows "Not Verified"
- Backend logs show success but contract verification fails

**Solutions:**

1. Check backend logs for `verifyAddress()` transaction hash
2. Search transaction on Celoscan: https://celoscan.io/
3. Check if transaction failed (insufficient gas, etc.)
4. Verify admin wallet has CELO for gas
5. Check contract address is correct: `0x8A18Da2A173b3951c797a438102345cF92838880`
6. Ensure backend uses `celoMainnet` not `celoSepolia`

---

### Issue: Twitter App Not Approved

**Symptoms:**

- Twitter OAuth shows "Application is not approved" error

**Solutions:**

1. Ensure Twitter app has OAuth 2.0 enabled
2. App must be in "Production" mode or have OAuth 2.0 properly configured
3. Check Twitter Developer Portal → App Settings → User authentication settings
4. Ensure "OAuth 2.0" is enabled with appropriate scopes

---

## 🗄️ Database Issues

### Issue: Tables Don't Exist

**Symptoms:**

- Errors about missing tables
- "relation 'users' does not exist"

**Solutions:**

1. TypeORM should auto-create tables on first run
2. Check if `synchronize: true` in TypeORM config
3. Manually connect to Railway PostgreSQL and check:
   ```bash
   # Get connection string from Railway
   psql "postgresql://..."
   \dt  # List tables
   ```
4. If no tables, TypeORM might not be initializing properly
5. Check backend logs for TypeORM connection errors

---

### Issue: Old Testnet Data Interfering

**Symptoms:**

- Can't link Twitter - says already linked
- Wallet shows old testnet data

**Solutions:**

1. Connect to Railway PostgreSQL
2. Clear users table:
   ```sql
   TRUNCATE TABLE users RESTART IDENTITY CASCADE;
   ```
3. Fresh start for mainnet
4. Or update records manually:
   ```sql
   DELETE FROM users WHERE wallet_address = '0x...';
   ```

---

## 🔐 Smart Contract Issues

### Issue: Transaction Fails - Wrong Network

**Symptoms:**

- Contract calls fail in MetaMask
- Error about wrong chain ID

**Solutions:**

1. Ensure wallet connected to **Celo Mainnet** (Chain ID 42220)
2. Not Celo Alfajores (44787) or Sepolia (11142220)
3. In MetaMask: Networks → Celo Mainnet
4. RPC URL: `https://forno.celo.org`

---

### Issue: Contract Not Verified/Not Found

**Symptoms:**

- Contract calls return errors
- Can't read contract state

**Solutions:**

1. Verify contract address: `0x8A18Da2A173b3951c797a438102345cF92838880`
2. Check on Celoscan: https://celoscan.io/address/0x8A18Da2A173b3951c797a438102345cF92838880
3. Ensure using mainnet RPC: `https://forno.celo.org`
4. Verify ABI matches deployed contract

---

### Issue: Insufficient Funds for Creation Fee

**Symptoms:**

- Can't create event
- Error: "insufficient funds"

**Solutions:**

1. Event creation costs **1 CELO**
2. Plus gas fees (~0.01 CELO)
3. Ensure wallet has at least 1.1 CELO
4. Check balance on Celoscan

---

## 🚨 Emergency Debugging

### Get All Relevant Logs

**Railway Backend:**

```
1. Railway Dashboard → Backend Service → Logs
2. Look for startup messages, errors, API calls
3. Download logs if needed (click "..." → Download)
```

**Vercel Frontend:**

```
1. Vercel Dashboard → Deployments → Latest → View Logs
2. Check build logs and runtime logs
3. Also check browser console for client-side errors
```

**Browser Console:**

```
1. Open browser DevTools (F12)
2. Console tab - JavaScript errors
3. Network tab - Failed API calls
4. Application tab - Check localStorage, cookies
```

---

### Nuclear Option: Redeploy Everything

If nothing works:

1. **Railway Backend:**
   - Click service → Settings → Danger
   - Restart service
   - Or redeploy from latest commit

2. **Vercel Frontend:**
   - Deployments → Redeploy
   - With cache cleared

3. **Clear All Caches:**
   - Browser: Clear site data
   - Wallet: Disconnect and reconnect
   - Database: Verify clean state

---

## 📞 Getting Help

### Check These First:

- [ ] Railway backend is running (check logs)
- [ ] Database is connected (check logs for connection success)
- [ ] Vercel frontend deployed successfully
- [ ] Environment variables are set correctly
- [ ] Twitter OAuth URLs match between Portal and Railway
- [ ] Wallet connected to Celo Mainnet
- [ ] Contract address is correct mainnet address

### Useful Commands:

**Check backend health:**

```bash
curl https://your-backend.up.railway.app/api
```

**Check specific endpoint:**

```bash
curl https://your-backend.up.railway.app/api/creator-events/fee
```

**Verify env variable in Railway:**

```
Add temporary log in backend:
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
Check logs after redeploy
```

---

## 📚 Resources

- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **NestJS Docs**: https://docs.nestjs.com/
- **Viem Docs**: https://viem.sh/
- **Celo Docs**: https://docs.celo.org/
- **Twitter OAuth Docs**: https://developer.twitter.com/en/docs/authentication/oauth-2-0

---

**Still stuck? Check Railway logs first - they usually have the answer! 🔍**
