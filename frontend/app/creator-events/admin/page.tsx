"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { celoSepolia } from "@/lib/wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  CREATOR_EVENT_MANAGER_ADDRESS,
  CREATOR_EVENT_MANAGER_ABI,
} from "@/lib/creator-contracts";

// ─── Config ───────────────────────────────────────────────────────────────────

const ADMIN = "0xAB26c86b78DEDb488Bf0cb4FaCe11b048DDeFE5b";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreatorAdminPage() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celoSepolia.id;
  const isAdmin = address?.toLowerCase() === ADMIN.toLowerCase();

  // ── On-chain reads ────────────────────────────────────────────────────────

  const { data: currentFeeWei, refetch: refetchFee } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "creationFee",
  });

  const { data: pendingFeesWei, refetch: refetchPending } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "pendingFees",
  });

  const { data: treasuryAddress } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "treasury",
  });

  const { data: totalEvents } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "nextEventId",
  });

  const currentFee = currentFeeWei
    ? formatEther(currentFeeWei as bigint)
    : "...";
  const pendingFees = pendingFeesWei
    ? formatEther(pendingFeesWei as bigint)
    : "...";
  const hasPendingFees =
    pendingFeesWei && (pendingFeesWei as bigint) > BigInt(0);

  // ── Set Fee ───────────────────────────────────────────────────────────────

  const [newFee, setNewFee] = useState("");
  const [feeError, setFeeError] = useState<string | null>(null);

  const {
    writeContract: setFeeWrite,
    data: setFeeTx,
    isPending: setFeePending,
    error: setFeeWriteError,
    reset: resetSetFee,
  } = useWriteContract();
  const { isLoading: setFeeMining, isSuccess: setFeeDone } =
    useWaitForTransactionReceipt({ hash: setFeeTx });

  useEffect(() => {
    if (setFeeDone) {
      refetchFee();
      setNewFee("");
    }
  }, [setFeeDone, refetchFee]);

  const handleSetFee = async () => {
    setFeeError(null);
    const val = parseFloat(newFee);
    if (isNaN(val) || val <= 0) {
      setFeeError("Enter a valid CELO amount (e.g. 0.1)");
      return;
    }
    resetSetFee();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    setFeeWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "setCreationFee",
      args: [parseEther(newFee)],
    });
  };

  // ── Withdraw Fees ─────────────────────────────────────────────────────────

  const [recipientAddress, setRecipientAddress] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const {
    writeContract: withdrawWrite,
    data: withdrawTx,
    isPending: withdrawPending,
    error: withdrawWriteError,
    reset: resetWithdraw,
  } = useWriteContract();
  const { isLoading: withdrawMining, isSuccess: withdrawDone } =
    useWaitForTransactionReceipt({ hash: withdrawTx });

  useEffect(() => {
    if (withdrawDone) {
      refetchPending();
      setRecipientAddress(""); // Clear the input after successful withdrawal
    }
  }, [withdrawDone, refetchPending]);

  // Pre-fill treasury address only once on mount
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  useEffect(() => {
    if (treasuryAddress && !hasAutoFilled && !recipientAddress) {
      setRecipientAddress(String(treasuryAddress));
      setHasAutoFilled(true);
    }
  }, [treasuryAddress, hasAutoFilled, recipientAddress]);

  const handleWithdraw = async () => {
    setWithdrawError(null);

    // Validate recipient address
    if (!recipientAddress || !recipientAddress.startsWith("0x")) {
      setWithdrawError("Enter a valid wallet address (0x...)");
      return;
    }

    if (recipientAddress.length !== 42) {
      setWithdrawError("Wallet address must be 42 characters");
      return;
    }

    resetWithdraw();

    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celoSepolia.id });
      } catch {
        return;
      }
    }

    withdrawWrite({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "withdrawFees",
      args: [recipientAddress as `0x${string}`],
    });
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!isConnected)
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10">
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin Access</h2>
            <p className="text-gray-400 mb-6">
              Connect your admin wallet to continue
            </p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 px-8 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!isAdmin)
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto bg-red-900/20 border border-red-900/50 rounded-2xl p-10">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-red-400 font-bold text-xl mb-4">
              Unauthorized
            </h2>
            <p className="text-gray-400 text-sm mb-2">Connected as:</p>
            <code className="text-gray-500 text-xs break-all block mb-4">
              {address}
            </code>
            <p className="text-gray-500 text-sm">
              Only the contract owner can access this panel.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );

  // ── Main panel ────────────────────────────────────────────────────────────

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 max-w-3xl mt-8">
        <button
          onClick={() => router.push("/creator-events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 text-sm"
        >
          ← Back to Events
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Creator Events Admin
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage fees for{" "}
            <a
              href={`https://celo-sepolia.blockscout.com/address/${CREATOR_EVENT_MANAGER_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 font-mono text-xs"
            >
              {CREATOR_EVENT_MANAGER_ADDRESS.slice(0, 10)}…
              {CREATOR_EVENT_MANAGER_ADDRESS.slice(-8)}
            </a>
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Current Fee",
              value: `${currentFee} CELO`,
              highlight: true,
            },
            {
              label: "Pending Fees",
              value: `${pendingFees} CELO`,
              highlight: hasPendingFees,
            },
            {
              label: "Total Events",
              value: totalEvents !== undefined ? String(totalEvents) : "...",
            },
            {
              label: "Treasury",
              value: treasuryAddress
                ? `${String(treasuryAddress).slice(0, 6)}…${String(treasuryAddress).slice(-4)}`
                : "...",
            },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4"
            >
              <p className="text-gray-400 text-xs uppercase font-semibold mb-1">
                {label}
              </p>
              <p
                className={`font-bold text-lg ${highlight ? "text-orange-400" : "text-white"}`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Set Creation Fee ─────────────────────────────────────────── */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-1">
              Set Creation Fee
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Applies to all events created after this change.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New fee (CELO)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={newFee}
                  onChange={(e) => {
                    setNewFee(e.target.value);
                    setFeeError(null);
                  }}
                  placeholder="e.g. 0.1"
                  min="0"
                  step="0.01"
                  disabled={setFeePending || setFeeMining}
                  className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSetFee}
                  disabled={setFeePending || setFeeMining || !newFee}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-lg transition disabled:opacity-50"
                >
                  {setFeePending
                    ? "Confirm…"
                    : setFeeMining
                      ? "Setting…"
                      : "Set"}
                </button>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mb-4">
              {["0.05", "0.1", "0.5", "1"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNewFee(v)}
                  disabled={setFeePending || setFeeMining}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
                    newFee === v
                      ? "bg-orange-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {v} CELO
                </button>
              ))}
            </div>

            {feeError && (
              <p className="text-red-400 text-sm mb-3">⚠️ {feeError}</p>
            )}
            {setFeeWriteError && (
              <p className="text-red-400 text-sm mb-3">
                ⚠️ {setFeeWriteError.message?.split(".")[0]}
              </p>
            )}
            {setFeeDone && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span>✅ Fee updated to {newFee || "?"} CELO</span>
                {setFeeTx && (
                  <a
                    href={`https://celo-sepolia.blockscout.com/tx/${setFeeTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-orange-400 underline"
                  >
                    tx
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Withdraw Fees ─────────────────────────────────────────────── */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-1">Withdraw Fees</h2>
            <p className="text-gray-400 text-sm mb-5">
              Sends all accumulated CELO to the specified wallet address.
            </p>

            <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">
                  Available to withdraw
                </span>
                <span
                  className={`font-bold text-lg ${hasPendingFees ? "text-green-400" : "text-gray-500"}`}
                >
                  {pendingFees} CELO
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destination
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => {
                    setRecipientAddress(e.target.value);
                    setWithdrawError(null);
                  }}
                  placeholder="0xAB26...FE5b"
                  disabled={withdrawPending || withdrawMining}
                  className="w-full px-4 py-2.5 pr-20 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                />
                {recipientAddress && !withdrawPending && !withdrawMining && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientAddress("");
                      setWithdrawError(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-600 rounded transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={
                withdrawPending ||
                withdrawMining ||
                !hasPendingFees ||
                !recipientAddress
              }
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {withdrawPending
                ? "Confirm in wallet…"
                : withdrawMining
                  ? "Withdrawing…"
                  : hasPendingFees
                    ? `Withdraw ${pendingFees} CELO`
                    : "Nothing to withdraw"}
            </button>

            {withdrawError && (
              <p className="text-red-400 text-sm mt-3">⚠️ {withdrawError}</p>
            )}
            {withdrawWriteError && (
              <p className="text-red-400 text-sm mt-3">
                ⚠️ {withdrawWriteError.message?.split(".")[0]}
              </p>
            )}
            {withdrawDone && (
              <div className="flex items-center gap-2 text-green-400 text-sm mt-3">
                <span>✅ Fees withdrawn successfully</span>
                {withdrawTx && (
                  <a
                    href={`https://celo-sepolia.blockscout.com/tx/${withdrawTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-orange-400 underline"
                  >
                    tx
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contract info */}
        <div className="mt-6 bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-500 text-xs font-semibold uppercase mb-3">
            Contract Info
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">Proxy</span>
              <a
                href={`https://celo-sepolia.blockscout.com/address/${CREATOR_EVENT_MANAGER_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300"
              >
                {CREATOR_EVENT_MANAGER_ADDRESS}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Network</span>
              <span className="text-gray-300">Celo Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
