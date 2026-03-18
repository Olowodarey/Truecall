"use client";

import { useState } from "react";
import type {
  ChainPrivateEvent,
  ChainRound,
  ChainRoundAnswer,
} from "@/lib/types";
import {
  deriveVisibleActions,
  deriveClaimState,
} from "@/lib/private-event-utils";
import {
  submitRoundQuestionTxOptions,
  skipMissedRoundTxOptions,
  answerRoundTxOptions,
  resolveRoundTxOptions,
  claimRoundPointsTxOptions,
} from "@/lib/private-stacks";

interface PrivateRoundPanelProps {
  event: ChainPrivateEvent;
  round: ChainRound | null;
  roundAnswer: ChainRoundAnswer | null;
  userAddress: string | null;
  isCreator: boolean;
  isParticipant: boolean;
  currentBlock: number;
  onActionComplete: () => void;
}

export default function PrivateRoundPanel({
  event,
  round,
  roundAnswer,
  userAddress,
  isCreator,
  isParticipant,
  currentBlock,
  onActionComplete,
}: PrivateRoundPanelProps) {
  const [pending, setPending] = useState(false);
  const [question, setQuestion] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [oraclePrice, setOraclePrice] = useState("");

  if (!round) {
    return (
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 text-center">
        <p className="text-gray-400">No active round</p>
      </div>
    );
  }

  const actions = deriveVisibleActions({
    status: round.status,
    isCreator,
    isParticipant,
    submitter: round.submitter,
    wallet: userAddress,
    currentBlock,
    submissionDeadline: round.submissionDeadline,
    answerCloseBlock: round.answerCloseBlock,
    hasAnswered: roundAnswer !== null,
    pointsClaimed: roundAnswer?.pointsClaimed ?? false,
  });

  const claimState = roundAnswer ? deriveClaimState(roundAnswer) : "none";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function callContract(txOptions: any) {
    setPending(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { openContractCall } = (await import("@stacks/connect")) as any;
    await openContractCall({
      ...txOptions,
      onFinish: () => {
        setPending(false);
        onActionComplete();
      },
      onCancel: () => {
        setPending(false);
      },
    });
  }

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !targetPrice) return;
    await callContract(
      submitRoundQuestionTxOptions(
        event.id,
        round.roundNumber,
        question.trim(),
        parseInt(targetPrice, 10),
      ),
    );
  };

  const handleSkip = () =>
    callContract(skipMissedRoundTxOptions(event.id, round.roundNumber));

  const handleAnswer = (prediction: boolean) =>
    callContract(answerRoundTxOptions(event.id, round.roundNumber, prediction));

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oraclePrice) return;
    await callContract(
      resolveRoundTxOptions(
        event.id,
        round.roundNumber,
        parseInt(oraclePrice, 10),
      ),
    );
  };

  const handleClaimPoints = () =>
    callContract(claimRoundPointsTxOptions(event.id, round.roundNumber));

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 space-y-6">
      {/* Round info */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg">
            Round {round.roundNumber}
          </h3>
          <p className="text-gray-400 text-sm mt-0.5">
            Submitter:{" "}
            <span className="text-gray-300 font-mono">
              {truncate(round.submitter)}
            </span>
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            round.status === "open-answer"
              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
              : round.status === "final"
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : round.status === "skipped"
                  ? "bg-gray-500/10 text-gray-400 border-gray-500/30"
                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
          }`}
        >
          {round.status}
        </span>
      </div>

      {/* ── submitQuestion ── */}
      {actions.includes("submitQuestion") && (
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <h4 className="text-white font-semibold">Submit Round Question</h4>
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Question (max 64 chars)
            </label>
            <input
              type="text"
              maxLength={64}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will BTC be above target at close?"
              className="w-full bg-gray-900/60 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Target BTC Price (whole $)
            </label>
            <input
              type="number"
              min={1}
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 65000"
              className="w-full bg-gray-900/60 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !question.trim() || !targetPrice}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg transition disabled:opacity-50"
          >
            {pending ? "Waiting for wallet…" : "Submit Question"}
          </button>
        </form>
      )}

      {/* Submission window closed notice (submitter, window expired, no question yet) */}
      {!actions.includes("submitQuestion") &&
        round.status === "pending-sub" &&
        userAddress === round.submitter &&
        currentBlock > round.submissionDeadline && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
            ⏰ Submission window closed
          </div>
        )}

      {/* ── skip ── */}
      {actions.includes("skip") && (
        <div className="space-y-3">
          <h4 className="text-white font-semibold">Skip Missed Round</h4>
          <p className="text-gray-400 text-sm">
            The submitter missed the submission window. Skip this round to
            continue.
          </p>
          <button
            onClick={handleSkip}
            disabled={pending}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2.5 px-6 rounded-lg transition disabled:opacity-50"
          >
            {pending ? "Waiting for wallet…" : "Skip Missed Round"}
          </button>
        </div>
      )}

      {/* ── answer ── */}
      {actions.includes("answer") && round.question && (
        <div className="space-y-4">
          <h4 className="text-white font-semibold">Make Your Prediction</h4>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30 space-y-1">
            <p className="text-gray-300">{round.question}</p>
            <p className="text-orange-400 font-semibold text-sm">
              Target: ${round.targetPrice.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleAnswer(true)}
              disabled={pending}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              {pending ? "Waiting for wallet…" : "✅ YES (≥ target)"}
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={pending}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              {pending ? "Waiting for wallet…" : "❌ NO (< target)"}
            </button>
          </div>
        </div>
      )}

      {/* Answer window closed notice */}
      {!actions.includes("answer") &&
        round.status === "open-answer" &&
        isParticipant &&
        roundAnswer === null &&
        currentBlock > round.answerCloseBlock && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
            ⏰ Answer window closed
          </div>
        )}

      {/* ── resolve ── */}
      {actions.includes("resolve") && (
        <form onSubmit={handleResolve} className="space-y-4">
          <h4 className="text-white font-semibold">Resolve Round</h4>
          {round.question && (
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30 space-y-1">
              <p className="text-gray-300 text-sm">{round.question}</p>
              <p className="text-orange-400 text-sm">
                Target: ${round.targetPrice.toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              BTC Oracle Price (whole $)
            </label>
            <input
              type="number"
              min={1}
              value={oraclePrice}
              onChange={(e) => setOraclePrice(e.target.value)}
              placeholder="e.g. 67000"
              className="w-full bg-gray-900/60 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !oraclePrice}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-lg transition disabled:opacity-50"
          >
            {pending ? "Waiting for wallet…" : "Resolve Round"}
          </button>
        </form>
      )}

      {/* ── claimPoints ── */}
      {actions.includes("claimPoints") && (
        <div className="space-y-3">
          {claimState === "claimed" ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 font-semibold text-center">
              Points Claimed ✓
            </div>
          ) : (
            <>
              <h4 className="text-white font-semibold">Claim Your Points</h4>
              <button
                onClick={handleClaimPoints}
                disabled={pending}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-lg transition disabled:opacity-50"
              >
                {pending ? "Waiting for wallet…" : "Claim Points"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Already answered indicator */}
      {roundAnswer !== null && round.status === "open-answer" && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-400 text-sm">
          Your prediction:{" "}
          <span className="font-bold">
            {roundAnswer.prediction ? "YES (≥ target)" : "NO (< target)"}
          </span>
        </div>
      )}
    </div>
  );
}
