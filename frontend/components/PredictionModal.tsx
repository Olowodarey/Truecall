"use client";

import { useState, useEffect } from "react";
import type { ChainEvent, ChainMarket } from "@/lib/types";
import { getMarketsForEvent, predictStx } from "@/lib/stacks";
import { useWallet } from "@/contexts/WalletContext";

interface PredictionModalProps {
  event: ChainEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PredictionModal({
  event,
  isOpen,
  onClose,
}: PredictionModalProps) {
  const { isConnected, connectWallet, userSession } = useWallet();
  const [markets, setMarkets] = useState<ChainMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<ChainMarket | null>(
    null,
  );
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setLoadingMarkets(true);
      getMarketsForEvent(event.id)
        .then((m) => {
          setMarkets(m.filter((mk) => mk.status === "open"));
        })
        .finally(() => setLoadingMarkets(false));
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const feeLabel = event.useSbtc
    ? `${event.entryFee} sats`
    : `${(event.entryFee / 1_000_000).toFixed(2)} STX`;

  const handleSubmit = async () => {
    if (!selectedMarket || prediction === null) {
      setError("Please select a market and a YES/NO prediction");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await predictStx(selectedMarket.id, prediction, userSession as any);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2500);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit prediction");
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMarkets([]);
    setSelectedMarket(null);
    setPrediction(null);
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-lg w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Make Your Prediction
          </h2>
          <button
            onClick={() => {
              if (!isSubmitting) {
                onClose();
                resetForm();
              }
            }}
            className="text-gray-400 hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Event Info */}
        <div className="mb-5 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white">{event.title}</h3>
          <p className="text-sm text-gray-400 mt-1">
            Entry: {feeLabel} · Pool:{" "}
            {event.useSbtc
              ? `${event.totalPool} sats`
              : `${(event.totalPool / 1_000_000).toFixed(2)} STX`}
          </p>
        </div>

        {/* Wallet gate */}
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">Connect your wallet to predict</p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Market Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Market
              </label>
              {loadingMarkets ? (
                <div className="text-center text-gray-400 py-4">
                  Loading markets...
                </div>
              ) : markets.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No open markets for this event
                </div>
              ) : (
                <div className="space-y-2">
                  {markets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMarket(m);
                        setPrediction(null);
                      }}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedMarket?.id === m.id
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-gray-600 bg-gray-700/30 hover:border-orange-500/50"
                      }`}
                    >
                      <p className="text-white font-medium text-sm">
                        {m.question}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Target: ${(m.targetPrice / 100).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* YES / NO */}
            {selectedMarket && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Prediction
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrediction(true)}
                    className={`py-4 rounded-lg border-2 font-bold transition-all ${
                      prediction === true
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-gray-600 bg-gray-700/30 text-gray-300 hover:border-green-500/50"
                    }`}
                  >
                    ✅ YES
                  </button>
                  <button
                    onClick={() => setPrediction(false)}
                    className={`py-4 rounded-lg border-2 font-bold transition-all ${
                      prediction === false
                        ? "border-red-500 bg-red-500/20 text-red-400"
                        : "border-gray-600 bg-gray-700/30 text-gray-300 hover:border-red-500/50"
                    }`}
                  >
                    ❌ NO
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                Prediction submitted! Waiting for blockchain confirmation...
              </div>
            )}

            <button
              id="submit-prediction"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedMarket || prediction === null}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : `Predict · Pay ${feeLabel}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
