"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivateEventDetailPage() {
  const router = useRouter();
  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-lg mx-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl p-12">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Coming Soon</h1>
          <p className="text-gray-400 mb-6">
            Private events are coming to Celo soon.
          </p>
          <button
            onClick={() => router.push("/events")}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg"
          >
            ← Back to Events
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
