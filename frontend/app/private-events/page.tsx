"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function PrivateEventsPage() {
  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-lg mx-auto bg-gray-800/40 border border-gray-700/50 rounded-2xl p-12">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Private Events</h1>
          <p className="text-gray-400 mb-6">
            Private invite-only events are coming soon to Celo.
          </p>
          <Link
            href="/events"
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold rounded-lg"
          >
            Browse Public Events →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
