"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useRouter } from "next/navigation";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { celo } from "@/lib/wagmi";
import {
  CREATOR_EVENT_MANAGER_ADDRESS,
  CREATOR_EVENT_MANAGER_ABI,
} from "@/lib/creator-contracts";
import { formatContractError } from "@/lib/error-formatter";
import { isAdminAddress } from "@/lib/utils";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import {
  Shield,
  DollarSign,
  Users,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

type TabType = "verify" | "fees" | "stats" | "settings";

export default function AdminDashboard() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celo.id;

  // Check if user is admin
  const isAdmin = isAdminAddress(address ?? undefined);

  const [activeTab, setActiveTab] = useState<TabType>("verify");
  const [mounted, setMounted] = useState(false);

  // Verify/Unverify states
  const [verifyAddress, setVerifyAddress] = useState("");
  const [unverifyAddress, setUnverifyAddress] = useState("");
  const [batchAddresses, setBatchAddresses] = useState("");

  // Fee states
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");

  // Transaction states
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (mounted && isConnected && !isAdmin) {
      router.push("/");
    }
  }, [mounted, isConnected, isAdmin, router]);

  // Read contract data
  const { data: creationFee, refetch: refetchFee } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "creationFee",
  });

  const { data: pendingFees, refetch: refetchPending } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "pendingFees",
  });

  const { data: nextEventId } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "nextEventId",
  });

  // Write contract hook
  const {
    writeContract,
    data: txHash,
    isPending: isTxPending,
    error: writeError,
    reset: resetTx,
  } = useWriteContract();

  const { isLoading: isTxMining, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const isBusy = isTxPending || isTxMining;

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess) {
      setTxSuccess("Transaction successful!");
      setTxError(null);
      // Refetch contract data
      refetchFee();
      refetchPending();
      // Clear inputs
      setVerifyAddress("");
      setUnverifyAddress("");
      setBatchAddresses("");
      setNewFeeAmount("");
      setWithdrawRecipient("");
      // Clear success message after 5s
      setTimeout(() => setTxSuccess(null), 5000);
      resetTx();
    }
  }, [isTxSuccess, refetchFee, refetchPending, resetTx]);

  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      setTxError(formatContractError(writeError));
      setTxSuccess(null);
    }
  }, [writeError]);

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-gray-800/50 backdrop-blur-xl p-10 rounded-3xl border border-gray-700 text-center max-w-lg">
            <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mb-8">
              Connect your admin wallet to access the dashboard
            </p>
            <button
              onClick={connectWallet}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-xl hover:shadow-lg transition"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-red-500/10 backdrop-blur-xl p-10 rounded-3xl border border-red-500/30 text-center max-w-lg">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-400 mb-8">
              This page is only accessible to admin wallets
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition"
            >
              Go Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-6xl">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400">
            Manage users, fees, and system settings
          </p>
        </div>

        {/* Network Warning */}
        {isWrongNetwork && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <p className="text-orange-400 text-sm">
              ⚠️ Wrong network. Please switch to Celo Mainnet to perform admin
              actions.
            </p>
            <button
              onClick={() => switchChainAsync({ chainId: celo.id })}
              className="ml-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition text-sm"
            >
              Switch Network
            </button>
          </div>
        )}

        {/* Transaction Status */}
        {txSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-400 text-sm">{txSuccess}</p>
          </div>
        )}

        {txError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400 text-sm">{txError}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            title="Creation Fee"
            value={
              creationFee ? `${formatEther(creationFee as bigint)} CELO` : "..."
            }
            color="text-green-500"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Pending Fees"
            value={
              pendingFees ? `${formatEther(pendingFees as bigint)} CELO` : "..."
            }
            color="text-blue-500"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            title="Total Events"
            value={nextEventId ? `${Number(nextEventId) - 1}` : "..."}
            color="text-purple-500"
          />
        </div>

        {/* Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-t-3xl border border-gray-700 border-b-0 p-2 flex gap-2 overflow-x-auto">
          <TabButton
            active={activeTab === "verify"}
            onClick={() => setActiveTab("verify")}
            icon={<Shield className="w-5 h-5" />}
            label="User Verification"
          />
          <TabButton
            active={activeTab === "fees"}
            onClick={() => setActiveTab("fees")}
            icon={<DollarSign className="w-5 h-5" />}
            label="Fee Management"
          />
          <TabButton
            active={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Statistics"
          />
          <TabButton
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
          />
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-b-3xl border border-gray-700 p-8">
          {activeTab === "verify" && (
            <VerifyTab
              verifyAddress={verifyAddress}
              setVerifyAddress={setVerifyAddress}
              unverifyAddress={unverifyAddress}
              setUnverifyAddress={setUnverifyAddress}
              batchAddresses={batchAddresses}
              setBatchAddresses={setBatchAddresses}
              onVerify={(addr) => {
                if (!addr || !addr.match(/^0x[a-fA-F0-9]{40}$/)) {
                  setTxError("Invalid address format");
                  return;
                }
                setTxError(null);
                writeContract({
                  address: CREATOR_EVENT_MANAGER_ADDRESS,
                  abi: CREATOR_EVENT_MANAGER_ABI,
                  functionName: "verifyAddress",
                  args: [addr as `0x${string}`],
                });
              }}
              onUnverify={(addr) => {
                if (!addr || !addr.match(/^0x[a-fA-F0-9]{40}$/)) {
                  setTxError("Invalid address format");
                  return;
                }
                setTxError(null);
                writeContract({
                  address: CREATOR_EVENT_MANAGER_ADDRESS,
                  abi: CREATOR_EVENT_MANAGER_ABI,
                  functionName: "unverifyAddress",
                  args: [addr as `0x${string}`],
                });
              }}
              onBatchVerify={(addrs) => {
                const addresses = addrs
                  .split("\n")
                  .map((a) => a.trim())
                  .filter((a) => a && a.match(/^0x[a-fA-F0-9]{40}$/));

                if (addresses.length === 0) {
                  setTxError("No valid addresses found");
                  return;
                }

                setTxError(null);
                writeContract({
                  address: CREATOR_EVENT_MANAGER_ADDRESS,
                  abi: CREATOR_EVENT_MANAGER_ABI,
                  functionName: "verifyAddressBatch",
                  args: [addresses as `0x${string}`[]],
                });
              }}
              isBusy={isBusy}
              isWrongNetwork={isWrongNetwork}
            />
          )}

          {activeTab === "fees" && (
            <FeesTab
              newFeeAmount={newFeeAmount}
              setNewFeeAmount={setNewFeeAmount}
              withdrawRecipient={withdrawRecipient}
              setWithdrawRecipient={setWithdrawRecipient}
              currentFee={
                creationFee ? formatEther(creationFee as bigint) : "0"
              }
              pendingFees={
                pendingFees ? formatEther(pendingFees as bigint) : "0"
              }
              onSetFee={(amount) => {
                try {
                  const weiAmount = parseEther(amount);
                  setTxError(null);
                  writeContract({
                    address: CREATOR_EVENT_MANAGER_ADDRESS,
                    abi: CREATOR_EVENT_MANAGER_ABI,
                    functionName: "setCreationFee",
                    args: [weiAmount],
                  });
                } catch (error) {
                  setTxError("Invalid amount format");
                }
              }}
              onWithdraw={(recipient) => {
                if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
                  setTxError("Invalid recipient address");
                  return;
                }
                setTxError(null);
                writeContract({
                  address: CREATOR_EVENT_MANAGER_ADDRESS,
                  abi: CREATOR_EVENT_MANAGER_ABI,
                  functionName: "withdrawFees",
                  args: [recipient as `0x${string}`],
                });
              }}
              isBusy={isBusy}
              isWrongNetwork={isWrongNetwork}
            />
          )}

          {activeTab === "stats" && (
            <StatsTab
              totalEvents={nextEventId ? Number(nextEventId) - 1 : 0}
              creationFee={
                creationFee ? formatEther(creationFee as bigint) : "0"
              }
              pendingFees={
                pendingFees ? formatEther(pendingFees as bigint) : "0"
              }
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              adminAddress={address ?? ""}
              contractAddress={CREATOR_EVENT_MANAGER_ADDRESS}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Components
function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={color}>{icon}</div>
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
        active
          ? "bg-orange-500 text-white"
          : "bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white"
      }`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function VerifyTab({
  verifyAddress,
  setVerifyAddress,
  unverifyAddress,
  setUnverifyAddress,
  batchAddresses,
  setBatchAddresses,
  onVerify,
  onUnverify,
  onBatchVerify,
  isBusy,
  isWrongNetwork,
}: {
  verifyAddress: string;
  setVerifyAddress: (val: string) => void;
  unverifyAddress: string;
  setUnverifyAddress: (val: string) => void;
  batchAddresses: string;
  setBatchAddresses: (val: string) => void;
  onVerify: (addr: string) => void;
  onUnverify: (addr: string) => void;
  onBatchVerify: (addrs: string) => void;
  isBusy: boolean;
  isWrongNetwork: boolean;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          Verify Address
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Manually verify a user's wallet address (fallback method)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={verifyAddress}
              onChange={(e) => setVerifyAddress(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none font-mono text-sm"
              disabled={isBusy}
            />
          </div>

          <button
            onClick={() => onVerify(verifyAddress)}
            disabled={isBusy || isWrongNetwork || !verifyAddress}
            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Verify Address
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-500" />
          Unverify Address
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Remove verification from a wallet address
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={unverifyAddress}
              onChange={(e) => setUnverifyAddress(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none font-mono text-sm"
              disabled={isBusy}
            />
          </div>

          <button
            onClick={() => onUnverify(unverifyAddress)}
            disabled={isBusy || isWrongNetwork || !unverifyAddress}
            className="w-full py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                Unverify Address
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          Batch Verify
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Verify multiple addresses at once (one per line)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Wallet Addresses (one per line)
            </label>
            <textarea
              placeholder="0x...&#10;0x...&#10;0x..."
              value={batchAddresses}
              onChange={(e) => setBatchAddresses(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm resize-none"
              disabled={isBusy}
            />
            <p className="text-gray-500 text-xs mt-2">
              {batchAddresses.split("\n").filter((a) => a.trim()).length}{" "}
              addresses entered
            </p>
          </div>

          <button
            onClick={() => onBatchVerify(batchAddresses)}
            disabled={isBusy || isWrongNetwork || !batchAddresses.trim()}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Batch Verify Addresses
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeesTab({
  newFeeAmount,
  setNewFeeAmount,
  withdrawRecipient,
  setWithdrawRecipient,
  currentFee,
  pendingFees,
  onSetFee,
  onWithdraw,
  isBusy,
  isWrongNetwork,
}: {
  newFeeAmount: string;
  setNewFeeAmount: (val: string) => void;
  withdrawRecipient: string;
  setWithdrawRecipient: (val: string) => void;
  currentFee: string;
  pendingFees: string;
  onSetFee: (amount: string) => void;
  onWithdraw: (recipient: string) => void;
  isBusy: boolean;
  isWrongNetwork: boolean;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-500" />
          Update Creation Fee
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Current fee:{" "}
          <span className="text-white font-bold">{currentFee} CELO</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              New Fee Amount (CELO)
            </label>
            <input
              type="text"
              placeholder="1.0"
              value={newFeeAmount}
              onChange={(e) => setNewFeeAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              disabled={isBusy}
            />
            <p className="text-gray-500 text-xs mt-2">
              Enter amount in CELO (e.g., 1.0 for 1 CELO)
            </p>
          </div>

          <button
            onClick={() => onSetFee(newFeeAmount)}
            disabled={isBusy || isWrongNetwork || !newFeeAmount}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Settings className="w-5 h-5" />
                Update Fee
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-500" />
          Withdraw Fees
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Available to withdraw:{" "}
          <span className="text-white font-bold">{pendingFees} CELO</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={withdrawRecipient}
              onChange={(e) => setWithdrawRecipient(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none font-mono text-sm"
              disabled={isBusy}
            />
          </div>

          <button
            onClick={() => onWithdraw(withdrawRecipient)}
            disabled={
              isBusy ||
              isWrongNetwork ||
              !withdrawRecipient ||
              Number(pendingFees) === 0
            }
            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Withdraw {pendingFees} CELO
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsTab({
  totalEvents,
  creationFee,
  pendingFees,
}: {
  totalEvents: number;
  creationFee: string;
  pendingFees: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-blue-500" />
        Platform Statistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard
          title="Total Events Created"
          value={totalEvents.toString()}
          description="Number of prediction events on the platform"
        />
        <InfoCard
          title="Creation Fee"
          value={`${creationFee} CELO`}
          description="Current fee to create an event"
        />
        <InfoCard
          title="Pending Fees"
          value={`${pendingFees} CELO`}
          description="Accumulated fees ready for withdrawal"
        />
        <InfoCard
          title="Total Revenue"
          value={`${pendingFees} CELO`}
          description="All-time fee collection"
        />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mt-8">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Platform Health
        </h3>
        <p className="text-gray-400 text-sm">
          The platform is operating normally. All admin functions are available.
        </p>
      </div>
    </div>
  );
}

function SettingsTab({
  adminAddress,
  contractAddress,
}: {
  adminAddress: string;
  contractAddress: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-400" />
        System Settings
      </h2>

      <InfoCard
        title="Admin Wallet"
        value={`${adminAddress.slice(0, 10)}...${adminAddress.slice(-8)}`}
        description="Your connected admin wallet address"
      />
      <InfoCard
        title="Contract Address"
        value={`${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`}
        description="CreatorEventManager contract (Celo Mainnet)"
      />

      <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-6 mt-8">
        <h3 className="text-white font-bold mb-4">Quick Links</h3>
        <div className="space-y-3">
          <a
            href={`https://celoscan.io/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            View Contract on Celoscan →
          </a>
          <a
            href="/creator-events"
            className="block px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            View All Events →
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-6">
      <h3 className="text-gray-400 text-sm font-semibold mb-2">{title}</h3>
      <p className="text-2xl font-bold text-white mb-2">{value}</p>
      <p className="text-gray-500 text-xs">{description}</p>
    </div>
  );
}
