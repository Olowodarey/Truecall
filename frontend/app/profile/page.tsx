"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import { Twitter, CheckCircle, XCircle, Shield } from "lucide-react";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  OAuth2,
} from "@xdevplatform/xdk";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { celo } from "@/lib/wagmi";
import {
  CREATOR_EVENT_MANAGER_ADDRESS,
  CREATOR_EVENT_MANAGER_ABI,
} from "@/lib/creator-contracts";
import { formatContractError } from "@/lib/error-formatter";

interface UserProfile {
  address: string;
  twitterHandle?: string;
  twitterId?: string;
  twitterAvatar?: string;
  verifiedAt?: number;
}

export default function ProfilePage() {
  const { isConnected, address, connectWallet, isConnecting } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // Mounted guard: wagmi reads as disconnected during SSR, so we must wait
  // for the client to hydrate before trusting isConnected
  const [mounted, setMounted] = useState(false);

  // Check network
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const isWrongNetwork = chainId !== celo.id;

  // Read blockchain verification status
  const { data: isBlockchainVerified, refetch: refetchVerificationStatus } =
    useReadContract({
      address: CREATOR_EVENT_MANAGER_ADDRESS,
      abi: CREATOR_EVENT_MANAGER_ABI,
      functionName: "isVerified",
      args: address ? [address as `0x${string}`] : undefined,
      query: {
        enabled: !!address && isConnected,
      },
    });

  // Self-verify contract call
  const {
    writeContract,
    data: txHash,
    isPending: isVerifying,
    error: verifyWriteError,
    reset: resetVerify,
  } = useWriteContract();

  const { isLoading: isVerifyMining, isSuccess: verifySuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const verifyBusy = isVerifying || isVerifyMining;

  // Set mounted on client only
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isConnected && address) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [mounted, isConnected, address]);

  // Handle verification success
  useEffect(() => {
    if (verifySuccess) {
      refetchVerificationStatus();
      setVerifyError(null);
      resetVerify();
    }
  }, [verifySuccess, refetchVerificationStatus, resetVerify]);

  // Handle verification error
  useEffect(() => {
    if (verifyWriteError) {
      setVerifyError(formatContractError(verifyWriteError));
    }
  }, [verifyWriteError]);

  const loadProfile = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/users/profile/${address}`);
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load profile", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate random string for OAuth state
  const generateRandomString = (length: number) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSelfVerify = async () => {
    if (!address) return;

    // Check if wrong network
    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: celo.id });
      } catch (error) {
        console.error("Failed to switch network", error);
        return;
      }
    }

    setVerifyError(null);
    resetVerify();

    try {
      writeContract({
        address: CREATOR_EVENT_MANAGER_ADDRESS,
        abi: CREATOR_EVENT_MANAGER_ABI,
        functionName: "selfVerify",
        args: [],
      });
    } catch (error) {
      console.error("Self-verify error", error);
      setVerifyError("Failed to initiate verification");
    }
  };

  const handleLinkTwitter = async () => {
    if (!address) return;

    setLinking(true);

    // Check if using Brave browser
    const isBrave = (navigator as any).brave !== undefined;
    if (isBrave) {
      const proceed = confirm(
        "🛡️ Brave Browser Detected!\n\n" +
          "Brave's privacy settings may block Twitter login.\n\n" +
          "If you see a login screen even though you're logged into Twitter:\n" +
          "1. Just log in once in the popup, OR\n" +
          "2. Click the Brave Shields icon and allow cookies for twitter.com\n\n" +
          "Continue?",
      );
      if (!proceed) {
        setLinking(false);
        return;
      }
    }

    // Store wallet address in localStorage for callback (popup needs access)
    localStorage.setItem("twitter_auth_address", address);

    // Generate state for security
    const state = generateRandomString(32);
    localStorage.setItem("twitter_auth_state", state);

    // Generate PKCE code verifier using XDK
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem("twitter_code_verifier", codeVerifier);

    // Generate PKCE code challenge using XDK
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Use environment variable if set, otherwise use current domain
    // This allows it to work on Netlify, Vercel, or localhost automatically
    const redirectUri =
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI ||
      `${window.location.origin}/profile/twitter/callback`;

    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;

    if (!clientId) {
      alert("Twitter Client ID not configured");
      setLinking(false);
      return;
    }

    // Use XDK OAuth2 class to generate the authorization URL
    const oauth2 = new OAuth2({
      clientId,
      redirectUri,
      scope: ["tweet.read", "users.read", "offline.access"],
    });

    // Set PKCE parameters for the authorization URL
    oauth2.setPkceParameters(codeVerifier, codeChallenge);
    const authUrl = await oauth2.getAuthorizationUrl(state);

    // DEBUG: log the full auth URL — check redirect_uri and client_id are correct
    console.log("🐦 Twitter OAuth Flow Starting:");
    console.log("   Auth URL:", authUrl);
    console.log("   Client ID:", clientId);
    console.log("   Redirect URI:", redirectUri);
    console.log("   State:", state);
    console.log("   Code Verifier:", codeVerifier.slice(0, 10) + "...");
    console.log("   Code Challenge:", codeChallenge.slice(0, 10) + "...");
    console.log("   Stored in localStorage:", {
      state: localStorage.getItem("twitter_auth_state"),
      address: localStorage.getItem("twitter_auth_address"),
      codeVerifier:
        localStorage.getItem("twitter_code_verifier")?.slice(0, 10) + "...",
    });

    // Mobile browsers (especially iOS Safari) only hand off to the native
    // X/Twitter app — where the user is already logged in — on a top-level
    // page navigation, not a window.open() popup. Popups on iOS just load
    // the Twitter website, often logged out. Redirect the whole page instead;
    // the callback page already supports this (falls back to router.push when
    // there's no window.opener) and Twitter will bounce back to redirectUri.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = authUrl;
      return;
    }

    // Open Twitter auth in popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      "Twitter Authorization",
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0`,
    );

    if (!popup) {
      alert("Please allow popups for this site to link Twitter");
      setLinking(false);
      return;
    }

    // Listen for message from popup when auth completes
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from our domains (Netlify, Vercel, localhost)
      const isAllowedOrigin =
        event.origin === window.location.origin ||
        event.origin.includes("netlify.app") ||
        event.origin.includes("vercel.app") ||
        event.origin.includes("localhost");

      if (!isAllowedOrigin) {
        console.warn("Message from unauthorized origin:", event.origin);
        return;
      }

      if (event.data.type === "TWITTER_AUTH_SUCCESS") {
        window.removeEventListener("message", handleMessage);
        setLinking(false);
        // Small delay to avoid race condition where profile may not yet be committed in DB
        setTimeout(() => loadProfile(), 500);
      } else if (event.data.type === "TWITTER_AUTH_ERROR") {
        window.removeEventListener("message", handleMessage);
        setLinking(false);
        alert(event.data.message || "Twitter linking failed");
      }
    };

    window.addEventListener("message", handleMessage);

    // Check if popup was closed without completing auth
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener("message", handleMessage);
        setLinking(false);
      }
    }, 500);
  };

  const handleUnlinkTwitter = async () => {
    if (!address || !confirm("Unlink Twitter from your wallet?")) return;

    try {
      setLinking(true);
      const response = await fetch("/api/users/twitter/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        await loadProfile();
        alert("Twitter unlinked successfully!");
      } else {
        alert("Failed to unlink Twitter");
      }
    } catch (error) {
      console.error("Unlink error", error);
      alert("Failed to unlink Twitter");
    } finally {
      setLinking(false);
    }
  };

  // Don't render wallet-dependent UI until clientside hydration is complete.
  // Without this, wagmi's isConnected is always false on the first render
  // (SSR), causing the profile page to permanently show "Connect Wallet".
  if (!mounted) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex items-center justify-center min-h-[70vh]">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-gray-800/50 backdrop-blur-xl p-10 rounded-3xl border border-gray-700 text-center max-w-lg">
            <h1 className="text-3xl font-bold text-white mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-gray-400 mb-8">
              Connect to view your profile and link Twitter
            </p>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isConnecting ? "Waiting for wallet…" : "Connect Wallet"}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
        </main>
        <Footer />
      </div>
    );
  }

  const hasTwitter = !!profile?.twitterHandle;

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-3xl">
        {/* Profile Header */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 p-1 shrink-0">
              <div className="w-full h-full rounded-xl bg-gray-900 overflow-hidden">
                {profile?.twitterAvatar ? (
                  <img
                    src={profile.twitterAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg border border-gray-600 text-gray-300 text-sm font-mono mb-4 w-fit">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </div>

              {hasTwitter && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Twitter className="w-5 h-5" />
                  <span className="font-semibold">
                    @{profile.twitterHandle}
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Twitter Verification Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Twitter className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">
              Twitter Verification
            </h2>
          </div>

          {hasTwitter ? (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-bold text-white">
                    Twitter Linked
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Your wallet is linked to Twitter{" "}
                  <span className="text-blue-400 font-semibold">
                    @{profile.twitterHandle}
                  </span>
                </p>
                <p className="text-gray-500 text-xs">
                  When you win predictions, your Twitter handle will be
                  displayed to creators and other participants.
                </p>
              </div>

              <button
                onClick={handleUnlinkTwitter}
                disabled={linking}
                className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold rounded-xl transition disabled:opacity-50"
              >
                {linking ? "Unlinking..." : "Unlink Twitter"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-bold text-white">Not Linked</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Link your Twitter account to make your wins more credible.
                  Creators can see your Twitter handle when you win.
                </p>
                <ul className="text-gray-500 text-xs space-y-1">
                  <li>✓ Show your Twitter handle when you win</li>
                  <li>✓ Build trust with creators</li>
                  <li>✓ Verify you're a real person</li>
                  <li>✓ One-time setup</li>
                </ul>
              </div>

              <button
                onClick={handleLinkTwitter}
                disabled={linking}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Twitter className="w-5 h-5" />
                {linking ? "Linking..." : "Link Twitter Account"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Secure OAuth authentication via Twitter
              </p>
            </div>
          )}
        </div>

        {/* Blockchain Verification Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">
              Blockchain Verification
            </h2>
          </div>

          {isBlockchainVerified ? (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-purple-500" />
                <h3 className="text-lg font-bold text-white">
                  Verified On-Chain ✅
                </h3>
              </div>
              <p className="text-gray-400 text-sm">
                Your wallet is verified on the Celo blockchain. You can now join
                prediction events and submit predictions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-bold text-white">
                    Not Verified On-Chain
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {hasTwitter
                    ? "Complete verification by signing a transaction to register your wallet on the blockchain."
                    : "Link your Twitter account first, then verify your wallet on-chain."}
                </p>
                <ul className="text-gray-500 text-xs space-y-1">
                  <li>✓ Required to join prediction events</li>
                  <li>✓ One-time blockchain transaction (~$0.01 gas)</li>
                  <li>✓ Proves wallet ownership cryptographically</li>
                  <li>✓ Permanent verification</li>
                </ul>
              </div>

              {verifyError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{verifyError}</p>
                </div>
              )}

              {isWrongNetwork && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <p className="text-orange-400 text-sm">
                    ⚠️ Please switch to Celo Mainnet to verify your wallet
                  </p>
                </div>
              )}

              <button
                onClick={handleSelfVerify}
                disabled={verifyBusy || !hasTwitter || isWrongNetwork}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Shield className="w-5 h-5" />
                {verifyBusy
                  ? isVerifying
                    ? "Waiting for signature..."
                    : "Verifying on blockchain..."
                  : "Verify Wallet on Blockchain"}
              </button>

              {!hasTwitter && (
                <p className="text-gray-500 text-xs text-center">
                  💡 Link your Twitter account first to enable blockchain
                  verification
                </p>
              )}

              {hasTwitter && (
                <p className="text-gray-500 text-xs text-center">
                  This will sign a transaction (~$0.01) to verify your wallet
                  on-chain
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <span className="text-blue-400">ℹ️</span> Why Link Twitter?
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            When you win predictions, creators will see your Twitter handle
            instead of just your wallet address. This helps them verify you're a
            real person and builds trust in the community. Your Twitter profile
            is only visible when you win matches.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
