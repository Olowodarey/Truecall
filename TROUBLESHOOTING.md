# TrueCall Event Creation Troubleshooting

## Problem

The frontend was stuck at "Confirming on-chain..." when trying to create an event.

## Root Causes Found & Fixed

### 1. **Contract Not Properly Initialized** ✅ FIXED

- **Issue**: The EventManager contract wasn't wired to the Leaderboard contract
- **Error**: `leaderboard.getTopN()` would revert because leaderboard was never set
- **Solution**: Ran `SetupContracts.s.sol` script to call:
  - `eventManager.setLeaderboard(leaderboardProxy)`
  - `leaderboard.setEventManager(eventManagerProxy)`
  - `eventManager.setAIAgent(aiAgentAddress)`

### 2. **Frontend Date Validation** ⚠️ NEEDS ATTENTION

- **Issue**: The screenshot shows dates in the past (May 15, 2026)
- **Current date**: May 16, 2026
- **Solution**: Use future dates when creating events
  - Start date must be > current time
  - End date must be > start date

### 3. **Transaction Receipt Polling** ✅ IMPROVED

- **Issue**: Wagmi's `useWaitForTransactionReceipt` might timeout or not poll correctly
- **Solution**:
  - Increased polling interval from 1000ms to 2000ms
  - Added status tracking for better debugging
  - Added error display for receipt errors

## Testing

### Terminal Test (Successful)

```bash
forge script script/TestCreateEvent.s.sol --rpc-url celo-sepolia --broadcast
```

**Result**: Event created successfully with ID: 0

### Contract Addresses (Celo Sepolia)

- **EventManager Proxy**: `0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89`
- **Leaderboard Proxy**: `0xa95a8c09A3873C4429E69Ba05fA74dF852f539e2`
- **cUSD Token**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`

## How to Test in Frontend

1. **Use Future Dates**
   - Start: May 20, 2026 or later
   - End: May 27, 2026 or later
   - (Or any dates > current date)

2. **Fill in Event Details**
   - Event Name: "Test Event"
   - Entry Fee: 1 cUSD (minimum)
   - Scoring Rule: Any option

3. **Submit**
   - Click "Create Event On-Chain"
   - Confirm in wallet
   - Wait for "Confirming on-chain..." (should complete within 30-60 seconds)

## If Still Stuck

1. **Check Blockscout**
   - Go to: https://celo-sepolia.blockscout.com/tx/{txHash}
   - Verify transaction status (success/failure)

2. **Check Browser Console**
   - Open DevTools (F12)
   - Look for any error messages
   - Check network tab for RPC calls

3. **Verify Contract State**
   ```bash
   # Check if leaderboard is set
   cast call 0xc76C9f0Bb031245ce145c0b7B822E2d0A1267e89 \
     "leaderboard()" \
     --rpc-url https://forno.celo-sepolia.celo-testnet.org
   ```

## Files Modified

- `/frontend/app/create-event/page.tsx` - Added error handling and improved polling
- `/contracts/EVM-contract/script/SetupContracts.s.sol` - Created to wire contracts
- `/contracts/EVM-contract/script/TestCreateEvent.s.sol` - Created for testing

## Next Steps

1. Test with future dates in the frontend
2. Monitor transaction on Blockscout
3. If issues persist, check the browser console for specific errors
