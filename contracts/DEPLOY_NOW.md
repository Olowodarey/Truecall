# Deploy Your Contract to Testnet - Step by Step

## ⚠️ CRITICAL: Deployment Order Matters!
Because `prediction-market` depends on other contracts, you MUST deploy them in this exact order. Do not skip steps!

### Step 1: Open the Deployment Page
**Go to**: https://explorer.hiro.so/sandbox/deploy?chain=testnet

1. Click **"Connect Stacks Wallet"**
2. Select **Hiro Wallet** and approve the connection
3. Make sure your wallet is set to **Testnet** mode

---

### Step 2: Deploy the Oracle Trait (Required First)
The prediction market uses a trait to define what an oracle looks like.

**Contract Name:**
```
pyth-oracle-trait
```

**Contract Code:**
Copy everything from `/home/olowo/Desktop/truecall1/contracts/contracts/pyth-oracle-trait.clar`

1. Click **Deploy Contract**
2. Confirm in wallet
3. **WAIT for it to confirm** (1-2 minutes) before moving to Step 3!

---

### Step 3: Deploy the Mock Oracle
This is the mock Pyth oracle used for testnet resolution.

**Contract Name:**
```
mock-pyth
```

**Contract Code:**
Copy everything from `/home/olowo/Desktop/truecall1/contracts/contracts/mock-pyth.clar`

1. Click **Deploy Contract**
2. Confirm in wallet
3. **WAIT for it to confirm** (1-2 minutes) before moving to Step 4!

---

### Step 4: Deploy the Prediction Market
Now you can deploy the main contract. I have already updated the code so it defaults to pointing at your own testnet `mock-pyth` contract!

**Contract Name:**
```
prediction-market
```

**Contract Code:**
Copy everything from `/home/olowo/Desktop/truecall1/contracts/contracts/prediction-market.clar`

1. Click **Deploy Contract**
2. Confirm in wallet
3. Wait for confirmation.

---

## ✅ Success!
Your TrueCall prediction market is now fully deployed to testnet!

Your main contract is live at:
`<YOUR_WALLET_ADDRESS>.prediction-market`

The frontend is already configured to read this address in `frontend/lib/contracts.ts`, assuming you deployed with the standard testnet wallet `ST3TWY4THYR9PMMD72N7SA8SE1FJPSF219RNZQY5F`. If you used a different wallet, you will need to update `DEPLOYER` in that file.
