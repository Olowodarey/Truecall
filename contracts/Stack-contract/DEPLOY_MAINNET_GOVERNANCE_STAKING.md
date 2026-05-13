# Deploying Governance and Staking to Mainnet

Follow these steps to deploy the `staking` and `governance` contracts to the Stacks Mainnet using the Hiro Web Explorer.

> [!WARNING]
> Before deploying these, ensure you have already deployed the dependencies:
>
> - `sip-010-trait` (required by staking)
> - `prediction-market` (required by governance proposals)
>   If you haven't deployed these yet, deploy them first.

## Prerequisites

- Hiro Wallet installed and configured for **Mainnet**.
- Sufficient STX balance for deployment fees.

## Deployment Steps

### Part 1: Deploy Staking Contract

1. **Go to**: [https://explorer.hiro.so/sandbox/deploy?chain=mainnet](https://explorer.hiro.so/sandbox/deploy?chain=mainnet)
2. **Connect your Wallet** (make sure it's set to Mainnet).
3. **Contract Name**: Enter `staking`
4. **Contract Code**: Copy and paste the entire content from the staking contract file:
   ```bash
   cat /home/olowo/Desktop/truecall1/contracts/contracts/staking.clar
   ```
5. Click **"Deploy Contract"** and confirm the transaction in your wallet.
6. Wait for the transaction to confirm.
7. **Write down your contract address**: It will look like `<YOUR_WALLET_ADDRESS>.staking`

### Part 2: Deploy Governance Contract

1. **Return to**: [https://explorer.hiro.so/sandbox/deploy?chain=mainnet](https://explorer.hiro.so/sandbox/deploy?chain=mainnet)
2. **Contract Name**: Enter `governance`
3. **Contract Code**: Copy and paste the entire content from the governance contract file:
   ```bash
   cat /home/olowo/Desktop/truecall1/contracts/contracts/governance.clar
   ```
4. Click **"Deploy Contract"** and confirm the transaction in your wallet.
5. Wait for the transaction to confirm.
6. **Write down your contract address**: It will look like `<YOUR_WALLET_ADDRESS>.governance`

## Post-Deployment Setup

### Update Governance Reference in Staking

The `staking` contract requires the `governance` contract address to allow proposal-based staker locks.

1. Go to your `staking` contract on the [Explorer Sandbox Call Contract page](https://explorer.hiro.so/sandbox/contract-call?chain=mainnet).
2. Call the `set-governance-contract` function.
3. Pass your new `governance` contract address: `<YOUR_WALLET_ADDRESS>.governance`
4. Submit the transaction.

### Backend/Frontend Configuration

Update your `.env` or configuration files to reference the new Mainnet addresses for your dApp:

```env
STAKING_CONTRACT_ADDRESS=<YOUR_WALLET_ADDRESS>
STAKING_CONTRACT_NAME=staking

GOVERNANCE_CONTRACT_ADDRESS=<YOUR_WALLET_ADDRESS>
GOVERNANCE_CONTRACT_NAME=governance
```
