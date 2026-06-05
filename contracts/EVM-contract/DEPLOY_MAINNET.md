# Celo Mainnet Deployment Guide

## 📋 Pre-Deployment Checklist

### **Wallet Setup** ✅

- [x] Deployer wallet: `0x2c2A6E42E71350f80248Aee308Bd04A898c0C694`
- [x] Balance: **5.0 CELO** (sufficient for deployment ~0.5 CELO)
- [x] Backend admin: `0x684835A1f131dcC3D4fF49A356556Fe0188Bd062`
- [x] AI agent: `0x684835A1f131dcC3D4fF49A356556Fe0188Bd062`

### **Missing Configuration** ⚠️

- [ ] `TREASURY_ADDRESS` - Where should platform fees go?
- [ ] `CELOSCAN_API_KEY` - For contract verification (get from https://celoscan.io/myapikey)

### **Contract Settings**

- Creation Fee: **1.0 CELO** per event
- Max Participants: **200** per event
- Max Matches: **5** per event

---

## 🚀 Deployment Steps

### **Step 1: Set Treasury Address**

**Option A: Use deployer as treasury (simple)**

```bash
# In .env, set:
TREASURY_ADDRESS=0x2c2A6E42E71350f80248Aee308Bd04A898c0C694
```

**Option B: Use a different wallet (recommended for security)**

```bash
# In .env, set to your preferred treasury wallet:
TREASURY_ADDRESS=0xYourTreasuryWalletHere
```

### **Step 2: Get Celoscan API Key (Optional but Recommended)**

1. Visit https://celoscan.io/myapikey
2. Sign up/log in
3. Create new API key
4. Add to `.env`:

```bash
CELOSCAN_API_KEY=YOUR_KEY_HERE
```

### **Step 3: Deploy Contract**

```bash
# Dry run (simulation - no actual deployment)
forge script script/DeployCreatorEventManager.s.sol --rpc-url celo

# Real deployment + verification
forge script script/DeployCreatorEventManager.s.sol \
  --rpc-url celo \
  --broadcast \
  --verify \
  --gas-estimate-multiplier 150
```

**Expected output:**

```
=== CreatorEventManager Deployment (Role-Based) ===
Network:        Celo Mainnet
Deployer:       0x2c2A...C694 (DEFAULT_ADMIN_ROLE)
Backend Admin:  0x6848...d062 (ADMIN_ROLE)
Treasury:       0x....
AI Agent:       0x6848...d062 (ORACLE_ROLE)
Fee (wei):      1000000000000000000
Chain ID:       42220

Impl:           0x....
Proxy:          0x....
Fee set:        1000000000000000000 wei CELO

=== Done ===
CREATOR_EVENT_MANAGER_PROXY= 0x....
CREATOR_EVENT_MANAGER_IMPL=  0x....
```

### **Step 4: Save Contract Address**

Copy the `CREATOR_EVENT_MANAGER_PROXY` address and update:

1. **contracts/.env**

```bash
CREATOR_EVENT_MANAGER_ADDRESS=0xYourProxyAddress
```

2. **backend/.env**

```bash
CREATOR_EVENT_MANAGER_ADDRESS=0xYourProxyAddress
```

3. **ai-agent/.env**

```bash
CREATOR_EVENT_MANAGER_ADDRESS=0xYourProxyAddress
```

4. **frontend/.env.local**

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourProxyAddress
```

---

## 🔍 Post-Deployment Verification

### **1. Check Contract on Celoscan**

```
https://celoscan.io/address/0xYourProxyAddress
```

Verify:

- ✅ Contract is verified (green checkmark)
- ✅ Read/Write functions visible
- ✅ Proxy implementation linked

### **2. Test Contract Functions**

**Check roles are assigned:**

```bash
# Check deployer has DEFAULT_ADMIN_ROLE
cast call 0xYourProxyAddress \
  "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  0x2c2A6E42E71350f80248Aee308Bd04A898c0C694 \
  --rpc-url celo

# Check backend admin has ADMIN_ROLE
cast call 0xYourProxyAddress \
  "hasRole(bytes32,address)(bool)" \
  $(cast keccak "ADMIN_ROLE") \
  0x684835A1f131dcC3D4fF49A356556Fe0188Bd062 \
  --rpc-url celo

# Check AI agent has ORACLE_ROLE
cast call 0xYourProxyAddress \
  "hasRole(bytes32,address)(bool)" \
  $(cast keccak "ORACLE_ROLE") \
  0x684835A1f131dcC3D4fF49A356556Fe0188Bd062 \
  --rpc-url celo
```

**Check creation fee:**

```bash
cast call 0xYourProxyAddress "creationFee()(uint256)" --rpc-url celo
# Should return: 1000000000000000000 (1 CELO in wei)
```

### **3. Fund Admin and AI Agent Wallets**

Send CELO for gas:

```bash
# Backend admin needs ~0.5 CELO for verifications and fee withdrawals
# AI agent needs ~0.2 CELO for submitting match results

cast send 0x684835A1f131dcC3D4fF49A356556Fe0188Bd062 \
  --value 0.7ether \
  --private-key 0x3b75a3375d022a57a722d71d15e5e96253d0d9ae9af2f77cb5afec9da25ec4ac \
  --rpc-url celo
```

---

## 🔄 Update All Services

### **1. Backend (Railway)**

Update environment variables in Railway dashboard:

```bash
CREATOR_EVENT_MANAGER_ADDRESS=0xYourProxyAddress
PRIVATE_KEY=0x....  # Backend admin private key (has ADMIN_ROLE)
```

Redeploy backend.

### **2. AI Agent**

Update `.env`:

```bash
CREATOR_EVENT_MANAGER_ADDRESS=0xYourProxyAddress
AGENT_PRIVATE_KEY=0x....  # AI agent private key (has ORACLE_ROLE)
```

Restart AI agent service.

### **3. Frontend (Netlify)**

Update environment variables:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourProxyAddress
NEXT_PUBLIC_ADMIN_ADDRESS=0x684835A1f131dcC3D4fF49A356556Fe0188Bd062
```

Redeploy frontend.

---

## ✅ Final Smoke Test

### **Test Flow:**

1. ✅ User connects wallet on frontend
2. ✅ User links Twitter account
3. ✅ User clicks "Verify Wallet" → Signs transaction → Verified on-chain
4. ✅ Creator creates event (pays 1 CELO)
5. ✅ Verified user joins event (free)
6. ✅ User submits prediction
7. ✅ AI agent submits match result
8. ✅ Winners are recorded
9. ✅ Admin withdraws fees

---

## 📊 Cost Breakdown

| Action            | Gas Cost  | CELO Cost @ 5 Gwei |
| ----------------- | --------- | ------------------ |
| Deploy Contract   | ~3.5M gas | ~0.4 CELO          |
| Self-Verify       | ~30k gas  | ~$0.01             |
| Create Event      | ~350k gas | ~$0.09             |
| Join Event        | ~80k gas  | ~$0.02             |
| Submit Prediction | ~65k gas  | ~$0.016            |
| Submit Result     | ~200k gas | ~$0.05             |
| Withdraw Fees     | ~45k gas  | ~$0.011            |

**Total deployment cost: ~0.5 CELO**

---

## 🆘 Troubleshooting

### **"Insufficient funds for gas"**

- Send more CELO to deployer wallet
- Reduce `--gas-estimate-multiplier` to 120

### **"Invalid private key"**

- Ensure private key has `0x` prefix
- Check for extra spaces in `.env`

### **"Contract not verified"**

- Ensure `CELOSCAN_API_KEY` is set
- Manually verify: https://celoscan.io/verifyContract
- Use flattened source from: `forge flatten src/CreatorEventManager.sol`

### **"Role not granted"**

- Check deployment logs for role assignments
- Manually grant role using Celoscan Write Contract interface

---

## 📝 Important Notes

⚠️ **NEVER commit the real `.env` file to git!**
⚠️ **Back up your private keys securely (encrypted storage)**
⚠️ **Test on testnet first if unsure**
⚠️ **Proxy address never changes - save it permanently**
⚠️ **Implementation can be upgraded later (UUPS)**

---

**Ready to deploy? Follow Step 1 first!** 🚀
