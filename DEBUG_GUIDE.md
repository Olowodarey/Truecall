# Frontend Transaction Debugging Guide

## What to Do Now

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Try creating an event** with future dates
4. **Watch the console** for logs

## What You'll See

### Expected Console Output

```
=== Creating Event ===
Event Name: Test Event
Start Timestamp: 1779257646 2026-05-20T09:00:46.000Z
End Timestamp: 1779862446 2026-05-27T09:00:46.000Z
Entry Fee (wei): 1000000000000000000
Scoring Rule: 2
Contract Address: 0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89
Function: createPublicEvent

Transaction Hash: 0x...
Blockscout Link: https://celo-sepolia.blockscout.com/tx/0x...

Manual RPC Receipt: {
  blockHash: "0x...",
  blockNumber: "0x...",
  status: "0x1",  // 0x1 = success, 0x0 = failed
  ...
}

Receipt Status: success
Transaction Confirmed!
```

## Troubleshooting

### If You See "Manual RPC Receipt: null"

- Transaction hasn't been mined yet
- Wait a few more seconds
- Check Blockscout link manually

### If You See "status: 0x0"

- Transaction failed on-chain
- Check the error message in Blockscout
- Look for revert reason

### If You See "RPC Error"

- Network connectivity issue
- RPC endpoint might be down
- Try refreshing the page

### If Console Shows Nothing

- Check if wallet is connected
- Check if dates are in the future
- Look for validation errors

## Manual Testing via Terminal

If frontend still doesn't work, test via terminal:

```bash
cd /home/olowo/Desktop/my projects/Truecall/contracts/EVM-contract

# Run the test script
forge script script/TestCreateEvent.s.sol --rpc-url celo-sepolia --broadcast
```

This will show you if the contract itself is working.

## Key Contract Details

- **EventManager Proxy**: `0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89`
- **Function**: `createPublicEvent(string, uint256, uint256, uint256, uint8)`
- **Parameters**:
  - eventName: string (max 64 chars)
  - startDate: unix timestamp (must be > now)
  - endDate: unix timestamp (must be > startDate)
  - entryFee: wei (minimum 1e18 = 1 cUSD)
  - scoringRule: 0=ExactOnly, 1=OutcomeOnly, 2=Both

## What Changed in Frontend

1. Added console logging for all transaction data
2. Added manual RPC receipt checking every 5 seconds
3. Added transaction hash display in UI
4. Added receipt error display

## Next Steps

1. Try creating an event with future dates
2. Watch the console for logs
3. Share the console output if it fails
4. Check Blockscout link for transaction details
