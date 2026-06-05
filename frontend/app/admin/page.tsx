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
  Edit,
  Trash2,
  Trophy,
  Calendar,
  Link as LinkIcon,
  Unlink,
  FileText,
  Activity,
} from "lucide-react";

type TabType = "overview" | "verify" | "matches" | "users" | "fees" | "settings";

interface UserRecord {
  address: string;
  twitterHandle?: string;
  twitterId?: string;
  verifiedAt?: number;
  isVerified: boolean;
}

interface MatchData {
  matchId: number;
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  apiMatchId: string;
  kickoffTime: number;
  status: number;
  finalHomeScore: number;
  finalAwayScore: number;
  verifiedAt: number;
}

export default function EnhancedAdminDashboard() {
  const router = useRouter();
  const { isConnected, address, connectWallet } = useWallet();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celo.id;

  const isAdmin = isAdminAddress(address ?? undefined);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [mounted, setMounted] = useState(false);

  // States for different operations
  const [verifyAddress, setVerifyAddress] = useState("");
  const [unverifyAddress, setUnverifyAddress] = useState("");
  const [batchAddresses, setBatchAddresses] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  
  // Match result submission
  const [matchIdForResult, setMatchIdForResult] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [matchSearchTerm, setMatchSearchTerm] = useState("");
  
  // User management
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userAddressToLink, setUserAddressToLink] = useState("");
  const [twitterHandleToLink, setTwitterHandleToLink] = useState("");
  const [userAddressToUnlink, setUserAddressToUnlink] = useState("");

  // Transaction states
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

  useEffect(() => {
    if (isTxSuccess) {
      setTxSuccess("✅ Transaction successful!");
      setTxError(null);
      refetchFee();
      refetchPending();
      // Clear inputs
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

  const totalEvents = nextEventId ? Number(nextEventId) - 1 : 0;
  const totalMatches = nextMatchId ? Number(nextMatchId) - 1 : 0;

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-7xl">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-10 h-10 text-orange-500" />
                <h1 className="text-4xl font-bold text-white">
                  Admin Control Center
                </h1>
              </div>
              <p className="text-gray-400">
                Complete platform management and monitoring
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700 px-4 py-2">
              <p className="text-gray-400 text-xs">Admin Wallet</p>
              <p className="text-white font-mono text-sm">
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </p>
            </div>
          </div>
        </div>

        {/* Network Warning */}
        {isWrongNetwork && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <p className="text-orange-400 text-sm flex-1">
              ⚠️ Wrong network. Switch to Celo Mainnet to perform admin actions.
            </p>
            <button
              onClick={() => switchChainAsync({ chainId: celo.id })}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition text-sm"
            >
              Switch Network
            </button>
          </div>
        )}

        {/* Transaction Status */}
        {txSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-400 text-sm flex-1">{txSuccess}</p>
            <button
              onClick={() => setTxSuccess(null)}
              className="text-green-500 hover:text-green-400"
            >
              ✕
            </button>
          </div>
        )}

        {txError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-400 text-sm flex-1">{txError}</p>
            <button
              onClick={() => setTxError(null)}
              className="text-red-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        )}
