"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useWallet } from "@/contexts/WalletContext";
import { CONTRACTS, HIRO_API } from "@/lib/contracts";
import {
  getStakeInfo,
  getGovernanceConfig,
  depositStx,
  withdrawStx,
  depositSbtc,
  withdrawSbtc,
  type GovernanceConfig,
} from "@/lib/stacks";
import type { ChainStakeInfo } from "@/lib/types";

type Tab = "stake" | "unstake";

export default function StakingPage() {
  const { isConnected, connectWallet, userAddress } = useWallet();

  const [stakeInfo, setStakeInfo] = useState<ChainStakeInfo | null>(null);
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [loading, setLoading] = useState(false);

  // form
  const [tab, setTab] = useState<Tab>("stake");
  const [token, setToken] = useState<"stx" | "sbtc">("stx");
  const [amount, setAmount] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isConnected || !userAddress) return;
    try {
      setLoading(true);
      const [info, cfg, blockData] = await Promise.all([
        getStakeInfo(userAddress),
        getGovernanceConfig(),
        fetch(`${HIRO_API}/v2/info`).then((r) => r.json()),
      ]);
      setStakeInfo(info);
      setConfig(cfg);
      setCurrentBlock(blockData.stacks_tip_height ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stxBalanceStx = (stakeInfo?.stxBalance ?? 0) / 1e6;
  const lockedUntil = stakeInfo?.lockedUntil ?? 0;
  const stakeAge =
    stakeInfo && stakeInfo.stxStakedAt > 0
      ? Math.max(0, currentBlock - stakeInfo.stxStakedAt)
      : 0;
  const ageRequired = config?.minStakeAge ?? 144;
  const minStakeStx = (config?.minStake ?? 1_000_000) / 1e6;
  const isLocked = currentBlock < lockedUntil;
  const isEligible = stxBalanceStx >= minStakeStx && stakeAge >= ageRequired;

  const amountNum = parseFloat(amount) || 0;

  const handleStake = async () => {
    if (!amountNum) return;
    setPendingAction("stake");
    if (token === "stx") {
      await depositStx(Math.round(amountNum * 1e6), {
        onFinish: () => {
          setPendingAction(null);
          setAmount("");
          setTimeout(loadData, 2000);
        },
        onCancel: () => setPendingAction(null),
      });
    } else {
      await depositSbtc(Math.round(amountNum), CONTRACTS.MOCK_SBTC, {
        onFinish: () => {
          setPendingAction(null);
          setAmount("");
          setTimeout(loadData, 2000);
        },
        onCancel: () => setPendingAction(null),
      });
    }
  };

  const handleUnstake = async () => {
    if (!amountNum) return;
    setPendingAction("unstake");
    if (token === "stx") {
      await withdrawStx(Math.round(amountNum * 1e6), {
        onFinish: () => {
          setPendingAction(null);
          setAmount("");
          setTimeout(loadData, 2000);
        },
        onCancel: () => setPendingAction(null),
      });
    } else {
      await withdrawSbtc(Math.round(amountNum), CONTRACTS.MOCK_SBTC, {
        onFinish: () => {
          setPendingAction(null);
          setAmount("");
          setTimeout(loadData, 2000);
        },
        onCancel: () => setPendingAction(null),
      });
    }
  };

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background dots */}
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

        <main className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-3">
              Stake &amp; Govern
            </h1>
            <p className="text-gray-300 text-lg">
              Stake STX or sBTC to earn voting rights and submit governance
              proposals
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              {
                step: "1",
                icon: "💰",
                title: "Stake",
                desc: `Deposit ≥ ${minStakeStx} STX and hold for ≥ ${ageRequired} blocks (~${Math.round(ageRequired / 144)} day)`,
              },
              {
                step: "2",
                icon: "📋",
                title: "Propose",
                desc: "Submit a new prediction event idea to the DAO via the Governance page",
              },
              {
                step: "3",
                icon: "🗳",
                title: "Vote & Earn",
                desc: "Vote YES/NO on proposals. Your stake is locked until the vote window closes",
              },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-5 text-center"
              >
                <div className="text-3xl mb-2">{icon}</div>
                <h3 className="text-white font-bold mb-1">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>

          {!isConnected ? (
            <div className="max-w-md mx-auto text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
              <p className="text-gray-400 mb-5 text-lg">
                Connect wallet to stake
              </p>
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-10 rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* ── Left: Stats panel ── */}
              <div className="lg:col-span-2 space-y-4">
                {/* STX stake card */}
                <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5">
                  <p className="text-gray-400 text-sm mb-1">Your STX stake</p>
                  <p className="text-4xl font-bold text-white">
                    {loading ? "…" : stxBalanceStx.toFixed(4)}
                    <span className="text-orange-400 text-xl ml-2">STX</span>
                  </p>

                  {stakeInfo && stakeInfo.stxBalance > 0 && (
                    <>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Stake age</span>
                          <span
                            className={
                              stakeAge >= ageRequired
                                ? "text-green-400"
                                : "text-yellow-400"
                            }
                          >
                            {stakeAge} / {ageRequired} blocks
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-green-500"
                            style={{
                              width: `${Math.min(100, (stakeAge / ageRequired) * 100)}%`,
                            }}
                          />
                        </div>

                        <div className="flex justify-between mt-2">
                          <span className="text-gray-400">Status</span>
                          {isEligible ? (
                            <span className="text-green-400 font-semibold">
                              ✓ Eligible to propose &amp; vote
                            </span>
                          ) : stakeAge < ageRequired ? (
                            <span className="text-yellow-400">
                              Maturing ({ageRequired - stakeAge} blocks left)
                            </span>
                          ) : (
                            <span className="text-red-400">
                              Below min ({minStakeStx} STX)
                            </span>
                          )}
                        </div>

                        {isLocked && (
                          <div className="flex justify-between text-yellow-400">
                            <span className="text-gray-400">Locked until</span>
                            <span>Block #{lockedUntil}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Go to governance CTA */}
                {isEligible && (
                  <Link
                    href="/governance"
                    className="block w-full text-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    📋 Submit a Governance Proposal →
                  </Link>
                )}

                {/* Config info */}
                {config && (
                  <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 space-y-2 text-xs text-gray-400">
                    <h4 className="text-gray-300 font-semibold text-sm mb-2">
                      Governance Rules
                    </h4>
                    <div className="flex justify-between">
                      <span>Min stake to participate</span>
                      <span className="text-white">{minStakeStx} STX</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stake age required</span>
                      <span className="text-white">
                        {config.minStakeAge} blocks (~
                        {Math.round(config.minStakeAge / 144)}d)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vote duration</span>
                      <span className="text-white">
                        {config.votingDuration} blocks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quorum threshold</span>
                      <span className="text-white">
                        {(config.quorumThreshold / 1e6).toFixed(0)} STX
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max active proposals</span>
                      <span className="text-white">2 per address</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right: Stake/Unstake form ── */}
              <div className="lg:col-span-3">
                <div className="bg-gray-800/60 border border-gray-700 rounded-2xl overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-700">
                    {(["stake", "unstake"] as Tab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-4 font-semibold text-sm transition-colors capitalize ${
                          tab === t
                            ? "bg-gray-700/60 text-white border-b-2 border-orange-500"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        {t === "stake" ? "Stake" : "Unstake"}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Token toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Token
                      </label>
                      <div className="flex gap-3">
                        {(["stx", "sbtc"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setToken(t)}
                            className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all uppercase ${
                              token === t
                                ? "bg-orange-500/20 border-orange-500/60 text-orange-400"
                                : "border-gray-600 text-gray-400 hover:border-gray-500"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount ({token === "stx" ? "STX" : "sats"})
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={token === "stx" ? 0.000001 : 1}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={token === "stx" ? "0.000001" : "1000"}
                          className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        {tab === "unstake" && token === "stx" && stakeInfo && (
                          <button
                            onClick={() => setAmount(stxBalanceStx.toFixed(6))}
                            className="absolute right-3 top-3 px-2 py-1 text-xs text-orange-400 border border-orange-500/40 rounded hover:bg-orange-500/10"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      {token === "stx" && amountNum > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          = {Math.round(amountNum * 1e6).toLocaleString()}{" "}
                          microSTX
                        </p>
                      )}
                    </div>

                    {/* Warnings */}
                    {tab === "unstake" && isLocked && (
                      <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-3 text-yellow-400 text-sm">
                        ⚠ Your stake is locked in an active vote until block #
                        {lockedUntil}. Withdrawal blocked.
                      </div>
                    )}
                    {tab === "stake" &&
                      token === "stx" &&
                      amountNum > 0 &&
                      amountNum < minStakeStx && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-400 text-sm">
                          ℹ Minimum for governance participation is{" "}
                          {minStakeStx} STX. You can still stake, but you won't
                          be able to propose or vote until you reach the
                          minimum.
                        </div>
                      )}

                    {/* Action button */}
                    <button
                      disabled={
                        !amountNum ||
                        !!pendingAction ||
                        (tab === "unstake" && isLocked)
                      }
                      onClick={tab === "stake" ? handleStake : handleUnstake}
                      className={`w-full font-bold py-4 rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        tab === "stake"
                          ? "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                          : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                      }`}
                    >
                      {pendingAction
                        ? "Waiting for wallet…"
                        : tab === "stake"
                          ? `Stake ${amountNum > 0 ? amountNum : ""} ${token.toUpperCase()}`
                          : `Unstake ${amountNum > 0 ? amountNum : ""} ${token.toUpperCase()}`}
                    </button>

                    {/* After staking info */}
                    {tab === "stake" && (
                      <p className="text-xs text-gray-500 text-center">
                        After staking, wait {ageRequired} blocks for your stake
                        to mature before proposing or voting.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
