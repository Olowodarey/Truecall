import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

// Helper: create an event and return the event-id
function createEvent(title: string, blocks: number, sig = deployer) {
  const { result } = simnet.callPublicFn(
    "prediction-market",
    "create-event",
    [Cl.stringAscii(title), Cl.bool(false), Cl.uint(blocks)],
    sig,
  );
  return result;
}

// Helper: add a market under an event, return the market-id
function addMarket(eventId: number, question: string, targetPrice: number) {
  const { result } = simnet.callPublicFn(
    "prediction-market",
    "add-market",
    [Cl.uint(eventId), Cl.stringAscii(question), Cl.uint(targetPrice)],
    deployer,
  );
  return result;
}

describe("prediction-market tests", () => {
  it("admin can create an event", () => {
    // event ID starts at 1
    const result = createEvent("Week 1 BTC Fundamentals", 100);
    expect(result).toBeOk(Cl.uint(1));
  });

  it("non-admin cannot create an event", () => {
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "create-event",
      [Cl.stringAscii("Fake Event"), Cl.bool(false), Cl.uint(100)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(200)); // err-unauthorized
  });

  it("admin can add a market to an event (event 2, market 1)", () => {
    // event 1 was already created in test 1 — create event 2 here
    createEvent("Week 2 Markets", 100); // event-id = 2
    const result = addMarket(2, "Will BTC hit $100k?", 10_000_000);
    expect(result).toBeOk(Cl.uint(1)); // market-id = 1
  });

  it("user can predict YES on a market and pool is updated", () => {
    // Events so far: 1, 2  Markets so far: 1
    createEvent("Week 3 BTC", 100); // event-id = 3
    addMarket(3, "Will BTC close above $90k?", 9_000_000); // market-id = 2

    const stakeAmount = 1_000_000;
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "predict",
      [Cl.uint(2), Cl.bool(true), Cl.uint(stakeAmount)],
      wallet1,
    );
    expect(result).toBeOk(Cl.bool(true));

    // Pool should have yes-stx = 1_000_000
    const { result: poolResult } = simnet.callReadOnlyFn(
      "prediction-market",
      "get-market-pool",
      [Cl.uint(2)],
      wallet1,
    );
    expect(poolResult).toBeTuple({
      "yes-stx": Cl.uint(stakeAmount),
      "no-stx": Cl.uint(0),
      "yes-sbtc": Cl.uint(0),
      "no-sbtc": Cl.uint(0),
    });
  });

  it("cannot predict on a market that is closed (past close-block)", () => {
    // Events so far: 1,2,3  Markets so far: 1,2
    createEvent("Expiring Soon", 1); // event-id = 4
    addMarket(4, "BTC > 50k?", 5_000_000); // market-id = 3

    // Mine extra blocks to push past the close-block
    simnet.mineEmptyBlocks(10);

    const { result } = simnet.callPublicFn(
      "prediction-market",
      "predict",
      [Cl.uint(3), Cl.bool(true), Cl.uint(500_000)],
      wallet2,
    );
    expect(result).toBeErr(Cl.uint(203)); // err-event-closed
  });
});
