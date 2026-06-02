# AI Agent - Manual Result Submission

This guide explains how to manually submit match results to test the AI agent functionality.

## Setup

1. Make sure your `.env` file is configured:

```bash
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=0x... (your agent private key)
CREATOR_EVENT_MANAGER_ADDRESS=0xD360E9eF6bF50A357c77fA17474a4838c2379B3f
```

2. Install dependencies:

```bash
npm install
```

## Submit a Match Result

Use the CLI tool to submit match results:

```bash
npx ts-node src/submitResult.ts <matchId> <homeScore> <awayScore>
```

### Example

**Scenario:** You created an event with 1 match (Manchester United vs Liverpool), joined it, and predicted "2-1".

1. Find the matchId by checking the event details. The first match in an event is usually matchId = 0, 1, etc.

2. Submit the correct score (2-1):

```bash
npx ts-node src/submitResult.ts 0 2 1
```

3. Check the transaction on [Celo Sepolia Blockscout](https://celo-sepolia.blockscout.com/)

## What Happens

When you submit a result:

1. **AI Agent fetches the match** from the CreatorEventManager contract
2. **Verifies it's in OPEN status** (not already verified)
3. **Submits the score** using `submitMatchResult(matchId, homeScore, awayScore)`
4. **Contract processes it:**
   - Scans all participants
   - Finds exact-score matches
   - Records winners with their prediction timestamps (immutable)
   - Emits `MatchResultSubmitted` event

5. **Frontend updates automatically** and shows:
   - Match result (e.g., "2 - 1")
   - Green "🏆 View Winners" button
   - Winner list (if you were correct)

## Test Flow

1. **Create an event** with 1 match
2. **Join the event** using invite code
3. **Make a prediction** (e.g., "2-1")
4. **Submit a result** using this CLI:
   ```bash
   npx ts-node src/submitResult.ts 0 2 1
   ```
5. **Check winners** on the frontend

## Score Format

- Scores must be integers 0-20
- Format: `<matchId> <homeScore> <awayScore>`
- Example: `npx ts-node src/submitResult.ts 0 3 2` submits 3-2 for match 0

## Troubleshooting

### "Match not found on contract"

- Make sure the matchId is correct
- Check the event details to find the correct matchId

### "Transaction reverted"

- The match might already be verified
- Only the authorized AI agent address can submit results
- Check your PRIVATE_KEY in .env

### "Scores must be between 0 and 20"

- Only valid match scores are accepted
- Example valid submissions: 0-0, 1-0, 2-1, 5-3

## Automate Result Submission

To have the AI agent automatically fetch and submit results, run:

```bash
npm run start:dev
```

This will:

1. Watch for new MatchAdded events
2. Check if matches have started (kickoff time passed)
3. Poll for match results
4. Automatically submit verified scores

But for now, use the manual submission CLI to test the logic.
