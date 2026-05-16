# How to Debug the Transaction Issue

## What I've Added to Frontend

### 1. **Console Logging**

When you create an event, the console will show:

- Event parameters (name, dates, fee, scoring rule)
- Transaction hash
- Blockscout link
- Receipt status updates
- Any errors

### 2. **Manual RPC Receipt Checking**

Every 5 seconds, the frontend will:

- Call `eth_getTransactionReceipt` directly via RPC
- Log the receipt status
- Show if transaction succeeded or failed

### 3. **Better Error Display**

- Shows receipt errors in the UI
- Displays transaction hash in the form
- Shows Blockscout link

## How to Test

### Step 1: Open Browser DevTools

```
Press F12 → Go to Console tab
```

### Step 2: Create an Event

- Event Name: "Test Event"
- Start Date: **May 20, 2026** (or any future date)
- Start Time: 9:00 AM
- End Date: **May 27, 2026** (or later)
- End Time: 11:00 PM
- Entry Fee: 1 cUSD
- Scoring Rule: Both (Score + Outcome)

### Step 3: Watch Console

You should see logs like:

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
  status: "0x1",
  ...
}

Receipt Status: success
Transaction Confirmed!
```

### Step 4: Check Blockscout

Click the Blockscout link or visit:

```
https://celo-sepolia.blockscout.com/tx/{txHash}
```

## If Transaction Fails

### Check Console for Error

Look for messages like:

- `StartDateInPast()` - Use future dates
- `EndDateBeforeStart()` - End date must be after start
- `FeeTooLow()` - Minimum 1 cUSD
- `OnlyOwner()` - Only admin can create events

### Check Blockscout

- Status: Success (0x1) or Failed (0x0)
- Revert Reason: Shows why it failed
- Gas Used: Shows if it ran out of gas

## Alternative: Test via Terminal

If frontend still doesn't work, test directly:

```bash
cd /home/olowo/Desktop/my projects/Truecall/contracts/EVM-contract

# Using Forge script
forge script script/TestCreateEvent.s.sol --rpc-url celo-sepolia --broadcast

# Or using cast directly
export PRIVATE_KEY=0x...
./test-create-event.sh
```

## Files Modified

1. **frontend/app/create-event/page.tsx**
   - Added console logging for all parameters
   - Added manual RPC receipt checking
   - Added transaction hash display
   - Added receipt error display

2. **contracts/EVM-contract/test-create-event.sh**
   - New script to test via cast CLI

## What to Share If It Fails

1. **Console output** (screenshot or copy-paste)
2. **Blockscout link** (from the transaction hash)
3. **Error message** (if any)
4. **Dates used** (to verify they're in the future)

## Key Points

- ✅ Contract is working (tested via terminal)
- ✅ Setup is complete (contracts are wired)
- ✅ Frontend now has detailed logging
- ⚠️ Must use **future dates** (May 20+ for start)
- ⚠️ Must be **admin wallet** (0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b)

## Next: Try It Now

1. Refresh the frontend
2. Use future dates
3. Open DevTools console
4. Create an event
5. Share the console output if it fails
