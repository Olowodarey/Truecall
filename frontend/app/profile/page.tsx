"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";
import { Twitter, CheckCircle, XCircle } from "lucide-react";

interface UserProfile {
  address: string;
  twitterHandle?: string;
  twitterId?: string;
  twitterAvatar?: string;
  verifiedAt?: number;
}

export default function ProfilePage() {
  const { isConnected, address, connectWallet } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const loadProfile = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3001/users/profile/${address}`,
      );
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

  const handleLinkTwitter = () => {
    if (!address) return;

    setLinking(true);

    // Store wallet address in sessionStorage for callback
    sessionStorage.setItem("twitter_auth_address", address);

    // Generate state for security
    const state = generateRandomString(32);
    sessionStorage.setItem("twitter_auth_state", state);

    // Generate code verifier and challenge for PKCE
    const codeVerifier = generateRandomString(64);
    sessionStorage.setItem("twitter_code_verifier", codeVerifier);

    // Twitter OAuth URL
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      "http://127.0.0.1:3000/profile/twitter/callback",
    );

    const authUrl =
      `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=tweet.read%20users.read&` +
      `state=${state}&` +
      `code_challenge=${codeVerifier}&` +
      `code_challenge_method=plain`;

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
      // Security: verify origin
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "TWITTER_AUTH_SUCCESS") {
        window.removeEventListener("message", handleMessage);
        setLinking(false);
        loadProfile(); // Reload profile to show new Twitter data
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
      const response = await fetch(
        "http://localhost:3001/users/twitter/unlink",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        },
      );

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

              <button
                onClick={handleLinkTwitter}
                disabled={linking}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Twitter className="w-5 h-5" />
                {linking ? "Linking..." : "Link Twitter Account"}
              </button>

              <p className="text-gray-500 text-xs text-center">
                You'll be redirected to Twitter to authorize this app. We only
                access your public profile information.
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
