# Smart Contract Deployment - Quick Start

## Step 1: Install Hiro Wallet

1. **Download**: https://wallet.hiro.so/wallet/install-web
2. **Install** the browser extension (Chrome/Firefox/Brave)
3. **Create a new wallet** or import existing
4. **Save your Secret Key** (24 words) - KEEP IT SAFE!

## Step 2: Switch to Testnet

1. Open Hiro Wallet
2. Click **Settings** (gear icon)
3. Click **Change Network**
4. Select **Testnet**

## Step 3: Get Free Testnet STX

1. Go to: https://explorer.hiro.so/sandbox/faucet?chain=testnet
2. **Connect your wallet** (click "Connect Wallet")
3. Click **"Request STX"**
4. Wait ~30 seconds for confirmation
5. You should receive **500 testnet STX** (free!)

## Step 4: Deploy Your Contract

1. **Go to**: https://explorer.hiro.so/sandbox/deploy?chain=testnet
2. **Connect your Hiro Wallet**
3. **Contract Name**: Enter `football-prediction`
4. **Contract Code**: Copy the entire content from:
   ```
   /home/olowo/Desktop/truecall1/contracts/contracts/football-prediction.clar
   ```
5. Click **"Deploy Contract"**
6. **Confirm** the transaction in your wallet
7. Wait for confirmation (~1-2 minutes)

## Step 5: Copy Your Contract Details

After deployment, you'll see:

- **Transaction ID**: `0x123abc...`
- **Contract Address**: Your wallet address (starts with `ST`)

**Copy these values!**

## Step 6: Update Backend `.env`

Open `/home/olowo/Desktop/truecall1/backend/.env` and update:

```bash
# Replace these with your actual values:
CONTRACT_ADDRESS=ST1ABC...XYZ  # Your wallet address
CONTRACT_NAME=football-prediction
ORACLE_PRIVATE_KEY=your_64_char_hex_private_key
ORACLE_ADDRESS=ST1ABC...XYZ  # Same as CONTRACT_ADDRESS
```

### How to Get Your Private Key:

1. Open Hiro Wallet
2. Click **Settings** → **View Secret Key**
3. Enter your password
4. Copy the **hex private key** (64 characters)
5. Paste into `.env`

## Step 7: Restart Backend

```bash
# The server will auto-restart if still running
# Or manually restart:
cd /home/olowo/Desktop/truecall1/backend
pnpm run start:dev
```

## Step 8: Test the Connection

```bash
# Test creating an event
curl -X POST http://localhost:3001/api/oracle/create-event \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "Test Match",
    "matchId": 1,
    "accessCode": "TEST123"
  }'
```

---

## ✅ Success Checklist

- [ ] Hiro Wallet installed and set to testnet
- [ ] Received testnet STX from faucet
- [ ] Contract deployed successfully
- [ ] Contract address copied
- [ ] Backend `.env` updated with contract details
- [ ] Backend server restarted
- [ ] Test API call successful

---

## 🆘 Need Help?

**Can't install Hiro Wallet?**

- Try different browser
- Or use Clarinet deployment method from the main plan

**Deployment failed?**

- Check you have enough testnet STX
- Verify contract code has no syntax errors
- Try again in a few minutes

**Backend can't connect to contract?**

- Double-check contract address in `.env`
- Ensure private key is correct (64 hex characters)
- Verify network is set to `testnet`

---

## 🎯 Ready to Start?

Follow the steps above, and let me know when you:

1. Have Hiro Wallet installed
2. Have testnet STX
3. Are ready to deploy

I can help at any step!
