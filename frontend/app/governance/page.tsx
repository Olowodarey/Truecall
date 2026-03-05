"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useWallet } from "@/contexts/WalletContext";
import { DEPLOYER, HIRO_API } from "@/lib/contracts";
import {
  getAllProposals,
  getGovernanceConfig,
  getUserVote,
  getStakeInfo,
  createProposal,
  castVote,
  cancelProposal,
  finalizeProposal,
  executeProposal,
  expireProposal,
  type GovernanceConfig,
} from "@/lib/stacks";

type Proposal = Awaited<ReturnType<typeof getAllProposals>>[number];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/40",
  approved: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  rejected: "bg-red-500/15 text-red-400 border-red-500/40",
  executed: "bg-purple-500/15 text-purple-400 border-purple-500/40",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/40",
  expired: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
};

export default function GovernancePage() {
  const { isConnected, connectWallet, userAddress } = useWallet();
  const isAdmin = userAddress === DEPLOYER;

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [userVotes, setUserVotes] = useState<
    Record<number, { vote: boolean; power: number }>
  >({});
  const [currentBlock, setCurrentBlock] = useState(0);
  const [stakeBalance, setStakeBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"proposals" | "create">(
    "proposals",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Proposal form
  const [form, setForm] = useState({
    title: "",
    question: "",
    targetPrice: 10000000, // $100k in cents
    entryFeeStx: 1,
    blocksOpen: 144, // ~24h
    useSbtc: false,
  });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [propsData, cfgData, blockInfo] = await Promise.all([
        getAllProposals(30),
        getGovernanceConfig(),
        fetch(`${HIRO_API}/v2/info`).then((r) => r.json()),
      ]);
      setProposals(propsData);
      setConfig(cfgData);
      setCurrentBlock(blockInfo.stacks_tip_height ?? 0);

      if (isConnected && userAddress) {
        const stakeInfo = await getStakeInfo(userAddress);
        setStakeBalance(stakeInfo.stxBalance);

        const votes: Record<number, { vote: boolean; power: number }> = {};
        await Promise.all(
          propsData.map(async (p) => {
            const v = await getUserVote(p.id, userAddress);
            if (v) votes[p.id] = v;
          }),
        );
        setUserVotes(votes);
      }
    } catch (err) {
      console.error("Failed to load governance data:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const doAction = async (key: string, fn: () => Promise<void>) => {
    setPendingAction(key);
    await fn();
    setPendingAction(null);
    setTimeout(loadData, 2000);
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    await createProposal(
      form.title,
      form.question,
      form.targetPrice,
      form.entryFeeStx * 1_000_000,
      form.blocksOpen,
      form.useSbtc,
      {
        onFinish: () => {
          setCreating(false);
          setActiveTab("proposals");
          setTimeout(loadData, 2000);
        },
        onCancel: () => setCreating(false),
      },
    );
  };

  const filteredProposals =
    statusFilter === "all"
      ? proposals
      : proposals.filter((p) => p.status === statusFilter);

  const canCreateProposal =
    isConnected && stakeBalance >= (config?.minStake ?? Infinity);

  const voteBarPercent = (p: Proposal) => {
    const total = p.yesVotes + p.noVotes;
    if (total === 0) return 50;
    return Math.round((p.yesVotes / total) * 100);
  };

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background grid */}
      <div
        className="absolute inset-0 z-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #f9731630 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-3">
              DAO Governance
            </h1>
            <p className="text-gray-300 text-lg">
              Stake STX · Propose events · Vote on the future of TrueCall
            </p>
            {config && (
              <div className="flex justify-center gap-6 mt-4 flex-wrap">
                <Stat
                  label="Vote Duration"
                  value={`${config.votingDuration} blocks`}
                />
                <Stat
                  label="Min Stake"
                  value={`${(config.minStake / 1e6).toFixed(1)} STX`}
                />
                <Stat
                  label="Quorum"
                  value={`${(config.quorumThreshold / 1e6).toFixed(1)} STX`}
                />
                <Stat
                  label="Exec Window"
                  value={`${config.executionWindow} blocks`}
                />
              </div>
            )}
          </div>

          {/* Wallet banner */}
          {!isConnected && (
            <div className="mb-8 bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 flex items-center justify-between">
              <p className="text-orange-300">
                Connect wallet to propose & vote
              </p>
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-2 px-6 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all"
              >
                Connect Wallet
              </button>
            </div>
          )}

          {isConnected && stakeBalance > 0 && (
            <div className="mb-6 bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-gray-300 text-sm">
                Your stake:{" "}
                <span className="text-white font-semibold">
                  {(stakeBalance / 1e6).toFixed(2)} STX
                </span>
                {stakeBalance < (config?.minStake ?? 0) ? (
                  <span className="text-red-400 ml-2">
                    (below {(config!.minStake / 1e6).toFixed(0)} STX min — stake
                    more to participate)
                  </span>
                ) : (
                  <span className="text-green-400 ml-2">
                    ✓ Eligible to vote & propose
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-8 gap-1">
            {(["proposals", "create"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold rounded-t-lg transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-gray-800 text-white border border-b-0 border-gray-700"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {tab === "create" ? "Submit Proposal" : "All Proposals"}
              </button>
            ))}
          </div>

          {/* ─── Proposals Tab ─── */}
          {activeTab === "proposals" && (
            <>
              {/* Status filter */}
              <div className="flex gap-2 flex-wrap mb-6">
                {[
                  "all",
                  "active",
                  "approved",
                  "rejected",
                  "executed",
                  "cancelled",
                  "expired",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                      statusFilter === s
                        ? "bg-orange-500/20 border-orange-500/60 text-orange-400"
                        : "border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
                  <p className="text-gray-400 mt-4">
                    Loading proposals from chain…
                  </p>
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg">
                    No {statusFilter !== "all" ? statusFilter : ""} proposals
                    yet
                  </p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all"
                  >
                    Submit the first one →
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredProposals.map((p) => {
                    const myVote = userVotes[p.id];
                    const votingOpen = currentBlock < p.voteEndBlock;
                    const blocksLeft = p.voteEndBlock - currentBlock;
                    const yesPercent = voteBarPercent(p);
                    const totalVotes = p.yesVotes + p.noVotes;
                    const quorumMet =
                      totalVotes >= (config?.quorumThreshold ?? 0);
                    const expiryBlock =
                      p.voteEndBlock + (config?.executionWindow ?? 0);
                    const isExpired =
                      p.status === "approved" && currentBlock > expiryBlock;

                    return (
                      <div
                        key={p.id}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/60 hover:border-orange-500/30 transition-all"
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-500 text-sm">
                                #{p.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[p.status] ?? STATUS_STYLES.cancelled}`}
                              >
                                {p.status.toUpperCase()}
                              </span>
                              {p.status === "active" && votingOpen && (
                                <span className="text-xs text-gray-400">
                                  {blocksLeft > 0
                                    ? `${blocksLeft} blocks left`
                                    : "Closing…"}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-white">
                              {p.title}
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">
                              {p.question}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">Target</p>
                            <p className="text-orange-400 font-semibold">
                              ${(p.targetPrice / 100).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Fee: {(p.entryFee / 1e6).toFixed(2)}{" "}
                              {p.useSbtc ? "sBTC" : "STX"}
                            </p>
                          </div>
                        </div>

                        {/* Vote bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span className="text-green-400">
                              YES {(p.yesVotes / 1e6).toFixed(1)} STX
                            </span>
                            <span
                              className={
                                quorumMet ? "text-green-400" : "text-gray-500"
                              }
                            >
                              {quorumMet
                                ? "✓ Quorum met"
                                : `Quorum: ${((totalVotes / (config?.quorumThreshold ?? 1)) * 100).toFixed(0)}%`}
                            </span>
                            <span className="text-red-400">
                              NO {(p.noVotes / 1e6).toFixed(1)} STX
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-red-500/30 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                              style={{ width: `${yesPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* My vote indicator */}
                        {myVote && (
                          <div
                            className={`mb-3 text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${
                              myVote.vote
                                ? "bg-green-500/10 text-green-400 border border-green-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {myVote.vote
                              ? "✅ You voted YES"
                              : "❌ You voted NO"}
                            <span className="text-gray-500">
                              ({(myVote.power / 1e6).toFixed(2)} STX)
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {/* VOTE */}
                          {p.status === "active" &&
                            votingOpen &&
                            isConnected &&
                            !myVote &&
                            canCreateProposal && (
                              <>
                                <button
                                  disabled={!!pendingAction}
                                  onClick={() =>
                                    doAction(`vote-yes-${p.id}`, () =>
                                      castVote(p.id, true, {
                                        onFinish: () => setPendingAction(null),
                                        onCancel: () => setPendingAction(null),
                                      }),
                                    )
                                  }
                                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/25 disabled:opacity-50 transition"
                                >
                                  {pendingAction === `vote-yes-${p.id}`
                                    ? "Waiting…"
                                    : "👍 Vote YES"}
                                </button>
                                <button
                                  disabled={!!pendingAction}
                                  onClick={() =>
                                    doAction(`vote-no-${p.id}`, () =>
                                      castVote(p.id, false, {
                                        onFinish: () => setPendingAction(null),
                                        onCancel: () => setPendingAction(null),
                                      }),
                                    )
                                  }
                                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 disabled:opacity-50 transition"
                                >
                                  {pendingAction === `vote-no-${p.id}`
                                    ? "Waiting…"
                                    : "👎 Vote NO"}
                                </button>
                              </>
                            )}

                          {/* CANCEL (proposer only, voting open) */}
                          {p.status === "active" &&
                            votingOpen &&
                            userAddress === p.proposer && (
                              <button
                                disabled={!!pendingAction}
                                onClick={() =>
                                  doAction(`cancel-${p.id}`, () =>
                                    cancelProposal(p.id, {
                                      onFinish: () => setPendingAction(null),
                                      onCancel: () => setPendingAction(null),
                                    }),
                                  )
                                }
                                className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-600 text-gray-400 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50 transition"
                              >
                                Cancel
                              </button>
                            )}

                          {/* FINALIZE (admin, after voting window) */}
                          {p.status === "active" && !votingOpen && isAdmin && (
                            <button
                              disabled={!!pendingAction}
                              onClick={() =>
                                doAction(`finalize-${p.id}`, () =>
                                  finalizeProposal(p.id, {
                                    onFinish: () => setPendingAction(null),
                                    onCancel: () => setPendingAction(null),
                                  }),
                                )
                              }
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-500/15 border border-blue-500/40 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50 transition"
                            >
                              {pendingAction === `finalize-${p.id}`
                                ? "Waiting…"
                                : "📊 Finalize Vote"}
                            </button>
                          )}

                          {/* EXECUTE (admin, approved, within window) */}
                          {p.status === "approved" && !isExpired && isAdmin && (
                            <button
                              disabled={!!pendingAction}
                              onClick={() =>
                                doAction(`execute-${p.id}`, () =>
                                  executeProposal(p.id, {
                                    onFinish: () => setPendingAction(null),
                                    onCancel: () => setPendingAction(null),
                                  }),
                                )
                              }
                              className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-500/15 border border-purple-500/40 text-purple-400 hover:bg-purple-500/25 disabled:opacity-50 transition"
                            >
                              {pendingAction === `execute-${p.id}`
                                ? "Waiting…"
                                : "🚀 Execute Proposal"}
                            </button>
                          )}

                          {/* EXPIRE (anyone, approved + window past) */}
                          {p.status === "approved" && isExpired && (
                            <button
                              disabled={!!pendingAction}
                              onClick={() =>
                                doAction(`expire-${p.id}`, () =>
                                  expireProposal(p.id, {
                                    onFinish: () => setPendingAction(null),
                                    onCancel: () => setPendingAction(null),
                                  }),
                                )
                              }
                              className="px-3 py-2 rounded-lg text-xs font-medium border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50 transition"
                            >
                              Mark Expired
                            </button>
                          )}

                          {/* Executed badge */}
                          {p.status === "executed" && p.eventId > 0 && (
                            <span className="px-3 py-2 rounded-lg text-xs font-medium border border-purple-500/30 text-purple-400 bg-purple-500/5">
                              ✓ Event #{p.eventId} created
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ─── Create Proposal Tab ─── */}
          {activeTab === "create" && (
            <div className="max-w-2xl mx-auto">
              {!isConnected ? (
                <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
                  <p className="text-gray-400 mb-4">
                    Connect your wallet to submit a proposal
                  </p>
                  <button
                    onClick={connectWallet}
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : !canCreateProposal ? (
                <div className="text-center py-16 bg-red-900/10 rounded-xl border border-red-900/40">
                  <p className="text-red-400 font-semibold text-lg mb-2">
                    Insufficient Stake
                  </p>
                  <p className="text-gray-400">
                    You need at least{" "}
                    <span className="text-white font-semibold">
                      {config ? (config.minStake / 1e6).toFixed(0) : "?"} STX
                    </span>{" "}
                    staked for at least{" "}
                    <span className="text-white font-semibold">
                      {config?.minStakeAge} blocks
                    </span>{" "}
                    to create a proposal.
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Your current stake: {(stakeBalance / 1e6).toFixed(2)} STX
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleCreateProposal}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Submit a Proposal
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Community will vote and DAO can execute as a new
                      prediction event.
                    </p>
                  </div>

                  <Field label="Proposal Title *">
                    <input
                      type="text"
                      required
                      maxLength={64}
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="e.g., BTC $150k by Q3 2025"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </Field>

                  <Field label="Prediction Question *">
                    <textarea
                      required
                      maxLength={128}
                      rows={3}
                      value={form.question}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, question: e.target.value }))
                      }
                      placeholder="Will BTC reach $150,000 by block #210000?"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="BTC Target Price (USD cents)">
                      <input
                        type="number"
                        min={1}
                        required
                        value={form.targetPrice}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            targetPrice: Number(e.target.value),
                          }))
                        }
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        = ${(form.targetPrice / 100).toLocaleString()}
                      </p>
                    </Field>

                    <Field label="Entry Fee (STX)">
                      <input
                        type="number"
                        min={0.001}
                        step={0.001}
                        required
                        value={form.entryFeeStx}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            entryFeeStx: Number(e.target.value),
                          }))
                        }
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Event Duration (blocks)">
                      <input
                        type="number"
                        min={10}
                        required
                        value={form.blocksOpen}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            blocksOpen: Number(e.target.value),
                          }))
                        }
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        ~{Math.round(form.blocksOpen / 144)} days
                      </p>
                    </Field>

                    <Field label="Token">
                      <div className="flex gap-3 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="token"
                            checked={!form.useSbtc}
                            onChange={() =>
                              setForm((f) => ({ ...f, useSbtc: false }))
                            }
                            className="accent-orange-500"
                          />
                          <span className="text-white font-medium">STX</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="token"
                            checked={form.useSbtc}
                            onChange={() =>
                              setForm((f) => ({ ...f, useSbtc: true }))
                            }
                            className="accent-orange-500"
                          />
                          <span className="text-white font-medium">sBTC</span>
                        </label>
                      </div>
                    </Field>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4 text-sm text-gray-400 space-y-1">
                    <p>
                      📋 Voting lasts{" "}
                      <strong className="text-gray-200">
                        {config?.votingDuration} blocks
                      </strong>{" "}
                      ~{Math.round((config?.votingDuration ?? 0) / 144)} days
                    </p>
                    <p>
                      🗳 Quorum:{" "}
                      <strong className="text-gray-200">
                        {(config?.quorumThreshold ?? 0) / 1e6} STX
                      </strong>{" "}
                      total votes required
                    </p>
                    <p>
                      ⚡ Your stake:{" "}
                      <strong className="text-orange-400">
                        {(stakeBalance / 1e6).toFixed(2)} STX
                      </strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      creating || !form.title.trim() || !form.question.trim()
                    }
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating
                      ? "Waiting for wallet…"
                      : "Submit Proposal On-Chain"}
                  </button>
                </form>
              )}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-2 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
