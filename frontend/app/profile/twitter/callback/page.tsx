"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

function TwitterCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Linking your Twitter account...");

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(
          error === "access_denied"
            ? "You cancelled the Twitter authorization."
            : `Twitter error: ${error}`,
        );
        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "TWITTER_AUTH_ERROR",
              message:
                error === "access_denied"
                  ? "Authorization cancelled"
                  : `Twitter error: ${error}`,
            },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Missing authorization code from Twitter.");
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "TWITTER_AUTH_ERROR",
              message: "Missing authorization code",
            },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
        return;
      }

      const storedState = sessionStorage.getItem("twitter_auth_state");
      const address = sessionStorage.getItem("twitter_auth_address");
      const codeVerifier = sessionStorage.getItem("twitter_code_verifier");

      if (state !== storedState) {
        setStatus("error");
        setMessage("Security validation failed. Please try again.");
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "TWITTER_AUTH_ERROR",
              message: "Security validation failed",
            },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
        return;
      }

      if (!address) {
        setStatus("error");
        setMessage("Wallet address not found. Please reconnect your wallet.");
        if (window.opener) {
          window.opener.postMessage(
            { type: "TWITTER_AUTH_ERROR", message: "Wallet address not found" },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
        return;
      }

      if (!codeVerifier) {
        setStatus("error");
        setMessage("Code verifier not found. Please try again.");
        if (window.opener) {
          window.opener.postMessage(
            { type: "TWITTER_AUTH_ERROR", message: "Code verifier not found" },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
        return;
      }

      setMessage("Verifying with Twitter...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users/twitter/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, code, codeVerifier }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setMessage(`Successfully linked @${data.profile.twitterHandle}!`);

        sessionStorage.removeItem("twitter_auth_state");
        sessionStorage.removeItem("twitter_auth_address");
        sessionStorage.removeItem("twitter_code_verifier");

        // Send success to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "TWITTER_AUTH_SUCCESS",
              profile: data.profile,
            },
            window.location.origin,
          );
          setTimeout(() => window.close(), 1500);
        } else {
          // Fallback: redirect if not opened as popup
          setTimeout(() => {
            router.push("/profile");
          }, 2000);
        }
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to link Twitter account.");
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "TWITTER_AUTH_ERROR",
              message: data.message || "Failed to link Twitter",
            },
            window.location.origin,
          );
          setTimeout(() => window.close(), 2000);
        }
      }
    } catch (error) {
      console.error("Twitter callback error:", error);
      setStatus("error");
      setMessage("An unexpected error occurred. Please try again.");
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "TWITTER_AUTH_ERROR",
            message: "An unexpected error occurred",
          },
          window.location.origin,
        );
        setTimeout(() => window.close(), 2000);
      }
    }
  };

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-gray-800/50 backdrop-blur-xl p-10 rounded-3xl border border-gray-700 text-center max-w-md">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-2">{message}</h1>
              <p className="text-gray-400 text-sm">Please wait...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-6xl mb-6">✅</div>
              <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
              <p className="text-gray-400 text-sm mb-4">{message}</p>
              <p className="text-gray-500 text-xs">
                {window.opener
                  ? "Closing window..."
                  : "Redirecting to your profile..."}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-6xl mb-6">❌</div>
              <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
              <p className="text-red-400 text-sm mb-6">{message}</p>
              {window.opener ? (
                <p className="text-gray-500 text-xs">
                  This window will close automatically...
                </p>
              ) : (
                <button
                  onClick={() => router.push("/profile")}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                >
                  Back to Profile
                </button>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function TwitterCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen">
          <UnifiedBackground />
          <Header />
          <main className="relative z-10 flex items-center justify-center min-h-[70vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500" />
          </main>
          <Footer />
        </div>
      }
    >
      <TwitterCallbackContent />
    </Suspense>
  );
}
