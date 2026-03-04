import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;

describe("staking tests", () => {
  it("ensures simnet is well initialised", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("allows a user to deposit STX successfully", () => {
    const depositAmount = 5000000;
    const { result } = simnet.callPublicFn(
      "staking",
      "deposit-stx",
      [Cl.uint(depositAmount)],
      address1,
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check balance
    const { result: balanceResult } = simnet.callReadOnlyFn(
      "staking",
      "get-stx-balance",
      [Cl.principal(address1)],
      address1,
    );
    expect(balanceResult).toBeUint(depositAmount);
  });

  it("fails if amount is zero", () => {
    const { result } = simnet.callPublicFn(
      "staking",
      "deposit-stx",
      [Cl.uint(0)],
      address1,
    );
    expect(result).toBeErr(Cl.uint(100)); // err-zero-amount
  });
});
