# How to Submit Match Results for Testing

Since the AI agent normally handles result submission, here are ways to manually submit results for testing.

## Method 1: Using Cast (Recommended for Quick Testing)

### Prerequisites

- Install [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Have your admin private key ready

### Steps

1. **Set your private key as an environment variable:**

```bash
export PRIVATE_KEY="0x..."  # Your admin wallet private key
```

2. **Submit a match result:**

```bash
cast send 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "submitMatchResult(uint256,uint8,uint8,bytes32)" \
  1 2 1 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

Replace:

- `1` = Match ID
- `2` = Home team score
- `1` = Away team score
- `0x000...` = Result proof (can be any bytes32 for testing)

### Example: Match 0 ends 2-1

```bash
cast send 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "submitMatchResult(uint256,uint8,uint8,bytes32)" \
  0 2 1 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

---

## Method 2: Using Remix IDE

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file: `SubmitResult.sol`
3. Paste this code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEventManager {
    function submitMatchResult(
        uint256 matchId,
        uint8 homeScore,
        uint8 awayScore,
        bytes32 resultProof
    ) external;
}

contract SubmitResult {
    IEventManager eventManager = IEventManager(0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33);

    function submit(
        uint256 matchId,
        uint8 homeScore,
        uint8 awayScore
    ) external {
        bytes32 proof = keccak256(abi.encodePacked(matchId, homeScore, awayScore, block.timestamp, msg.sender));
        eventManager.submitMatchResult(matchId, homeScore, awayScore, proof);
    }
}
```

4. Compile and deploy to Celo Sepolia
5. Call `submit(matchId, homeScore, awayScore)`

---

## Method 3: Using Etherscan/Blockscout

1. Go to [Celo Sepolia Blockscout](https://celo-sepolia.blockscout.com)
2. Search for the EventManager contract: `0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33`
3. Go to "Write Contract" tab
4. Connect your wallet (must be the AI agent address)
5. Find `submitMatchResult` function
6. Fill in:
   - `matchId`: Your match ID
   - `homeScore`: Home team score
   - `awayScore`: Away team score
   - `resultProof`: `0x0000000000000000000000000000000000000000000000000000000000000000`
7. Click "Write" and confirm

---

## Method 4: Using a Node.js Script

Create a file `submit-result.js`:

```javascript
const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

const ADMIN_PRIVATE_KEY = "0x..."; // Your private key
const EVENT_MANAGER = "0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33";

const celoSepolia = {
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
};

const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);

const walletClient = createWalletClient({
  chain: celoSepolia,
  transport: http("https://forno.celo-sepolia.celo-testnet.org"),
  account,
});

const ABI = [
  {
    type: "function",
    name: "submitMatchResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "homeScore", type: "uint8" },
      { name: "awayScore", type: "uint8" },
      { name: "resultProof", type: "bytes32" },
    ],
  },
];

async function submitResult(matchId, homeScore, awayScore) {
  try {
    const hash = await walletClient.writeContract({
      address: EVENT_MANAGER,
      abi: ABI,
      functionName: "submitMatchResult",
      args: [
        BigInt(matchId),
        homeScore,
        awayScore,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ],
    });

    console.log("Transaction sent:", hash);
    console.log("Waiting for confirmation...");

    // Wait for confirmation
    const publicClient = createPublicClient({
      chain: celoSepolia,
      transport: http("https://forno.celo-sepolia.celo-testnet.org"),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Result submitted!", receipt.transactionHash);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Usage: node submit-result.js
const matchId = process.argv[2] || 0;
const homeScore = process.argv[3] || 2;
const awayScore = process.argv[4] || 1;

submitResult(matchId, homeScore, awayScore);
```

Run it:

```bash
node submit-result.js 0 2 1
```

---

## Verifying the Result

After submitting, check:

1. **On Blockscout**: Search for the transaction hash
2. **On the event page**: Match status should change to "VERIFIED"
3. **On the leaderboard**: Points should be calculated and displayed

---

## Important Notes

⚠️ **Only the AI agent address can submit results!**

The AI agent address is set in the contract during initialization. If you're not the AI agent, the transaction will revert with `OnlyAIAgent()` error.

To check who the AI agent is:

```bash
cast call 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "aiOracleAgent()" \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

If you need to change it (as contract owner):

```bash
cast send 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "setAIAgent(address)" \
  0xYourAddress \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

---

## Troubleshooting

### "OnlyAIAgent()" error

- You're not using the AI agent wallet
- Check the current AI agent address
- Use the correct private key

### "MatchNotOpen()" error

- The match status is not OPEN
- It might already be VERIFIED or DISPUTED
- Check the match status on the event page

### "execution reverted" with no message

- Check that the match ID exists
- Verify the scores are valid (0-255)
- Make sure you're on the correct network (Celo Sepolia)

---

## Quick Test Command

```bash
# Submit match 0 with score 2-1
cast send 0xD905DCc072A1FeD3A5E63434D921C4ed6a6c1B33 \
  "submitMatchResult(uint256,uint8,uint8,bytes32)" \
  0 2 1 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```
