# CreatorEventManager Contract Redeployment Complete ✅

## Deployment Date

June 4, 2026

## What Changed

Updated the `withdrawFees` function to accept a recipient address parameter instead of always sending to the pre-configured treasury address.

### New Function Signature

```solidity
function withdrawFees(address recipient) external onlyOwner nonReentrant {
    if (recipient == address(0)) revert ZeroAddress();

    uint256 amount = pendingFees;
    if (amount == 0) revert NothingToWithdraw();

    pendingFees = 0;
    (bool ok, ) = payable(recipient).call{value: amount}("");
    require(ok, "CELO transfer failed");

    emit FeesWithdrawn(recipient, amount);
}
```

## New Contract Addresses

### Celo Sepolia Testnet

- **Proxy (use this)**: `0x10C6D0bD4500B1Dd4c24B1D10B7648Ed98453309`
- **Implementation**: `0x6df532983BE854A39070885BBDD384E5a0213dB2`
- **Network**: Celo Sepolia Testnet (Chain ID: 11142220)
- **Creation Fee**: 0.1 CELO (100000000000000000 wei)

### Deployment Details

- **Deployer**: 0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b
- **Treasury**: 0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b
- **AI Agent**: 0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b
- **Total Gas Paid**: 0.137194150002743883 CELO

### Transaction Hashes

1. **Proxy Deployment**: `0xbf19f776894986af72b0579e1bc0df676571a876aca07a9eb0d78e8f08e3d3bc`
2. **Implementation Deployment**: `0x205ed49d08f0f553cbd3eabc79f343b0955e484c6d235f8912d090b44def8df0`
3. **Creation Fee Set**: `0xed193fd5327cdfec4eb4388ae56feb9528c2c570c5e1b38fd2ab5737e66735c5`

## Files Updated

✅ **Backend**

- `backend/.env` - Updated `CREATOR_EVENT_MANAGER_ADDRESS`

✅ **AI Agent**

- `ai-agent/.env` - Updated `CREATOR_EVENT_MANAGER_ADDRESS`

✅ **Frontend**

- `frontend/lib/creator-contracts.ts` - Updated `CREATOR_EVENT_MANAGER_ADDRESS` and comment

✅ **Contracts**

- `contracts/EVM-contract/.env` - Added `CREATOR_EVENT_MANAGER_ADDRESS`
- `contracts/EVM-contract/deployments/celo-sepolia.json` - Added new deployment info

## How to Use the New withdrawFees Function

### From Backend API

```typescript
POST /creator-events/withdraw-fees
Content-Type: application/json

{
  "recipient": "0xYourWalletAddress"
}
```

### From Smart Contract (using cast)

```bash
cast send 0x10C6D0bD4500B1Dd4c24B1D10B7648Ed98453309 \
  "withdrawFees(address)" \
  0xYourWalletAddress \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
  --private-key $PRIVATE_KEY
```

### From Frontend (using wagmi)

```typescript
const { writeContract } = useWriteContract();

await writeContract({
  address: CREATOR_EVENT_MANAGER_ADDRESS,
  abi: CREATOR_EVENT_MANAGER_ABI,
  functionName: "withdrawFees",
  args: [recipientAddress],
});
```

## Next Steps

1. **Restart Backend**: The backend needs to be restarted to use the new contract address
2. **Rebuild Frontend**: The frontend needs to be rebuilt to update the contract address in the build
3. **Test Withdrawal**: Create a test event (costs 0.1 CELO) and then withdraw fees to verify the new function works

## Verification

View the deployed contract on Blockscout:

- Proxy: https://celo-sepolia.blockscout.com/address/0x10C6D0bD4500B1Dd4c24B1D10B7648Ed98453309
- Implementation: https://celo-sepolia.blockscout.com/address/0x6df532983BE854A39070885BBDD384E5a0213dB2

## Old Contract Address (Deprecated)

❌ `0xD360E9eF6bF50A357c77fA17474a4838c2379B3f` - Do not use this address anymore
