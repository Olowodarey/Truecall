# TrueCall × Celo AI Agent Integration Guide

## Qualifying for Celo's AI Agent Prize Pools ($18,500+)

---

## 🎯 The Opportunity

Celo is running **two simultaneous hackathons** with a combined **$18,500 USD₮ prize pool** for AI agent projects:

### 1. Build Agents for the Real World V2 (CeloPG)

**Total Prize Pool: $8,500 USD₮**

| Track                               | Prize                                     | Description                            |
| ----------------------------------- | ----------------------------------------- | -------------------------------------- |
| **Track 1: Best Agent on Celo**     | 1st: $3,000<br>2nd: $2,000<br>3rd: $1,000 | Best overall AI agent application      |
| **Track 2: Best Agent Infra**       | 1st: $2,000                               | Best infrastructure/tooling for agents |
| **Track 3: Highest AgentScan Rank** | 1st: $500                                 | Most active/trusted agent on AgentScan |

**Deadline:** March 22nd, 9am GMT  
**Winners Announced:** March 24th

### 2. The Synthesis (Ethereum Foundation)

**Celo Track Prize: $10,000 USD₮**

**Dates:** March 13-22, 2026  
**Unique:** AI judges evaluate projects with humans in the loop

---

## 🏆 Why TrueCall Is Perfect for This

Your football prediction platform with AI agents hits **multiple winning criteria**:

✅ **Real-world utility** — Actual users making predictions and earning rewards  
✅ **Economic agency** — AI agents handle real money (entry fees, prizes)  
✅ **ERC-8004 integration** — AI prediction agents with on-chain identity & reputation  
✅ **x402 payments** — Users can pay AI agents for premium predictions  
✅ **Mobile-first** — Works with MiniPay's 11M+ wallets  
✅ **Stablecoin-native** — Entry fees in cUSD, prizes in cUSD

---

## 📋 Requirements to Qualify

### Must-Have (Both Hackathons)

1. ✅ Deploy on **Celo Mainnet** (or Alfajores testnet for testing)
2. ✅ Register agent with **ERC-8004 Identity Registry**
3. ✅ Verify agent on **[AgentScan](https://8004scan.io)**
4. ✅ Register project on **[Karma Gap](https://gap.karmahq.xyz)**
5. ✅ Post on X tagging `@Celo`, `@CeloDevs`, `@CeloPublicGoods`
6. ✅ Join [Telegram group](https://t.me/celoagents) for support

### Bonus Points (Increases Winning Chances)

- Use **x402** for AI agent payments
- Integrate **Self Agent ID** for identity verification
- Build **reusable Agent Skills** (modular capabilities)
- High **AgentScan reputation score**
- Active **on-chain agent transactions**

---

## 🛠️ Step-by-Step Integration

### Phase 1: Deploy TrueCall Contracts on Celo

#### 1.1 Update Foundry Config for Celo

```toml
# foundry.toml

[profile.celo]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
celo = "https://forno.celo.org"
alfajores = "https://alfajores-forno.celo-testnet.org"

[etherscan]
celo = { key = "${CELOSCAN_API_KEY}", url = "https://api.celoscan.io/api" }
alfajores = { key = "${CELOSCAN_API_KEY}", url = "https://api-alfajores.celoscan.io/api" }
```

#### 1.2 Deploy Script for Celo

```solidity
// script/DeployCelo.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TrueCall.sol";
import "../src/EventManager.sol";
import "../src/Leaderboard.sol";
import "../src/TrueCallAIAgent.sol";

contract DeployCelo is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy core contracts
        TrueCall trueCall = new TrueCall();
        console.log("TrueCall deployed:", address(trueCall));

        EventManager eventManager = new EventManager();
        console.log("EventManager deployed:", address(eventManager));

        Leaderboard leaderboard = new Leaderboard();
        console.log("Leaderboard deployed:", address(leaderboard));

        // 2. Deploy AI Agent contract
        TrueCallAIAgent aiAgent = new TrueCallAIAgent(address(eventManager));
        console.log("TrueCallAIAgent deployed:", address(aiAgent));

        vm.stopBroadcast();

        // 3. Verification commands
        console.log("\n=== Verify contracts ===");
        console.log("forge verify-contract", address(trueCall), "TrueCall --chain celo");
        console.log("forge verify-contract", address(aiAgent), "TrueCallAIAgent --chain celo");
    }
}
```

#### 1.3 Deploy to Celo

```bash
# Testnet (Alfajores)
forge script script/DeployCelo.s.sol:DeployCelo \
  --rpc-url alfajores \
  --broadcast \
  --verify

# Mainnet (for final submission)
forge script script/DeployCelo.s.sol:DeployCelo \
  --rpc-url celo \
  --broadcast \
  --verify
```

---

### Phase 2: Register AI Agent with ERC-8004

#### 2.1 Install Celo SDK

```bash
npm install @chaoschain/sdk thirdweb viem
```

#### 2.2 Create Agent Registration File

```json
// public/agent-registration.json
{
  "type": "Agent",
  "name": "TrueCall AI Predictor",
  "description": "AI-powered football match prediction agent using GPT-4 and historical data analysis. Provides score predictions with confidence ratings and reasoning.",
  "image": "ipfs://QmYourAgentLogo",
  "capabilities": [
    "Football match prediction",
    "Score forecasting",
    "Team form analysis",
    "Historical data processing",
    "Confidence scoring"
  ],
  "endpoints": [
    {
      "type": "a2a",
      "url": "https://truecall.app/.well-known/agent.json"
    },
    {
      "type": "mcp",
      "url": "https://truecall.app/mcp"
    },
    {
      "type": "wallet",
      "address": "0xYourAgentWalletAddress",
      "chainId": 42220
    },
    {
      "type": "x402",
      "url": "https://truecall.app/api/ai/predict",
      "price": "$0.05"
    }
  ],
  "supportedTrust": ["reputation", "validation"],
  "version": "1.0.0",
  "framework": "Custom (OpenAI GPT-4 + ethers.js)",
  "tags": ["sports", "prediction", "football", "ai", "defi"]
}
```

#### 2.3 Register Agent On-Chain

```typescript
// scripts/registerAgent.ts

import { IdentityRegistry } from "@chaoschain/sdk";
import { createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"; // Celo Mainnet

async function registerAgent() {
  // 1. Upload registration file to IPFS
  const registrationURI = await uploadToIPFS(
    "./public/agent-registration.json",
  );
  console.log("Registration file uploaded:", registrationURI);

  // 2. Create wallet client
  const account = privateKeyToAccount(
    process.env.AI_AGENT_PRIVATE_KEY as `0x${string}`,
  );
  const client = createWalletClient({
    account,
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  // 3. Register agent (mints ERC-721 NFT)
  const registry = new IdentityRegistry(client);
  const tx = await registry.register(registrationURI);

  console.log("Agent registration tx:", tx.hash);

  // 4. Get agent ID from Transfer event
  const receipt = await client.waitForTransactionReceipt({ hash: tx.hash });
  const agentId = receipt.logs[0].topics[3]; // tokenId from Transfer event

  console.log("✅ Agent registered with ID:", agentId);
  console.log("View on 8004scan:", `https://8004scan.io/agent/${agentId}`);

  return agentId;
}

registerAgent();
```

---

### Phase 3: Integrate x402 Payments

#### 3.1 Install thirdweb SDK

```bash
npm install thirdweb
```

#### 3.2 Create x402-Protected AI Prediction Endpoint

```typescript
// app/api/ai/predict/route.ts

import { settlePayment, facilitator } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { celo } from "thirdweb/chains";
import { generateAIPrediction } from "@/lib/ai";

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.SERVER_WALLET_ADDRESS!,
});

export async function POST(request: Request) {
  const { eventId, matchData } = await request.json();

  // Get payment data from headers
  const paymentData =
    request.headers.get("PAYMENT-SIGNATURE") ||
    request.headers.get("X-PAYMENT");

  // Settle x402 payment
  const result = await settlePayment({
    resourceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/predict`,
    method: "POST",
    paymentData,
    payTo: process.env.AI_AGENT_WALLET_ADDRESS!, // Your AI agent's wallet
    network: celo,
    price: "$0.05", // 5 cents per prediction
    facilitator: thirdwebFacilitator,
    routeConfig: {
      description: "AI-powered football match prediction",
      mimeType: "application/json",
    },
  });

  // If payment successful, generate prediction
  if (result.status === 200) {
    const prediction = await generateAIPrediction(matchData);

    return Response.json({
      success: true,
      prediction,
      agentId: process.env.AGENT_ID,
      paymentReceipt: result.responseHeaders["x-payment-receipt"],
    });
  } else {
    // Return 402 Payment Required with payment details
    return Response.json(result.responseBody, {
      status: result.status,
      headers: result.responseHeaders,
    });
  }
}
```

#### 3.3 Frontend: Pay AI Agent with x402

```tsx
// components/AIPredictionWithPayment.tsx

import { useFetchWithPayment } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export function AIPredictionWithPayment({ eventId, matchData }) {
  const { fetchWithPayment, isPending } = useFetchWithPayment(client);

  const getPrediction = async () => {
    try {
      // Automatically handles wallet connection, payment signing, and retry
      const response = await fetchWithPayment(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, matchData }),
        },
      );

      const data = await response.json();
      console.log("AI Prediction:", data.prediction);

      // Show prediction to user
      setPrediction(data.prediction);
    } catch (error) {
      console.error("Payment failed:", error);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold mb-2">🤖 Premium AI Prediction</h3>
      <p className="text-sm text-gray-600 mb-4">
        Get AI-powered prediction for $0.05 cUSD
      </p>

      <button
        onClick={getPrediction}
        disabled={isPending}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {isPending ? "Processing Payment..." : "Get AI Prediction ($0.05)"}
      </button>
    </div>
  );
}
```

---

### Phase 4: Build Reputation with Feedback

#### 4.1 Submit Feedback After Each Prediction

```typescript
// services/reputationService.ts

import { ReputationRegistry } from "@chaoschain/sdk";
import { createWalletClient, http } from "viem";
import { celo } from "viem/chains";

const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"; // Celo Mainnet

export async function submitAgentFeedback(
  agentId: string,
  eventId: number,
  wasCorrect: boolean,
  actualScore: number,
) {
  const client = createWalletClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  const reputation = new ReputationRegistry(client);

  // Calculate score (0-100)
  const score = wasCorrect ? actualScore : Math.max(0, actualScore - 20);

  await reputation.giveFeedback(
    agentId,
    score,
    0, // decimals
    "accuracy", // tag1: category
    wasCorrect ? "correct" : "incorrect", // tag2: result
    `https://truecall.app/events/${eventId}`, // endpoint
    `ipfs://QmFeedbackDetails${eventId}`, // detailed feedback URI
    ethers.keccak256(ethers.toUtf8Bytes(`${eventId}-${score}`)), // feedback hash
  );

  console.log(`✅ Feedback submitted for agent ${agentId}: ${score}/100`);
}
```

#### 4.2 Auto-Submit Feedback After Match Resolution

```typescript
// In your EventManager result verification flow

async function resolveEventAndUpdateAgents(eventId: number) {
  // 1. Verify match result from API-Football
  const result = await verifyMatchResult(eventId);

  // 2. Submit result on-chain
  await eventManagerContract.submitResult(
    eventId,
    result.homeScore,
    result.awayScore,
  );

  // 3. Get all AI agent predictions for this event
  const agentPredictions = await getAgentPredictions(eventId);

  // 4. Submit feedback for each agent
  for (const { agentId, prediction } of agentPredictions) {
    const wasCorrect =
      prediction.homeScore === result.homeScore &&
      prediction.awayScore === result.awayScore;

    const accuracy = calculateAccuracy(prediction, result);

    await submitAgentFeedback(agentId, eventId, wasCorrect, accuracy);
  }

  console.log(`✅ Event ${eventId} resolved, agent reputations updated`);
}
```

---

### Phase 5: Verify on AgentScan

#### 5.1 Register on AgentScan

1. Go to [8004scan.io](https://8004scan.io)
2. Connect your agent wallet
3. Verify your agent ID
4. Add metadata (description, tags, links)

#### 5.2 Increase AgentScan Rank

Your rank increases based on:

- **Transaction volume** — More predictions = higher rank
- **Reputation score** — Positive feedback from users
- **Activity frequency** — Daily active predictions
- **Unique interactions** — Different users using your agent

**Strategy for Track 3 ($500 prize):**

- Deploy early (before March 22nd)
- Generate predictions for every match
- Encourage users to submit feedback
- Keep agent active 24/7

---

### Phase 6: Submit to Hackathons

#### 6.1 Register on Karma Gap

1. Go to [gap.karmahq.xyz](https://gap.karmahq.xyz)
2. Create project: "TrueCall - AI Football Prediction Market"
3. Add details:
   - **Description:** AI-powered football prediction platform with on-chain agents
   - **Category:** DeFi, AI, Gaming
   - **Contracts:** Link your deployed contracts
   - **Agent ID:** Your ERC-8004 agent ID
   - **Demo:** Live app URL
   - **Video:** 2-min demo video

#### 6.2 Post on X (Twitter)

```
🚀 Just launched TrueCall on @Celo — an AI-powered football prediction market!

🤖 AI agents with ERC-8004 identity
💰 x402 micropayments for premium predictions
📊 On-chain reputation tracking
🏆 Competing in #BuildAgentsForTheRealWorld

Try it: [your-app-url]
Agent: https://8004scan.io/agent/[your-agent-id]

@CeloDevs @CeloPublicGoods #CeloAgents #AI
```

#### 6.3 Join The Synthesis (March 13-22)

1. Register at [synthesis.md](https://synthesis.md)
2. Your agent registers with its own identity
3. AI judges evaluate your project
4. Compete for $10,000 Celo track prize

---

## 🎯 Winning Strategy

### What Judges Look For

| Criteria                | Weight | How TrueCall Scores                             |
| ----------------------- | ------ | ----------------------------------------------- |
| **Real-world utility**  | 30%    | ✅ Actual users, real predictions, real money   |
| **Technical execution** | 25%    | ✅ ERC-8004 + x402 + on-chain reputation        |
| **Agent autonomy**      | 20%    | ✅ AI generates predictions independently       |
| **User experience**     | 15%    | ✅ Mobile-first, stablecoin payments            |
| **Innovation**          | 10%    | ✅ First sports prediction market with ERC-8004 |

### Differentiation Points

**vs. Other Prediction Markets:**

- ❌ Polymarket: No AI agents, no ERC-8004
- ❌ Augur: No AI, complex UX
- ✅ **TrueCall:** AI agents + ERC-8004 + x402 + mobile-first

**vs. Other AI Agent Projects:**

- ❌ Most: Toy demos, no real users
- ❌ Most: No economic agency (no real money)
- ✅ **TrueCall:** Real users, real predictions, real prizes

---

## 📊 Success Metrics to Highlight

Track and showcase these in your submission:

- **Agent transactions:** Number of predictions made
- **Reputation score:** Average feedback rating
- **User adoption:** Number of users who paid for AI predictions
- **Revenue generated:** Total x402 payments received
- **Accuracy rate:** % of correct predictions
- **AgentScan rank:** Your position on the leaderboard

---

## 🔗 Essential Links

### Hackathon Registration

- [Build Agents for the Real World V2](https://gap.karmahq.xyz)
- [The Synthesis](https://synthesis.md)
- [Telegram Support Group](https://t.me/celoagents)

### Celo AI Resources

- [Celo AI Hub](https://ai.celo.org)
- [ERC-8004 Docs](https://celo-64ac69bd.mintlify.app/build-on-celo/build-with-ai/8004)
- [x402 Docs](https://celo-64ac69bd.mintlify.app/build-on-celo/build-with-ai/x402)
- [AgentScan](https://8004scan.io)
- [8004scan.io](https://8004scan.io)

### Celo Developer Tools

- [Celo Faucet](https://faucet.celo.org) — Get testnet tokens
- [Celoscan](https://celoscan.io) — Block explorer
- [Celo Docs](https://docs.celo.org)

### Office Hours

- **When:** Thursday, March 12th, 1-2pm GMT
- **Who:** Viral Sangani (AI Lead at Celo)
- **Register:** [Link in Telegram group]

---

## ⚡ Quick Start Checklist

- [ ] Deploy contracts to Celo Alfajores (testnet)
- [ ] Create agent registration JSON file
- [ ] Upload to IPFS
- [ ] Register agent with ERC-8004 Identity Registry
- [ ] Verify agent on AgentScan
- [ ] Implement x402 payment endpoint
- [ ] Test AI prediction flow end-to-end
- [ ] Deploy to Celo Mainnet
- [ ] Register on Karma Gap
- [ ] Post on X with required tags
- [ ] Join Telegram group
- [ ] Submit to both hackathons
- [ ] Attend office hours (optional but recommended)

---

## 💡 Pro Tips

1. **Deploy early** — Don't wait until March 21st
2. **Build in public** — Tweet progress, share updates
3. **Get feedback** — Use office hours, ask in Telegram
4. **Show real usage** — Even 10 real users > 0 users
5. **Document everything** — Video demo, GitHub README, blog post
6. **Stack both hackathons** — Submit to both for 2x chances

---

**The window is open. Build something. Win $18,500.**
