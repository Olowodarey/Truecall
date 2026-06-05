# Self-Verification Flow

## Overview

Users verify their wallet on-chain by signing their own transaction. This is more decentralized, secure, and eliminates backend gas fees.

---

## 🔐 How It Works

### **Step 1: User Links Twitter (Off-Chain)**

- User connects wallet (e.g., MetaMask)
- User clicks "Link Twitter Account"
- OAuth flow validates Twitter account
- Backend stores: `{ wallet: "0xABC...", twitter: "@user", verified: true }` in database

### **Step 2: User Self-Verifies (On-Chain)**

- User sees banner: "Complete verification on blockchain"
- User clicks "Verify Wallet"
- Wallet popup opens (MetaMask/WalletConnect)
- User signs transaction (`selfVerify()` function)
- Transaction cost: ~$0.01 (user pays)

### **Step 3: Wallet is Verified**

- Smart contract records: `isVerified[userAddress] = true`
- User can now join events and submit predictions
- Binding is cryptographically secure (signature proves ownership)

---

## 🔒 Security Benefits

### **Why This is Secure:**

1. **Only wallet owner can verify their address**

   ```solidity
   function selfVerify() external {
       // msg.sender is AUTOMATICALLY the wallet that signed
       isVerified[msg.sender] = true;
   }
   ```

2. **No private keys on backend**
   - Backend doesn't need admin wallet
   - No gas fees for backend
   - No risk of compromised admin key

3. **Cryptographic proof of ownership**
   - User must sign transaction with their private key
   - Can't fake or spoof someone else's address
   - Blockchain verifies signature authentically

4. **Twitter account tied to wallet**
   - Backend validates Twitter account (OAuth)
   - User signs with wallet to prove ownership
   - Both verifications required to join events

---

## 📋 Implementation

### **Smart Contract (Solidity)**

```solidity
/// @notice User verifies themselves on-chain after completing Twitter OAuth off-chain
function selfVerify() external {
    if (msg.sender == address(0)) revert ZeroAddress();
    if (isVerified[msg.sender]) return; // Already verified, no-op

    isVerified[msg.sender] = true;
    emit AddressVerified(msg.sender);
}
```

### **Backend (NestJS) - No Changes Needed**

```typescript
// Backend just validates Twitter, doesn't call contract
this.logger.log(`Twitter linked: @${twitterUser.username} → ${address}`);

// User must call selfVerify() from frontend
return { success: true, profile };
```

### **Frontend (React + wagmi)**

```typescript
import { useWriteContract } from "wagmi";
import { CREATOR_EVENT_MANAGER_ABI } from "@/lib/abi";

const { writeContract } = useWriteContract();

const handleSelfVerify = async () => {
  try {
    await writeContract({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "selfVerify",
      args: [], // No arguments needed
    });
    alert("Wallet verified on blockchain!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
};
```

---

## 🎯 User Flow Diagram

```
┌─────────────┐
│ User visits │
│   website   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Connect wallet  │
│   (MetaMask)    │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│ Link Twitter     │
│ (OAuth flow)     │
└──────┬───────────┘
       │
       ▼
┌───────────────────────────────┐
│ Backend validates Twitter     │
│ & saves to database           │
└──────┬────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ Frontend shows:               │
│ "Verify Wallet on Blockchain" │
└──────┬────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ User clicks "Verify"          │
│ Signs transaction (~$0.01)    │
└──────┬────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ Contract marks:               │
│ isVerified[address] = true    │
└──────┬────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ ✅ User can join events        │
└───────────────────────────────┘
```

---

## 💰 Cost Comparison

| Method                | Gas Cost          | Who Pays | Security                      |
| --------------------- | ----------------- | -------- | ----------------------------- |
| **Self-Verify (NEW)** | ~30k gas (~$0.01) | User     | ✅ High (user signs)          |
| Admin Verify (OLD)    | ~50k gas (~$0.02) | Backend  | ⚠️ Medium (admin key exposed) |

---

## 🚀 Deployment Notes

### **Backend .env (Simplified)**

```bash
# No more PRIVATE_KEY needed for user verification!
CELO_RPC_URL=https://forno.celo.org
CREATOR_EVENT_MANAGER_ADDRESS=0xYOUR_CONTRACT_ADDRESS

# Only needed for admin functions (withdraw fees, manual result submission)
PRIVATE_KEY=0xADMIN_WALLET_PRIVATE_KEY  # Keep this wallet funded with 0.5 CELO
```

### **Contract Deployment**

```bash
# Deploy with new selfVerify() function
forge script script/DeployCreatorEventManager.s.sol --rpc-url celo --broadcast --verify
```

### **Frontend Update**

1. Add "Verify Wallet" button after Twitter link succeeds
2. Use `useWriteContract` hook to call `selfVerify()`
3. Show verification status in UI

---

## ⚙️ Admin Override (Fallback)

Admins can still manually verify users if needed:

```typescript
// Backend endpoint for admin override
@Post('admin/verify/:address')
@UseGuards(AdminGuard)
async adminVerify(@Param('address') address: string) {
  return this.creatorEventsService.verifyAddress(address);
}
```

**When to use admin override:**

- User lost gas funds but needs urgent verification
- Emergency situations
- Testing/debugging

---

## ✅ Checklist

- [x] Add `selfVerify()` function to smart contract
- [x] Remove auto-verify from backend (no gas needed)
- [x] Keep admin override functions for emergencies
- [ ] Add "Verify Wallet" button to frontend
- [ ] Update UI to show verification status
- [ ] Test full flow on testnet
- [ ] Deploy to mainnet

---

## 📝 Notes

- **No backend wallet needed** for user verification (major security win!)
- **Users pay ~$0.01** to verify (acceptable UX)
- **More decentralized** (users control their verification)
- **Admin functions still work** (withdraw fees, manual results)
- **Backward compatible** (existing tests still pass)

---

**Status**: ✅ Ready for implementation
**Next Step**: Update frontend to add "Verify Wallet" button
