import { describe, expect, it } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// ─────────────────────────────────────────────────────────────────────────────
//  Accounts — available in every test's fresh simnet
// ─────────────────────────────────────────────────────────────────────────────
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallets = [
  accounts.get("wallet_1")!,
  accounts.get("wallet_2")!,
  accounts.get("wallet_3")!,
  accounts.get("wallet_4")!,
  accounts.get("wallet_5")!,
  accounts.get("wallet_6")!,
  accounts.get("wallet_7")!,
  accounts.get("wallet_8")!,
  accounts.get("faucet")!,
];

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const ENTRY_FEE = 10_000_000; // 10 STX in microSTX
const DISPUTE_WINDOW = 12; // burn blocks, matches contract constant

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers — return the numeric ID extracted from (ok u<n>)
// ─────────────────────────────────────────────────────────────────────────────

function createStxEvent(title: string, blocksOpen = 300): number {
  const { result } = simnet.callPublicFn(
    "prediction-market",
    "create-event",
    [
      Cl.stringAscii(title),
      Cl.bool(false),
      Cl.uint(blocksOpen),
      Cl.uint(ENTRY_FEE),
      Cl.bool(false), // use-sbtc = false → STX
    ],
    deployer,
  );
  if (result.type !== ClarityType.ResponseOk)
    throw new Error(`create-event failed: ${JSON.stringify(result)}`);
  return Number((result as any).value.value);
}

function createSbtcEvent(title: string, blocksOpen = 300): number {
  const { result } = simnet.callPublicFn(
    "prediction-market",
    "create-event",
    [
      Cl.stringAscii(title),
      Cl.bool(false),
      Cl.uint(blocksOpen),
      Cl.uint(5_000), // small sBTC microunit entry fee
      Cl.bool(true), // use-sbtc = true
    ],
    deployer,
  );
  if (result.type !== ClarityType.ResponseOk)
    throw new Error(`create-event (sbtc) failed`);
  return Number((result as any).value.value);
}

function addMarket(
  eventId: number,
  question: string,
  targetPrice = 10_000_000,
): number {
  const { result } = simnet.callPublicFn(
    "prediction-market",
    "add-market",
    [Cl.uint(eventId), Cl.stringAscii(question), Cl.uint(targetPrice)],
    deployer,
  );
  if (result.type !== ClarityType.ResponseOk)
    throw new Error(`add-market failed: ${JSON.stringify(result)}`);
  return Number((result as any).value.value);
}

function predictStx(marketId: number, prediction: boolean, user: string) {
  return simnet.callPublicFn(
    "prediction-market",
    "predict-stx",
    [Cl.uint(marketId), Cl.bool(prediction)],
    user,
  ).result;
}

/** Mine past close-block, propose, wait for dispute window, finalize — used internally */
function _resolveMarket(marketId: number, btcPrice: number) {
  simnet.callPublicFn(
    "mock-pyth",
    "set-btc-price",
    [Cl.uint(btcPrice)],
    deployer,
  );
  simnet.mineEmptyBlocks(5);
  simnet.callPublicFn(
    "prediction-market",
    "propose-result",
    [
      Cl.uint(marketId),
      Cl.contractPrincipal(deployer.split(".")[0], "mock-pyth"),
    ],
    deployer,
  );
  simnet.mineEmptyBlocks(DISPUTE_WINDOW + 1);
  simnet.callPublicFn(
    "prediction-market",
    "finalize-market",
    [Cl.uint(marketId)],
    deployer,
  );
}

function awardPoints(eventId: number, users: string[], points = 10) {
  for (const user of users) {
    simnet.callPublicFn(
      "reputation-points",
      "add-points",
      [Cl.uint(eventId), Cl.principal(user), Cl.uint(points)],
      deployer,
    );
  }
}

/** Read STX balance of a principal via simnet asset map */
function stxBalanceOf(addr: string): bigint {
  return BigInt(simnet.getAssetsMap().get("STX")?.get(addr) ?? 0n);
}

// ─────────────────────────────────────────────────────────────────────────────
//  TESTS — each it() is fully self-contained; state is reset between tests
// ─────────────────────────────────────────────────────────────────────────────

describe("prediction-market — full end-to-end flow", () => {
  // ── Auth guards ──────────────────────────────────────────────────────────

  it("admin can create an event (event-id = 1)", () => {
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "create-event",
      [
        Cl.stringAscii("E1: Week 1"),
        Cl.bool(false),
        Cl.uint(200),
        Cl.uint(ENTRY_FEE),
        Cl.bool(false),
      ],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(1));
  });

  it("non-admin cannot create an event (err u200 = unauthorized)", () => {
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "create-event",
      [
        Cl.stringAscii("Fake"),
        Cl.bool(false),
        Cl.uint(100),
        Cl.uint(ENTRY_FEE),
        Cl.bool(false),
      ],
      wallets[0],
    );
    expect(result).toBeErr(Cl.uint(200));
  });

  it("entry-fee = 0 is rejected in create-event (err u207 = zero-stake)", () => {
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "create-event",
      [
        Cl.stringAscii("Zero Fee"),
        Cl.bool(false),
        Cl.uint(100),
        Cl.uint(0),
        Cl.bool(false),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(207));
  });

  // ── Market management ────────────────────────────────────────────────────

  it("admin can add a market to an event", () => {
    // self-contained: create the event here, don't rely on previous tests
    const eventId = createStxEvent("E: Market test"); // = 1
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "add-market",
      [Cl.uint(eventId), Cl.stringAscii("BTC > $100k?"), Cl.uint(10_000_000)],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(1)); // first market in this fresh simnet
  });

  it("cannot add more than 10 markets to one event (err u206 = too-many-markets)", () => {
    const eventId = createStxEvent("E: Max markets");
    for (let i = 0; i < 10; i++) {
      addMarket(eventId, `Q${i}`, 1_000_000 * (i + 1));
    }
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "add-market",
      [Cl.uint(eventId), Cl.stringAscii("Extra"), Cl.uint(1)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(206));
  });

  // ── Prediction guards ────────────────────────────────────────────────────

  it("user cannot predict twice on the same market (err u208 = already-predicted)", () => {
    const eventId = createStxEvent("E: Double bet");
    const mktId = addMarket(eventId, "BTC > $80k?", 8_000_000);

    // first prediction succeeds
    expect(predictStx(mktId, true, wallets[0])).toBeOk(Cl.bool(true));

    // second prediction from same user must fail
    const second = predictStx(mktId, false, wallets[0]);
    expect(second).toBeErr(Cl.uint(208));
  });

  it("cannot predict on an expired market (err u203 = event-closed)", () => {
    const eventId = createStxEvent("E: Expiring", 1); // closes in 1 block
    const mktId = addMarket(eventId, "BTC > $50k?", 5_000_000);
    simnet.mineEmptyBlocks(5); // push past close-block
    const result = predictStx(mktId, true, wallets[0]);
    expect(result).toBeErr(Cl.uint(203));
  });

  it("predict-stx is rejected on an sBTC event (err u205)", () => {
    const eventId = createSbtcEvent("E: sBTC reject STX");
    const mktId = addMarket(eventId, "Steady?", 9_000_000);
    // predict-stx asserts (!use-sbtc) which fails → err-market-already-resolved (u205)
    const result = predictStx(mktId, true, wallets[0]);
    expect(result).toBeErr(Cl.uint(205));
  });

  // ── Full end-to-end: 5 markets, 10 users, resolve, split ─────────────────

  it("full flow: 5 markets, 10 users each, oracle resolves YES, top-5 claim winnings", () => {
    // ── 1. Setup one event with 5 markets ─────────────────────────────────
    //    Use a long window so mining during resolution doesn't close betting prematurely
    const eventId = createStxEvent("E: 5-Market Championship", 500);
    const marketIds: number[] = [];
    for (let i = 0; i < 5; i++) {
      marketIds.push(
        addMarket(
          eventId,
          `Will BTC beat target ${i + 1}?`,
          9_000_000 + i * 200_000,
        ),
      );
    }
    expect(marketIds.length).toBe(5);

    // ── 2. 10 users bet on each market ────────────────────────────────────
    //    Wallets 0-5 say YES (6), wallets 6-8 say NO (3), deployer says NO (1)
    const yesUsers = wallets.slice(0, 6);
    const noUsers = [...wallets.slice(6, 9), deployer];

    for (const mktId of marketIds) {
      for (const user of yesUsers) {
        expect(predictStx(mktId, true, user)).toBeOk(Cl.bool(true));
      }
      for (const user of noUsers) {
        expect(predictStx(mktId, false, user)).toBeOk(Cl.bool(true));
      }
    }

    // ── 3. Verify total-pool = 10 users × 10 STX × 5 markets ─────────────
    // total-pool on the event accumulates across all 5 markets
    const expectedTotalPool = 5 * 10 * ENTRY_FEE; // 500 STX
    const { result: evRaw } = simnet.callReadOnlyFn(
      "prediction-market",
      "get-event",
      [Cl.uint(eventId)],
      deployer,
    );
    // evRaw is (some (tuple ...)).
    // OptionalSome.value = TupleCV, TupleCV.value = { fieldName: ClarityValue }
    expect(evRaw.type).toBe(ClarityType.OptionalSome);
    const evFields = (evRaw as any).value.value as Record<string, any>;
    const poolVal = Number(evFields["total-pool"].value);
    expect(poolVal).toBe(expectedTotalPool);

    // ── 4. Mine past the close block (500 blocks) ─────────────────────────
    simnet.mineEmptyBlocks(505);

    // ── 5. Set BTC price ABOVE all targets → YES wins ─────────────────────
    simnet.callPublicFn(
      "mock-pyth",
      "set-btc-price",
      [Cl.uint(12_000_000)],
      deployer,
    );

    // ── 6. Propose + Finalize all 5 markets ──────────────────────────────
    for (const mktId of marketIds) {
      const { result: propRes } = simnet.callPublicFn(
        "prediction-market",
        "propose-result",
        [
          Cl.uint(mktId),
          Cl.contractPrincipal(deployer.split(".")[0], "mock-pyth"),
        ],
        deployer,
      );
      expect(propRes.type).toBe(ClarityType.ResponseOk);
    }
    simnet.mineEmptyBlocks(DISPUTE_WINDOW + 2);
    for (const mktId of marketIds) {
      expect(
        simnet.callPublicFn(
          "prediction-market",
          "finalize-market",
          [Cl.uint(mktId)],
          deployer,
        ).result,
      ).toBeOk(Cl.bool(true));
    }

    // ── 7. Verify all markets are "final" ─────────────────────────────────
    for (const mktId of marketIds) {
      const { result: mktRaw } = simnet.callReadOnlyFn(
        "prediction-market",
        "get-market",
        [Cl.uint(mktId)],
        deployer,
      );
      // OptionalSome.value = TupleCV, TupleCV.value = { fieldName: ClarityValue }
      // status is a StringAscii — its value is the raw string
      const statusVal = (mktRaw as any).value.value["status"].value as string;
      expect(statusVal).toBe("final");
    }

    // ── 8. Earn leaderboard points via claim-points ──────────────────────
    //    Wallets 0-4 predicted YES which is the winning outcome → they claim points.
    //    Each of 5 markets awards 10 pts → rank 1-5 each accumulate 50 pts.
    //    claim-points calls .reputation-points.add-points internally as the contract admin.
    const top5 = wallets.slice(0, 5);
    for (const mktId of marketIds) {
      for (const user of top5) {
        const { result: cpRes } = simnet.callPublicFn(
          "prediction-market",
          "claim-points",
          [Cl.uint(mktId)],
          user,
        );
        expect(cpRes.type).toBe(ClarityType.ResponseOk);
      }
    }

    // ── 9. Close the event (books 2% fee to treasury) ────────────────────
    const { result: closeRes } = simnet.callPublicFn(
      "prediction-market",
      "close-event",
      [Cl.uint(eventId)],
      deployer,
    );
    expect(closeRes).toBeOk(Cl.bool(true));

    // ── 10. Claim winnings — verify each rank's payout ───────────────────
    const prizePool = Math.floor((expectedTotalPool * 98) / 100); // 490_000_000
    const payouts = {
      rank1: Math.floor((prizePool * 30) / 100), // 147_000_000
      rank2: Math.floor((prizePool * 25) / 100), // 122_500_000
      rank3: Math.floor((prizePool * 20) / 100), //  98_000_000
      rank4: Math.floor((prizePool * 15) / 100), //  73_500_000
      rank5: Math.floor((prizePool * 10) / 100), //  49_000_000
    };

    for (let rank = 0; rank < 5; rank++) {
      const user = top5[rank];
      const balBefore = stxBalanceOf(user);

      const { result: claimRes } = simnet.callPublicFn(
        "prediction-market",
        "claim-winnings-stx",
        [Cl.uint(eventId)],
        user,
      );
      expect(claimRes.type).toBe(ClarityType.ResponseOk);

      const balAfter = stxBalanceOf(user);
      const received = Number(balAfter - balBefore);
      const expected = Object.values(payouts)[rank];
      expect(received).toBe(expected);
    }

    // ── 11. Non-top-5 user cannot claim (err u416 = not in top 5) ────────
    const { result: noRankClaim } = simnet.callPublicFn(
      "prediction-market",
      "claim-winnings-stx",
      [Cl.uint(eventId)],
      wallets[5], // rank 6
    );
    expect(noRankClaim).toBeErr(Cl.uint(416));

    // ── 12. Double claim blocked (err u417 = already-claimed-event) ───────
    const { result: doubleClaim } = simnet.callPublicFn(
      "prediction-market",
      "claim-winnings-stx",
      [Cl.uint(eventId)],
      top5[0],
    );
    expect(doubleClaim).toBeErr(Cl.uint(417));

    // ── 13. Admin can withdraw 2% treasury fees ───────────────────────────
    const expectedFees = Math.floor((expectedTotalPool * 2) / 100);
    const adminBalBefore = stxBalanceOf(deployer);
    const { result: withdrawRes } = simnet.callPublicFn(
      "prediction-market",
      "withdraw-fees",
      [Cl.uint(expectedFees)],
      deployer,
    );
    expect(withdrawRes.type).toBe(ClarityType.ResponseOk);
    const adminBalAfter = stxBalanceOf(deployer);
    expect(Number(adminBalAfter - adminBalBefore)).toBe(expectedFees);
  });

  // ── Disputed market resolution path ─────────────────────────────────────

  it("keeper can dispute and override a result", () => {
    const eventId = createStxEvent("E: Dispute test", 5);
    const mktId = addMarket(eventId, "BTC > $110k?", 11_000_000);

    // wallet_1 bets YES
    expect(predictStx(mktId, true, wallets[0])).toBeOk(Cl.bool(true));

    // Mine past close-block
    simnet.mineEmptyBlocks(10);

    // Set oracle price BELOW target → outcome = NO
    simnet.callPublicFn(
      "mock-pyth",
      "set-btc-price",
      [Cl.uint(9_000_000)],
      deployer,
    );

    const { result: propRes } = simnet.callPublicFn(
      "prediction-market",
      "propose-result",
      [
        Cl.uint(mktId),
        Cl.contractPrincipal(deployer.split(".")[0], "mock-pyth"),
      ],
      deployer,
    );
    expect(propRes).toBeOk(Cl.bool(false)); // proposed = NO

    // wallet_1 disputes within window
    const { result: disputeRes } = simnet.callPublicFn(
      "prediction-market",
      "dispute-result",
      [Cl.uint(mktId)],
      wallets[0],
    );
    expect(disputeRes).toBeOk(Cl.bool(true));

    // Keeper overrides — uses stored oracle price (9_000_000 < 11_000_000 → still NO)
    const { result: overrideRes } = simnet.callPublicFn(
      "prediction-market",
      "override-result",
      [Cl.uint(mktId)],
      deployer,
    );
    expect(overrideRes.type).toBe(ClarityType.ResponseOk);

    // Market should be "final"
    const { result: mktRaw } = simnet.callReadOnlyFn(
      "prediction-market",
      "get-market",
      [Cl.uint(mktId)],
      deployer,
    );
    // OptionalSome.value.value = tuple fields; status is StringAscii with .value = string
    const mktStatus = (mktRaw as any).value.value["status"].value as string;
    expect(mktStatus).toBe("final");
  });

  // ── sBTC token guard ─────────────────────────────────────────────────────

  it("claim-winnings-stx fails on an sBTC event (err u223 = invalid-token)", () => {
    // self-contained: create an sBTC event here
    const eventId = createSbtcEvent("E: sBTC guard test");
    addMarket(eventId, "BTC stable?", 9_000_000);

    // Don't need to close it — the check for use-sbtc fires before close check
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "claim-winnings-stx",
      [Cl.uint(eventId)],
      wallets[0],
    );
    expect(result).toBeErr(Cl.uint(223));
  });

  // ── close-event before close-block guard ────────────────────────────────

  it("close-event before close-block fails (err u204 = event-not-closed)", () => {
    const eventId = createStxEvent("E: Early close", 1000); // far-future close
    addMarket(eventId, "BTC?", 9_000_000);
    const { result } = simnet.callPublicFn(
      "prediction-market",
      "close-event",
      [Cl.uint(eventId)],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(204)); // err-event-not-closed
  });
});
