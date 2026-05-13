# Clarinet Testnet Deployment Guide

This guide covers the process for deploying a Stacks smart contract (like `truecall`) to the Stacks testnet using Clarinet, specifically handling the case where you are deploying a new version of a contract while keeping some existing trait/mock contracts unchanged.

## 1. Update Clarinet Configuration

When deploying a new version of your main contract (e.g., changing from `truecall-v2` to `truecall-v3`), you must update `Clarinet.toml`.

Open `Clarinet.toml` and change the contract definition:

```toml
# Main prediction market contract
[contracts.truecall-v3]
path = 'contracts/truecall.clar'
clarity_version = 2
epoch = 'latest'
```

*Note: Ensure the `.clar` file itself, the contract name here, and your frontend `contracts.ts` config all align.*

## 2. Generate the Deployment Plan

Generate a new deployment plan for the testnet. The `--low-cost` flag helps estimate fees effectively.

```bash
clarinet deployments generate --testnet --low-cost
```

This command reads `Clarinet.toml` and creates or updates `deployments/default.testnet-plan.yaml`.

## 3. Handle "ContractAlreadyExists" Errors (If Redeploying)

If you have already deployed helper contracts (like `sip-010-trait`, `mock-sbtc`, or `pyth-oracle-trait`) using the same deployer wallet on the testnet, trying to deploy them again will cause the entire transaction batch to fail with a `ContractAlreadyExists` error.

To avoid this, you must edit `deployments/default.testnet-plan.yaml` before applying it.

1. Open `deployments/default.testnet-plan.yaml`.
2. Scroll down to your application's transaction batch (usually `id: 2`).
3. Delete the configuration blocks for any contracts that are already deployed.
4. Leave *only* the new contract you wish to deploy.

**Example `default.testnet-plan.yaml` Segment (Before Edit):**

```yaml
    - id: 2
      transactions:
        - contract-publish:
            contract-name: sip-010-trait
            expected-sender: ST3TWY4TH...
            # ...
        - contract-publish:
            contract-name: mock-sbtc
            expected-sender: ST3TWY4TH...
            # ...
        - contract-publish:
            contract-name: truecall-v3
            expected-sender: ST3TWY4TH...
            # ...
```

**Example `default.testnet-plan.yaml` Segment (After Edit):**

```yaml
    - id: 2
      transactions:
        - contract-publish:
            contract-name: truecall-v3
            expected-sender: ST3TWY4TH...
            cost: 263670
            path: contracts/truecall.clar
            anchor-block-only: true
            clarity-version: 2
      epoch: "3.3"
```

## 4. Apply the Deployment Plan

After verifying the plan contains only the contracts you intend to deploy, broadcast the transactions to the network.

```bash
clarinet deployments apply --testnet
```

- When prompted `Overwrite? [Y/n]`, type `n` (because you just manually edited the plan and want to keep your changes!).
- When prompted `Continue [Y/n]?`, follow the summary and enter `y` to broadcast.

## 5. Verify on Explorer

Once the transactions are broadcasted, they will enter the mempool. It can take 10-20 minutes for a Bitcoin block to mine and confirm the transaction on the Stacks network.

You can check the status on the [Hiro Explorer](https://explorer.hiro.so/?chain=testnet) by searching for your deployer address or the transaction IDs printed in your terminal.
