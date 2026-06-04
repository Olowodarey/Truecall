# ✅ Withdraw Fees Fix - Complete

## Problem

The `withdrawFees()` function always sent fees to the pre-configured `treasury` address. Admin couldn't specify where to send the fees.

## Solution

Updated the function to accept a `recipient` parameter, allowing the admin to specify any address when withdrawing fees.

## What Changed

### 1. Smart Contract (`CreatorEventManager.sol`)

**Before:**

```solidity
function withdrawFees() external onlyOwner nonReentrant {
    pendingFees = 0;
    (bool ok, ) = payable(treasury).call{value: amount}("");
    // Always sends to treasury
}
```

**After:**

```solidity
function withdrawFees(address recipient) external onlyOwner nonReentrant {
    if (recipient == address(0)) revert ZeroAddress();
    pendingFees = 0;
    (bool ok, ) = payable(recipient).call{value: amount}("");
    // Sends to specified recipient
}
```

### 2. Backend ABI (`backend/src/abi/CreatorEventManager.abi.ts`)

**Before:**

```typescript
{
  name: 'withdrawFees',
  inputs: [], // no args
}
```

**After:**

```typescript
{
  name: 'withdrawFees',
  inputs: [{ name: 'recipient', type: 'address' }],
}
```

### 3. Backend Controller (`creator-events.controller.ts`)

**Before:**

```typescript
async withdrawFees() {
  return await this.svc.withdrawFees();
}
```

**After:**

```typescript
async withdrawFees(@Body() body: { recipient: string }) {
  return await this.svc.withdrawFees(body.recipient);
}
```

### 4. Backend Service (`creator-events.service.ts`)

**Before:**

```typescript
async withdrawFees() {
  args: [],
}
```

**After:**

```typescript
async withdrawFees(recipient: string) {
  args: [recipient as `0x${string}`],
}
```

### 5. Frontend ABI (`frontend/lib/creator-contracts.ts`)

**Before:**

```typescript
{
  name: "withdrawFees",
  inputs: [],
}
```

**After:**

```typescript
{
  name: "withdrawFees",
  inputs: [{ name: "recipient", type: "address" }],
}
```

## How to Use

### Via Backend API

```bash
curl -X POST http://localhost:3001/api/creator-events/admin/withdraw-fees \
  -H "Content-Type: application/json" \
  -d '{"recipient": "0xYourWalletAddress"}'
```

### Via Direct Contract Call

```bash
cast send $CONTRACT_ADDRESS \
  "withdrawFees(address)" \
  0xYourWalletAddress \
  --rpc-url $CELO_RPC_URL \
  --private-key $ADMIN_PRIVATE_KEY
```

### Via Frontend (Admin Panel)

The admin panel should have an input field for the recipient address when withdrawing fees.

## Safety Features

### ✅ Zero Address Check

```solidity
if (recipient == address(0)) revert ZeroAddress();
```

Prevents accidentally burning funds.

### ✅ Owner Only

```solidity
function withdrawFees(address recipient) external onlyOwner
```

Only contract owner can withdraw.

### ✅ NonReentrant

```solidity
nonReentrant
```

Prevents reentrancy attacks.

### ✅ Event Emission

```solidity
emit FeesWithdrawn(recipient, amount);
```

Transparent on-chain record of withdrawals.

## Testing

### 1. Check Pending Fees

```bash
cast call $CONTRACT_ADDRESS "pendingFees()" --rpc-url $CELO_RPC_URL
```

### 2. Withdraw to Specific Address

```bash
cast send $CONTRACT_ADDRESS \
  "withdrawFees(address)" \
  0xc232b9Fa329255078A8Cc13e585215e69c44f4D3 \
  --rpc-url $CELO_RPC_URL \
  --private-key $ADMIN_PRIVATE_KEY
```

### 3. Verify Balance Increased

```bash
cast balance 0xc232b9Fa329255078A8Cc13e585215e69c44f4D3 --rpc-url $CELO_RPC_URL
```

## Next Steps

⚠️ **Contract needs to be redeployed** for this change to take effect!

### Option 1: Upgrade (if UUPS proxy)

```bash
cd contracts/EVM-contract
forge script script/Upgrade.s.sol --rpc-url $CELO_RPC_URL --broadcast
```

### Option 2: Deploy New Contract

```bash
cd contracts/EVM-contract
forge script script/Deploy.s.sol --rpc-url $CELO_RPC_URL --broadcast
```

After deployment:

- Update contract address in backend `.env`
- Update contract address in frontend config
- Update contract address in AI agent `.env`

## Benefits

### ✅ Flexibility

- Admin can send fees to any address
- Can split fees between multiple addresses
- Can send to different addresses each time

### ✅ Use Cases

- Send to multisig wallet
- Send to different treasury wallets
- Pay team members directly
- Fund marketing campaigns

### ✅ Security

- Still requires owner approval
- Still has reentrancy protection
- Still emits events for transparency
- Added zero address check

## Example Scenarios

### Scenario 1: Regular Treasury Withdrawal

```bash
# Send to main treasury
withdrawFees(0xTreasuryAddress)
```

### Scenario 2: Pay Developer

```bash
# Send to developer wallet
withdrawFees(0xDeveloperAddress)
```

### Scenario 3: Multiple Recipients

```bash
# Withdraw and split manually
# First half to treasury
withdrawFees(0xTreasuryAddress)

# Wait and accumulate more fees

# Second half to marketing
withdrawFees(0xMarketingAddress)
```

## Summary

✅ **Contract Updated** - Now accepts recipient parameter  
✅ **Backend Updated** - API accepts recipient in request body  
✅ **Frontend ABI Updated** - Ready for UI integration  
✅ **Safety Checks Added** - Zero address validation  
⚠️ **Needs Redeployment** - Contract must be redeployed/upgraded

Admin can now specify exactly where to send accumulated fees! 🎯
