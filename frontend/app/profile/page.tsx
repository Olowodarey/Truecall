"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import { Twitter, CheckCircle, XCircle } from "lucide-react";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  OAuth2,
} from "@xdevplatform/xdk";

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
  // Mounted guard: wagmi reads as disconnected during SSR, so we must wait
  // for the client to hydrate before trusting isConnected
  const [mounted, setMounted] = useState(false);

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

  const handleManualLink = async () => {
    if (!address) return;
    const input = document.getElementById(
      "twitter-handle-input",
    ) as HTMLInputElement;
    const handle = input?.value?.trim().replace(/^@/, "");
    if (!handle) {
      alert("Please enter a Twitter handle");
      return;
    }
    try {
      setLinking(true);
      const response = await fetch("/api/users/twitter/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, twitterHandle: handle }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await loadProfile();
        alert(`Twitter @${handle} linked successfully!`);
        input.value = "";
      } else {
        alert(data.message || "Failed to link Twitter handle");
      }
    } catch (err) {
      console.error("Manual link error", err);
      alert("Failed to link Twitter handle");
    } finally {
      setLinking(false);
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

    const expectedOrigin = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI
      ? new URL(process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI).origin
      : window.location.origin;

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
      // Accept messages from both localhost and 127.0.0.1 variants
      // (origin may differ due to redirect URI config)
      const allowedOrigins = [
        window.location.origin,
        process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI
          ? new URL(process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI).origin
          : null,
      ].filter(Boolean);
      if (!allowedOrigins.includes(event.origin)) return;

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
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <h3 className="text-lg font-bold text-white">Verified</h3>
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
                  <h3 className="text-lg font-bold text-white">Not Verified</h3>
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

              {/* Manual Entry Option */}
              <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-5">
                <h4 className="text-white font-semibold mb-3 text-sm">
                  Quick Link (No OAuth)
                </h4>
                <p className="text-gray-400 text-xs mb-3">
                  Just enter your Twitter handle to link it to your wallet
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="username"
                      className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      id="twitter-handle-input"
                      disabled={linking}
                    />
                  </div>
                  <button
                    onClick={handleManualLink}
                    disabled={linking}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {linking ? "..." : "Link"}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Enter your Twitter handle (without @)
                </p>
              </div>

              {/* OAuth Option */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-gray-800/50 text-gray-500">
                    OR use OAuth
                  </span>
                </div>
              </div>

              <button
                onClick={handleLinkTwitter}
                disabled={linking}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Twitter className="w-5 h-5" />
                {linking ? "Linking..." : "Link with Twitter OAuth"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                OAuth redirects to Twitter for authorization (may have browser
                compatibility issues)
              </p>
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
