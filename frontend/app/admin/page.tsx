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
  Search,
  Trophy,
  Calendar,
  Link as LinkIcon,
  Unlink,
  Activity,
  BarChart3,
} from "lucide-react";

type TabType =
  | "overview"
  | "verify"
  | "matches"
  | "users"
  | "fees"
  | "settings";

interface UserRecord {
  address: string;
  twitterHandle?: string;
  twitterId?: string;
  verifiedAt?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celo.id;
  const isAdmin = isAdminAddress(address ?? undefined);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [mounted, setMounted] = useState(false);

  // Form states
  const [verifyAddress, setVerifyAddress] = useState("");
  const [unverifyAddress, setUnverifyAddress] = useState("");
  const [batchAddresses, setBatchAddresses] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [matchIdForResult, setMatchIdForResult] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [matchSearchTerm, setMatchSearchTerm] = useState("");
  const [linkAddress, setLinkAddress] = useState("");
  const [linkTwitterHandle, setLinkTwitterHandle] = useState("");
  const [unlinkAddress, setUnlinkAddress] = useState("");

  // Data states
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const { data: nextMatchId } = useReadContract({
    address: CREATOR_EVENT_MANAGER_ADDRESS,
    abi: CREATOR_EVENT_MANAGER_ABI,
    functionName: "nextMatchId",
  });

  const {
    writeContract,
    data: txHash,
    isPending: isTxPending,
    error: writeError,
    reset: resetTx,
  } = useWriteContract();

  const { isLoading: isTxMining, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const isBusy = isTxPending || isTxMining;

  useEffect(() => {
    if (isTxSuccess) {
      setTxSuccess("✅ Transaction successful!");
      setTxError(null);
      refetchFee();
      refetchPending();
      setVerifyAddress("");
      setUnverifyAddress("");
      setBatchAddresses("");
      setNewFeeAmount("");
      setWithdrawRecipient("");
      setMatchIdForResult("");
      setHomeScore("");
      setAwayScore("");
      setTimeout(() => setTxSuccess(null), 5000);
      resetTx();
    }
  }, [isTxSuccess, refetchFee, refetchPending, resetTx]);

  useEffect(() => {
    if (writeError) {
      setTxError(formatContractError(writeError));
      setTxSuccess(null);
    }
  }, [writeError]);

  // Load users from backend
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab]);

  // Handler functions
  const handleVerify = (addr: string) => {
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
  };

  const handleUnverify = (addr: string) => {
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
  };

  const handleBatchVerify = (addrs: string) => {
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
  };

  const handleSubmitMatchResult = () => {
    const matchId = parseInt(matchIdForResult);
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(matchId) || matchId < 0) {
      setTxError("Invalid match ID");
      return;
    }
    if (isNaN(home) || home < 0 || home > 99) {
      setTxError("Home score must be 0-99");
      return;
    }
    if (isNaN(away) || away < 0 || away > 99) {
      setTxError("Away score must be 0-99");
      return;
    }

    if (
      !confirm(
        `Submit result for Match #${matchId}?\nScore: ${home} - ${away}\n\nThis action cannot be undone.`,
      )
    ) {
      return;
    }

    setTxError(null);
    writeContract({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "submitMatchResult",
      args: [BigInt(matchId), home, away],
    });
  };

  const handleSetFee = (amount: string) => {
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
  };

  const handleWithdraw = (recipient: string) => {
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
  };

  const handleLinkTwitter = async () => {
    if (!linkAddress || !linkTwitterHandle) {
      setTxError("Address and Twitter handle required");
      return;
    }

    try {
      const response = await fetch("/api/users/twitter/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: linkAddress,
          twitterHandle: linkTwitterHandle,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTxSuccess("✅ Twitter linked successfully!");
        setLinkAddress("");
        setLinkTwitterHandle("");
        loadUsers();
      } else {
        setTxError(data.message || "Failed to link Twitter");
      }
    } catch (error) {
      setTxError("Failed to link Twitter");
    }
  };

  const handleUnlinkTwitter = async () => {
    if (!unlinkAddress) {
      setTxError("Address required");
      return;
    }

    try {
      const response = await fetch("/api/users/twitter/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: unlinkAddress }),
      });

      if (response.ok) {
        setTxSuccess("✅ Twitter unlinked successfully!");
        setUnlinkAddress("");
        loadUsers();
      } else {
        setTxError("Failed to unlink Twitter");
      }
    } catch (error) {
      setTxError("Failed to unlink Twitter");
    }
  };

  if (!mounted) return null;

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
              Connect your admin wallet to access
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

  const totalEvents = nextEventId ? Number(nextEventId) - 1 : 0;
  const totalMatches = nextMatchId ? Number(nextMatchId) - 1 : 0;

  const filteredUsers = users.filter(
    (u) =>
      u.address.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.twitterHandle?.toLowerCase().includes(userSearchTerm.toLowerCase()),
  );

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <Shield className="w-10 h-10 text-orange-500" />
                <h1 className="text-4xl font-bold text-white">
                  Admin Control Center
                </h1>
              </div>
              <p className="text-gray-400 mt-2">Complete platform management</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700 px-4 py-2">
              <p className="text-gray-400 text-xs">Admin Wallet</p>
              <p className="text-white font-mono text-sm">
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </p>
            </div>
          </div>
        </div>

        {isWrongNetwork && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <p className="text-orange-400 text-sm flex-1">
              Wrong network detected
            </p>
            <button
              onClick={() => switchChainAsync({ chainId: celo.id })}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition text-sm"
            >
              Switch to Celo
            </button>
          </div>
        )}

        {txSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-400 text-sm flex-1">{txSuccess}</p>
            <button
              onClick={() => setTxSuccess(null)}
              className="text-green-500"
            >
              ✕
            </button>
          </div>
        )}

        {txError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400 text-sm flex-1">{txError}</p>
            <button onClick={() => setTxError(null)} className="text-red-500">
              ✕
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-6 h-6 text-green-500" />
              <h3 className="text-gray-400 text-sm font-medium">Events</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalEvents}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-blue-500" />
              <h3 className="text-gray-400 text-sm font-medium">Matches</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalMatches}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-6 h-6 text-yellow-500" />
              <h3 className="text-gray-400 text-sm font-medium">
                Pending Fees
              </h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {pendingFees ? `${formatEther(pendingFees as bigint)}` : "0"}
            </p>
            <p className="text-gray-500 text-xs mt-1">CELO</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-purple-500" />
              <h3 className="text-gray-400 text-sm font-medium">
                Creation Fee
              </h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {creationFee ? `${formatEther(creationFee as bigint)}` : "0"}
            </p>
            <p className="text-gray-500 text-xs mt-1">CELO</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-t-3xl border border-gray-700 border-b-0 p-2 flex gap-2 overflow-x-auto">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            icon={<BarChart3 className="w-5 h-5" />}
            label="Overview"
          />
          <TabButton
            active={activeTab === "verify"}
            onClick={() => setActiveTab("verify")}
            icon={<Shield className="w-5 h-5" />}
            label="User Verification"
          />
          <TabButton
            active={activeTab === "matches"}
            onClick={() => setActiveTab("matches")}
            icon={<Trophy className="w-5 h-5" />}
            label="Match Results"
          />
          <TabButton
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            icon={<Users className="w-5 h-5" />}
            label="User Management"
          />
          <TabButton
            active={activeTab === "fees"}
            onClick={() => setActiveTab("fees")}
            icon={<DollarSign className="w-5 h-5" />}
            label="Fee Management"
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
          {activeTab === "overview" && (
            <OverviewTab
              totalEvents={totalEvents}
              totalMatches={totalMatches}
              pendingFees={
                pendingFees ? formatEther(pendingFees as bigint) : "0"
              }
              creationFee={
                creationFee ? formatEther(creationFee as bigint) : "0"
              }
            />
          )}

          {activeTab === "verify" && (
            <VerifyTab
              verifyAddress={verifyAddress}
              setVerifyAddress={setVerifyAddress}
              unverifyAddress={unverifyAddress}
              setUnverifyAddress={setUnverifyAddress}
              batchAddresses={batchAddresses}
              setBatchAddresses={setBatchAddresses}
              onVerify={handleVerify}
              onUnverify={handleUnverify}
              onBatchVerify={handleBatchVerify}
              isBusy={isBusy}
              isWrongNetwork={isWrongNetwork}
            />
          )}

          {activeTab === "matches" && (
            <MatchesTab
              matchIdForResult={matchIdForResult}
              setMatchIdForResult={setMatchIdForResult}
              homeScore={homeScore}
              setHomeScore={setHomeScore}
              awayScore={awayScore}
              setAwayScore={setAwayScore}
              searchTerm={matchSearchTerm}
              setSearchTerm={setMatchSearchTerm}
              onSubmitResult={handleSubmitMatchResult}
              isBusy={isBusy}
              isWrongNetwork={isWrongNetwork}
            />
          )}

          {activeTab === "users" && (
            <UsersTab
              users={filteredUsers}
              loading={loadingUsers}
              searchTerm={userSearchTerm}
              setSearchTerm={setUserSearchTerm}
              linkAddress={linkAddress}
              setLinkAddress={setLinkAddress}
              linkTwitterHandle={linkTwitterHandle}
              setLinkTwitterHandle={setLinkTwitterHandle}
              unlinkAddress={unlinkAddress}
              setUnlinkAddress={setUnlinkAddress}
              onLinkTwitter={handleLinkTwitter}
              onUnlinkTwitter={handleUnlinkTwitter}
              onRefresh={loadUsers}
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
              onSetFee={handleSetFee}
              onWithdraw={handleWithdraw}
              isBusy={isBusy}
              isWrongNetwork={isWrongNetwork}
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

// ============= COMPONENTS =============

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

function OverviewTab({
  totalEvents,
  totalMatches,
  pendingFees,
  creationFee,
}: {
  totalEvents: number;
  totalMatches: number;
  pendingFees: string;
  creationFee: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-500" />
          Platform Overview
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Real-time statistics and platform health monitoring
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-6">
            <h3 className="text-gray-300 font-semibold mb-4">
              Event Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Events</span>
                <span className="text-white font-bold">{totalEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Matches</span>
                <span className="text-white font-bold">{totalMatches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Avg Matches/Event</span>
                <span className="text-white font-bold">
                  {totalEvents > 0
                    ? (totalMatches / totalEvents).toFixed(1)
                    : "0"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-6">
            <h3 className="text-gray-300 font-semibold mb-4">
              Financial Overview
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Creation Fee</span>
                <span className="text-white font-bold">{creationFee} CELO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Pending Fees</span>
                <span className="text-white font-bold">{pendingFees} CELO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Revenue</span>
                <span className="text-white font-bold">{pendingFees} CELO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          System Status
        </h3>
        <p className="text-gray-400 text-sm">
          ✅ All systems operational. Contract responding normally.
        </p>
      </div>
    </div>
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

function MatchesTab({
  matchIdForResult,
  setMatchIdForResult,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  searchTerm,
  setSearchTerm,
  onSubmitResult,
  isBusy,
  isWrongNetwork,
}: {
  matchIdForResult: string;
  setMatchIdForResult: (val: string) => void;
  homeScore: string;
  setHomeScore: (val: string) => void;
  awayScore: string;
  setAwayScore: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onSubmitResult: () => void;
  isBusy: boolean;
  isWrongNetwork: boolean;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Submit Match Result
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Submit match results manually when AI agent fails (ADMIN_ROLE
          required)
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 text-sm">
            ⚠️ <strong>Important:</strong> Only submit results if the AI agent
            has failed. This will determine winners and distribute points.
            Cannot be undone.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Match ID
            </label>
            <input
              type="number"
              placeholder="Enter match ID"
              value={matchIdForResult}
              onChange={(e) => setMatchIdForResult(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
              disabled={isBusy}
              min="0"
            />
            <p className="text-gray-500 text-xs mt-2">
              Find the match ID in the event details page
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Home Score
              </label>
              <input
                type="number"
                placeholder="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none text-center text-2xl font-bold"
                disabled={isBusy}
                min="0"
                max="99"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Away Score
              </label>
              <input
                type="number"
                placeholder="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none text-center text-2xl font-bold"
                disabled={isBusy}
                min="0"
                max="99"
              />
            </div>
          </div>

          {matchIdForResult && homeScore && awayScore && (
            <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
              <p className="text-gray-300 text-sm mb-2">Preview:</p>
              <p className="text-white font-bold text-lg text-center">
                Match #{matchIdForResult}: Final Score {homeScore} - {awayScore}
              </p>
            </div>
          )}

          <button
            onClick={onSubmitResult}
            disabled={
              isBusy ||
              isWrongNetwork ||
              !matchIdForResult ||
              !homeScore ||
              !awayScore
            }
            className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting Result...
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5" />
                Submit Match Result
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h3 className="text-xl font-bold text-white mb-4">Match Search</h3>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by match ID or event ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
          />
        </div>
        <p className="text-gray-500 text-sm mt-4">
          💡 Tip: View match details in the Creator Events page before
          submitting results
        </p>
      </div>
    </div>
  );
}

function UsersTab({
  users,
  loading,
  searchTerm,
  setSearchTerm,
  linkAddress,
  setLinkAddress,
  linkTwitterHandle,
  setLinkTwitterHandle,
  unlinkAddress,
  setUnlinkAddress,
  onLinkTwitter,
  onUnlinkTwitter,
  onRefresh,
}: {
  users: UserRecord[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  linkAddress: string;
  setLinkAddress: (val: string) => void;
  linkTwitterHandle: string;
  setLinkTwitterHandle: (val: string) => void;
  unlinkAddress: string;
  setUnlinkAddress: (val: string) => void;
  onLinkTwitter: () => void;
  onUnlinkTwitter: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-blue-500" />
          Link Twitter Account
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Manually link a Twitter account to a wallet address (admin override)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={linkAddress}
              onChange={(e) => setLinkAddress(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Twitter Handle
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                @
              </span>
              <input
                type="text"
                placeholder="username"
                value={linkTwitterHandle}
                onChange={(e) => setLinkTwitterHandle(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={onLinkTwitter}
            disabled={!linkAddress || !linkTwitterHandle}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LinkIcon className="w-5 h-5" />
            Link Twitter Account
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Unlink className="w-6 h-6 text-red-500" />
          Unlink Twitter Account
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Remove Twitter linkage from a wallet
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={unlinkAddress}
              onChange={(e) => setUnlinkAddress(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none font-mono text-sm"
            />
          </div>

          <button
            onClick={onUnlinkTwitter}
            disabled={!unlinkAddress}
            className="w-full py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Unlink className="w-5 h-5" />
            Unlink Twitter Account
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">User Directory</h3>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
          >
            Refresh
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by address or Twitter handle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-gray-700/30 rounded-xl">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.address}
                className="bg-gray-700/30 border border-gray-600 rounded-xl p-4 hover:border-gray-500 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-mono text-sm mb-1">
                      {user.address.slice(0, 10)}...{user.address.slice(-8)}
                    </p>
                    {user.twitterHandle && (
                      <p className="text-blue-400 text-sm flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />@{user.twitterHandle}
                      </p>
                    )}
                  </div>
                  {user.verifiedAt && (
                    <div className="flex items-center gap-2 text-green-400 text-xs">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
          <DollarSign className="w-6 h-6 text-yellow-500" />
          Update Creation Fee
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Set the CELO fee required to create a new event
        </p>

        <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm">Current Creation Fee:</span>
            <span className="text-white font-bold text-lg">
              {currentFee} CELO
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              New Fee Amount (CELO)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g., 0.1"
              value={newFeeAmount}
              onChange={(e) => setNewFeeAmount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
              disabled={isBusy}
              min="0"
            />
            <p className="text-gray-500 text-xs mt-2">
              💡 Recommended: 0.01 - 1.0 CELO per event
            </p>
          </div>

          {newFeeAmount && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-400 text-sm">
                Preview: New event creation fee will be{" "}
                <strong>{newFeeAmount} CELO</strong>
              </p>
            </div>
          )}

          <button
            onClick={() => onSetFee(newFeeAmount)}
            disabled={isBusy || isWrongNetwork || !newFeeAmount}
            className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Update Creation Fee
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          Withdraw Pending Fees
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Transfer accumulated fees from the contract to a recipient address
        </p>

        <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 text-sm">
              Available to Withdraw:
            </span>
            <span className="text-green-400 font-bold text-lg">
              {pendingFees} CELO
            </span>
          </div>
        </div>

        {parseFloat(pendingFees) === 0 ? (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <p className="text-orange-400 text-sm">
              ⚠️ No fees available to withdraw
            </p>
          </div>
        ) : null}

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
            <p className="text-gray-500 text-xs mt-2">
              Enter the wallet address to receive the fees
            </p>
          </div>

          {withdrawRecipient && parseFloat(pendingFees) > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-400 text-sm">
                Preview: Withdraw <strong>{pendingFees} CELO</strong> to{" "}
                <span className="font-mono">
                  {withdrawRecipient.slice(0, 10)}...
                  {withdrawRecipient.slice(-8)}
                </span>
              </p>
            </div>
          )}

          <button
            onClick={() => onWithdraw(withdrawRecipient)}
            disabled={
              isBusy ||
              isWrongNetwork ||
              !withdrawRecipient ||
              parseFloat(pendingFees) === 0
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
                <TrendingUp className="w-5 h-5" />
                Withdraw Fees
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Revenue Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Current Fee</p>
            <p className="text-white font-bold text-xl">{currentFee} CELO</p>
          </div>
          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Pending Fees</p>
            <p className="text-green-400 font-bold text-xl">
              {pendingFees} CELO
            </p>
          </div>
          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Total Revenue</p>
            <p className="text-purple-400 font-bold text-xl">
              {pendingFees} CELO
            </p>
          </div>
        </div>
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
  const explorerUrl = `https://celoscan.io/address/${contractAddress}`;
  const adminExplorerUrl = `https://celoscan.io/address/${adminAddress}`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-400" />
          Contract Information
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Core contract details and network information
        </p>

        <div className="space-y-4">
          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-400 text-xs mb-1">Contract Address</p>
                <p className="text-white font-mono text-sm break-all">
                  {contractAddress}
                </p>
              </div>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-2"
            >
              View on CeloScan →
            </a>
          </div>

          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Network</p>
            <p className="text-white font-semibold">Celo Mainnet</p>
            <p className="text-gray-500 text-xs mt-1">Chain ID: 42220</p>
          </div>

          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-400 text-xs mb-1">Admin Wallet (You)</p>
                <p className="text-white font-mono text-sm break-all">
                  {adminAddress}
                </p>
              </div>
            </div>
            <a
              href={adminExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-2"
            >
              View on CeloScan →
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-500" />
          Role Information
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Contract access control roles (view only)
        </p>

        <div className="space-y-4">
          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-red-500/20 border border-red-500/40 rounded text-red-400 text-xs font-semibold">
                DEFAULT_ADMIN_ROLE
              </span>
            </div>
            <p className="text-white font-mono text-sm mb-2">
              0x2c2A6E42E71350f80248Aee308Bd04A898c0C694
            </p>
            <p className="text-gray-400 text-xs">
              Super admin - Can manage roles and upgrade contract
            </p>
          </div>

          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/40 rounded text-orange-400 text-xs font-semibold">
                ADMIN_ROLE
              </span>
            </div>
            <p className="text-white font-mono text-sm mb-2">
              0x684835A1f131dcC3D4fF49A356556Fe0188Bd062
            </p>
            <p className="text-gray-400 text-xs">
              Admin - Can verify users, submit results, manage fees (YOU)
            </p>
          </div>

          <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded text-blue-400 text-xs font-semibold">
                ORACLE_ROLE
              </span>
            </div>
            <p className="text-white font-mono text-sm mb-2">
              0x684835A1f131dcC3D4fF49A356556Fe0188Bd062
            </p>
            <p className="text-gray-400 text-xs">
              Oracle - AI agent can submit match results automatically
            </p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-6">
          <p className="text-blue-400 text-sm">
            ℹ️ <strong>Note:</strong> Role changes must be done by the
            DEFAULT_ADMIN_ROLE holder using the deployer wallet.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-500" />
          System Status
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Platform health and operational status
        </p>

        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">
                Contract Active
              </p>
              <p className="text-gray-400 text-xs">
                All contract functions responding normally
              </p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">
                Backend API Operational
              </p>
              <p className="text-gray-400 text-xs">
                Railway deployment running: truecall-production.up.railway.app
              </p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">
                Frontend Deployed
              </p>
              <p className="text-gray-400 text-xs">
                Netlify deployment active: truecall.netlify.app
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6 text-yellow-500" />
          Quick Links
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Useful resources and external tools
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://celoscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700/30 border border-gray-600 hover:border-gray-500 rounded-xl p-4 transition group"
          >
            <p className="text-white font-semibold mb-1 group-hover:text-blue-400">
              CeloScan Explorer →
            </p>
            <p className="text-gray-400 text-xs">
              View transactions and contract activity
            </p>
          </a>

          <a
            href="https://truecall-production.up.railway.app"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700/30 border border-gray-600 hover:border-gray-500 rounded-xl p-4 transition group"
          >
            <p className="text-white font-semibold mb-1 group-hover:text-blue-400">
              Backend API →
            </p>
            <p className="text-gray-400 text-xs">
              Railway backend service status
            </p>
          </a>

          <a
            href="https://docs.celo.org"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700/30 border border-gray-600 hover:border-gray-500 rounded-xl p-4 transition group"
          >
            <p className="text-white font-semibold mb-1 group-hover:text-blue-400">
              Celo Documentation →
            </p>
            <p className="text-gray-400 text-xs">
              Learn more about Celo blockchain
            </p>
          </a>

          <a
            href="https://faucet.celo.org"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700/30 border border-gray-600 hover:border-gray-500 rounded-xl p-4 transition group"
          >
            <p className="text-white font-semibold mb-1 group-hover:text-blue-400">
              Celo Faucet →
            </p>
            <p className="text-gray-400 text-xs">
              Get testnet CELO for testing
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
