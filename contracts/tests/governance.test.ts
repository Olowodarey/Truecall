import { describe, expect, it } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

// ─────────────────────────────────────────────────────────────────────────────
//  Accounts
// ─────────────────────────────────────────────────────────────────────────────
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const carol = accounts.get("wallet_3")!;
const dave = accounts.get("wallet_4")!;

// ─────────────────────────────────────────────────────────────────────────────
//  Constants matching governance.clar defaults
// ─────────────────────────────────────────────────────────────────────────────
const STAKE_AMOUNT = 10_000_000; // 10 STX
const MIN_STAKE_AGE = 144; // blocks (1 day)
const VOTING_DURATION = 144; // blocks
const EXECUTION_WINDOW = 720; // blocks

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Set governance as the admin in staking.clar — once per simnet */
function wireGovernance() {
  // deployer is the initial governance-contract var in staking.clar
  const stakingAddr = `${deployer.split(".")[0]}.staking`;
  simnet.callPublicFn(
    "staking",
    "set-governance-contract",
    [Cl.principal(`${deployer.split(".")[0]}.governance`)],
    deployer,
  );
  return stakingAddr;
}

/** Lower governance thresholds so tests don't need to mine 144 blocks */
function relaxGovernance() {
  simnet.callPublicFn(
    "governance",
    "set-min-stake-age",
    [Cl.uint(0)],
    deployer,
  );
  simnet.callPublicFn(
    "governance",
    "set-min-stake",
    [Cl.uint(1_000_000)],
    deployer,
  );
  simnet.callPublicFn(
    "governance",
    "set-quorum-threshold",
    [Cl.uint(1_000_000)],
    deployer,
  );
  simnet.callPublicFn(
    "governance",
    "set-voting-duration",
    [Cl.uint(5)],
    deployer,
  );
  simnet.callPublicFn(
    "governance",
    "set-execution-window",
    [Cl.uint(720)],
    deployer,
  );
}

/** Stake STX for a user */
function stake(user: string, amount = STAKE_AMOUNT) {
  const res = simnet.callPublicFn(
    "staking",
    "deposit-stx",
    [Cl.uint(amount)],
    user,
  ).result;
  if (res.type !== ClarityType.ResponseOk)
    throw new Error(`stake failed for ${user}: ${JSON.stringify(res)}`);
}

/** Create a standard proposal (deployer as admin/proposer after stake) */
function createProposal(user = deployer, title = "Will BTC hit $200k?") {
  const { result } = simnet.callPublicFn(
    "governance",
    "create-proposal",
    [
      Cl.stringAscii(title),
      Cl.stringAscii("BTC > $200k by end of 2025?"),
      Cl.uint(20_000_000), // target-price
      Cl.uint(10_000_000), // entry-fee
      Cl.uint(200), // blocks-open for prediction market
      Cl.bool(false), // use-sbtc
    ],
    user,
  );
  if (result.type !== ClarityType.ResponseOk)
    throw new Error(`create-proposal failed: ${JSON.stringify(result)}`);
  return Number((result as any).value.value);
}

/** Read proposal status string */
function getStatus(proposalId: number): string {
  const { result } = simnet.callReadOnlyFn(
    "governance",
    "get-proposal",
    [Cl.uint(proposalId)],
    deployer,
  );
  // OptionalSome.value = TupleCV, TupleCV.value = { field: ClarityValue }
  // StringAscii.value = the raw string
  return (result as any).value.value["status"].value as string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("governance — full DAO lifecycle", () => {
  // ── Admin management ──────────────────────────────────────────────────────

  it("deployer can update voting-duration", () => {
    const { result } = simnet.callPublicFn(
      "governance",
      "set-voting-duration",
      [Cl.uint(288)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("non-admin cannot update voting-duration (err u400)", () => {
    const { result } = simnet.callPublicFn(
      "governance",
      "set-voting-duration",
      [Cl.uint(288)],
      alice,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  // ── Proposal creation guards ──────────────────────────────────────────────

  it("unstaked user cannot create proposal (err u405 = below-min-stake)", () => {
    wireGovernance();
    relaxGovernance();
    const { result } = simnet.callPublicFn(
      "governance",
      "create-proposal",
      [
        Cl.stringAscii("Unstaked"),
        Cl.stringAscii("Will fail?"),
        Cl.uint(1_000_000),
        Cl.uint(1_000_000),
        Cl.uint(100),
        Cl.bool(false),
      ],
      alice, // alice has no stake
    );
    expect(result).toBeErr(Cl.uint(405));
  });

  it("stake age check rejects a brand-new staker (err u406) unless min-stake-age is 0", () => {
    wireGovernance();
    // Set min-stake-age to 10 blocks so staking right now fails
    simnet.callPublicFn(
      "governance",
      "set-min-stake-age",
      [Cl.uint(10)],
      deployer,
    );
    simnet.callPublicFn(
      "governance",
      "set-min-stake",
      [Cl.uint(1_000_000)],
      deployer,
    );
    stake(alice); // stake now, no blocks elapsed
    const { result } = simnet.callPublicFn(
      "governance",
      "create-proposal",
      [
        Cl.stringAscii("Too young"),
        Cl.stringAscii("Q?"),
        Cl.uint(1_000_000),
        Cl.uint(1_000_000),
        Cl.uint(100),
        Cl.bool(false),
      ],
      alice,
    );
    expect(result).toBeErr(Cl.uint(406));
  });

  it("spam limit: cannot create more than 2 active proposals (err u410)", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    createProposal(deployer, "Prop 1");
    createProposal(deployer, "Prop 2");
    const { result } = simnet.callPublicFn(
      "governance",
      "create-proposal",
      [
        Cl.stringAscii("Prop 3 - blocked"),
        Cl.stringAscii("Q?"),
        Cl.uint(1_000_000),
        Cl.uint(1_000_000),
        Cl.uint(100),
        Cl.bool(false),
      ],
      deployer,
    );
    expect(result).toBeErr(Cl.uint(410));
  });

  // ── Voting guards ─────────────────────────────────────────────────────────

  it("double vote is rejected (err u403)", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    stake(alice);
    const pid = createProposal(deployer);
    // First vote
    expect(
      simnet.callPublicFn(
        "governance",
        "cast-vote",
        [Cl.uint(pid), Cl.bool(true)],
        alice,
      ).result,
    ).toBeOk(Cl.bool(true));
    // Second vote - same user
    expect(
      simnet.callPublicFn(
        "governance",
        "cast-vote",
        [Cl.uint(pid), Cl.bool(false)],
        alice,
      ).result,
    ).toBeErr(Cl.uint(403));
  });

  it("cannot vote on a non-existent proposal (err u401)", () => {
    wireGovernance();
    relaxGovernance();
    stake(alice);
    const { result } = simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(999), Cl.bool(true)],
      alice,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it("cannot vote after voting window closes (err u404)", () => {
    wireGovernance();
    relaxGovernance(); // voting-duration = 5 blocks
    stake(deployer);
    stake(alice);
    const pid = createProposal(deployer);
    simnet.mineEmptyBlocks(10); // past voting duration
    const { result } = simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(true)],
      alice,
    );
    expect(result).toBeErr(Cl.uint(404));
  });

  // ── Stake locking ─────────────────────────────────────────────────────────

  it("voter cannot withdraw stake while vote window is open (err u102)", () => {
    wireGovernance();
    relaxGovernance(); // voting-duration = 5 blocks
    stake(deployer);
    stake(alice);
    const pid = createProposal(deployer);

    // Alice votes - this locks her stake
    expect(
      simnet.callPublicFn(
        "governance",
        "cast-vote",
        [Cl.uint(pid), Cl.bool(true)],
        alice,
      ).result,
    ).toBeOk(Cl.bool(true));

    // Alice tries to withdraw immediately - should fail
    const { result } = simnet.callPublicFn(
      "staking",
      "withdraw-stx",
      [Cl.uint(STAKE_AMOUNT)],
      alice,
    );
    expect(result).toBeErr(Cl.uint(102)); // err-stake-locked
  });

  it("voter can withdraw stake after voting window ends", () => {
    wireGovernance();
    relaxGovernance(); // voting-duration = 5 blocks
    stake(deployer);
    stake(alice);
    const pid = createProposal(deployer);

    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(true)],
      alice,
    );

    // Mine past voting window
    simnet.mineEmptyBlocks(10);

    const { result } = simnet.callPublicFn(
      "staking",
      "withdraw-stx",
      [Cl.uint(STAKE_AMOUNT)],
      alice,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  // ── Cancel proposal ───────────────────────────────────────────────────────

  it("proposer can cancel their own active proposal", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    const pid = createProposal(deployer);
    expect(
      simnet.callPublicFn(
        "governance",
        "cancel-proposal",
        [Cl.uint(pid)],
        deployer,
      ).result,
    ).toBeOk(Cl.bool(true));
    expect(getStatus(pid)).toBe("cancelled");
  });

  it("non-proposer cannot cancel (err u400)", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    const pid = createProposal(deployer);
    expect(
      simnet.callPublicFn(
        "governance",
        "cancel-proposal",
        [Cl.uint(pid)],
        alice,
      ).result,
    ).toBeErr(Cl.uint(400));
  });

  it("cannot cancel after voting window closes (err u404)", () => {
    wireGovernance();
    relaxGovernance(); // voting-duration = 5 blocks
    stake(deployer);
    const pid = createProposal(deployer);
    simnet.mineEmptyBlocks(10); // past voting-duration
    expect(
      simnet.callPublicFn(
        "governance",
        "cancel-proposal",
        [Cl.uint(pid)],
        deployer,
      ).result,
    ).toBeErr(Cl.uint(404));
  });

  // ── Finalize proposal ─────────────────────────────────────────────────────

  it("cannot finalize before voting window ends (err u412)", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    const pid = createProposal(deployer);
    expect(
      simnet.callPublicFn(
        "governance",
        "finalize-proposal",
        [Cl.uint(pid)],
        deployer,
      ).result,
    ).toBeErr(Cl.uint(412));
  });

  it("proposal rejected if quorum not met", () => {
    wireGovernance();
    relaxGovernance(); // quorum = 1 STX, voting-duration = 5
    stake(deployer);
    const pid = createProposal(deployer);
    // No votes cast - quorum not met
    simnet.mineEmptyBlocks(10);
    const { result } = simnet.callPublicFn(
      "governance",
      "finalize-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    // no-quorum means rejected
    expect(result.type).toBe(ClarityType.ResponseOk);
    expect(getStatus(pid)).toBe("rejected");
  });

  it("proposal approved when YES > NO and quorum met", () => {
    wireGovernance();
    relaxGovernance(); // quorum = 1 STX
    stake(deployer);
    stake(alice);
    stake(bob);
    const pid = createProposal(deployer);
    // Alice and Bob vote YES
    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(true)],
      alice,
    );
    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(true)],
      bob,
    );
    simnet.mineEmptyBlocks(10);
    const { result } = simnet.callPublicFn(
      "governance",
      "finalize-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(result.type).toBe(ClarityType.ResponseOk);
    expect(getStatus(pid)).toBe("approved");
  });

  it("proposal rejected when NO > YES even with quorum", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    stake(alice);
    stake(bob);
    stake(carol);
    const pid = createProposal(deployer);
    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(false)],
      alice,
    );
    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(false)],
      bob,
    );
    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(false)],
      carol,
    );
    simnet.mineEmptyBlocks(10);
    simnet.callPublicFn(
      "governance",
      "finalize-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(getStatus(pid)).toBe("rejected");
  });

  // ── Execute proposal ──────────────────────────────────────────────────────

  it("cannot execute a rejected proposal (err u408)", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    const pid = createProposal(deployer);
    // No votes, quorum missed -> rejected
    simnet.mineEmptyBlocks(10);
    simnet.callPublicFn(
      "governance",
      "finalize-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(getStatus(pid)).toBe("rejected");
    expect(
      simnet.callPublicFn(
        "governance",
        "execute-proposal",
        [Cl.uint(pid)],
        deployer,
      ).result,
    ).toBeErr(Cl.uint(408));
  });

  it("expired proposal - keeper misses execution window (err u411)", () => {
    wireGovernance();
    relaxGovernance(); // execution-window = 720
    simnet.callPublicFn(
      "governance",
      "set-execution-window",
      [Cl.uint(2)],
      deployer,
    );
    stake(deployer);
    stake(alice);
    const pid = createProposal(deployer);
    simnet.callPublicFn(
      "governance",
      "cast-vote",
      [Cl.uint(pid), Cl.bool(true)],
      alice,
    );
    simnet.mineEmptyBlocks(10); // vote ends
    simnet.callPublicFn(
      "governance",
      "finalize-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(getStatus(pid)).toBe("approved");
    // Mine way past execution window (2 blocks)
    simnet.mineEmptyBlocks(20);

    // execute-proposal returns err-expired (no state change due to Clarity atomicity)
    const { result: execResult } = simnet.callPublicFn(
      "governance",
      "execute-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(execResult).toBeErr(Cl.uint(411));

    // expire-proposal explicitly marks the proposal as expired (state + ok)
    const { result: expireResult } = simnet.callPublicFn(
      "governance",
      "expire-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(expireResult).toBeOk(Cl.bool(true));
    expect(getStatus(pid)).toBe("expired");

    // execute-proposal now also fails because status is "expired" not "approved" (err u408)
    const { result: execResult2 } = simnet.callPublicFn(
      "governance",
      "execute-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(execResult2).toBeErr(Cl.uint(408));
  });

  // ── Full end-to-end: propose -> vote -> approve -> execute -> event created ─

  it("full flow: proposal approved and executed creates a prediction-market event", () => {
    wireGovernance();
    relaxGovernance();
    stake(deployer);
    stake(alice);
    stake(bob);

    // 1. Create proposal
    const pid = createProposal(deployer, "BTC $300k?");

    // 2. Two stakers vote YES
    expect(
      simnet.callPublicFn(
        "governance",
        "cast-vote",
        [Cl.uint(pid), Cl.bool(true)],
        alice,
      ).result,
    ).toBeOk(Cl.bool(true));
    expect(
      simnet.callPublicFn(
        "governance",
        "cast-vote",
        [Cl.uint(pid), Cl.bool(true)],
        bob,
      ).result,
    ).toBeOk(Cl.bool(true));

    // 3. Check vote totals
    const { result: totals } = simnet.callReadOnlyFn(
      "governance",
      "get-vote-totals",
      [Cl.uint(pid)],
      deployer,
    );
    const t = (totals as any).value;
    expect(Number(t["total-votes"].value)).toBeGreaterThanOrEqual(1_000_000);
    expect(t["quorum-met"].type).toBe(ClarityType.BoolTrue);

    // 4. Mine past voting window then finalize
    simnet.mineEmptyBlocks(10);
    const { result: finRes } = simnet.callPublicFn(
      "governance",
      "finalize-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(finRes.type).toBe(ClarityType.ResponseOk);
    expect(getStatus(pid)).toBe("approved");

    // 5. Execute - creates prediction-market event
    const { result: execRes } = simnet.callPublicFn(
      "governance",
      "execute-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    expect(execRes.type).toBe(ClarityType.ResponseOk);
    const eventId = Number((execRes as any).value.value);
    expect(eventId).toBeGreaterThan(0);
    expect(getStatus(pid)).toBe("executed");

    // 6. Verify the event exists in prediction-market with dao-approved = true
    const { result: evRaw } = simnet.callReadOnlyFn(
      "prediction-market",
      "get-event",
      [Cl.uint(eventId)],
      deployer,
    );
    expect(evRaw.type).toBe(ClarityType.OptionalSome);
    const evFields = (evRaw as any).value.value as Record<string, any>;
    expect(evFields["dao-approved"].type).toBe(ClarityType.BoolTrue);

    // 7. Verify proposal stores the event-id
    const { result: propRaw } = simnet.callReadOnlyFn(
      "governance",
      "get-proposal",
      [Cl.uint(pid)],
      deployer,
    );
    const propFields = (propRaw as any).value.value as Record<string, any>;
    expect(Number(propFields["event-id"].value)).toBe(eventId);
  });
});
