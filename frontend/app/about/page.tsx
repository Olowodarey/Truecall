"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-40">
          <UnifiedBackground
            variant="minimal"
            showParticles={true}
            particleCount={150}
            opacity={1}
            className="bg-transparent"
          />
        </div>
      </div>

      <Header />

      <main className="relative z-10 pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4">
              About{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                TrueCall
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              The future of football predictions powered by blockchain
              technology
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-12">
            {/* What is TrueCall */}
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">⚽️</span>
                <h2 className="text-3xl font-bold text-white">
                  What is TrueCall?
                </h2>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed">
                TrueCall is a blockchain-powered football prediction platform
                where your forecasting skills are verifiable, transparent, and
                rewarded. Unlike traditional social media predictions that get
                lost in comment sections, every prediction on TrueCall is
                recorded on-chain, creating an immutable record of your
                forecasting accuracy.
              </p>
            </section>

            {/* The Problem */}
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">❌</span>
                <h2 className="text-3xl font-bold text-white">
                  The Problem We're Solving
                </h2>
              </div>
              <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
                <p>
                  Traditional football predictions face several major problems:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong className="text-white">Lost in Comments:</strong>{" "}
                    Predictions disappear in social media comment sections
                  </li>
                  <li>
                    <strong className="text-white">No Accountability:</strong>{" "}
                    Users can edit or delete wrong predictions
                  </li>
                  <li>
                    <strong className="text-white">No Proof:</strong> No way to
                    verify your historical accuracy
                  </li>
                  <li>
                    <strong className="text-white">No Rewards:</strong> Your
                    expertise goes unrecognized and unrewarded
                  </li>
                  <li>
                    <strong className="text-white">Trust Issues:</strong>{" "}
                    Platforms can manipulate or hide data
                  </li>
                </ul>
              </div>
            </section>

            {/* How It Works */}
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🎯</span>
                <h2 className="text-3xl font-bold text-white">How It Works</h2>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-lg">
                    1
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">
                      Join an Event
                    </h3>
                    <p className="text-gray-300">
                      Browse creator events and join with an invite code. It's
                      completely free to participate.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-lg">
                    2
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">
                      Make Predictions
                    </h3>
                    <p className="text-gray-300">
                      Submit your score predictions before each match kicks off.
                      All predictions are recorded on the Celo blockchain.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-lg">
                    3
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">
                      Build Your Reputation
                    </h3>
                    <p className="text-gray-300">
                      Every correct prediction is verified on-chain. Your
                      accuracy is transparent and permanent.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-lg">
                    4
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">
                      Share Your Results
                    </h3>
                    <p className="text-gray-300">
                      Share your predictions on social media with proof. Win
                      recognition for your forecasting skills.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Why Blockchain */}
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🔗</span>
                <h2 className="text-3xl font-bold text-white">
                  Why Blockchain?
                </h2>
              </div>
              <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
                <p>
                  Blockchain technology provides the foundation of trust and
                  transparency that traditional platforms can't offer:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Immutability
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Once recorded, predictions cannot be edited or deleted by
                      anyone
                    </p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Transparency
                    </h3>
                    <p className="text-gray-400 text-sm">
                      All predictions and results are publicly verifiable
                      on-chain
                    </p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Decentralization
                    </h3>
                    <p className="text-gray-400 text-sm">
                      No single entity controls the data or can manipulate
                      results
                    </p>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700/30 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Ownership
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Your reputation and history belong to you, not a platform
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Creator Events */}
            <section className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🎪</span>
                <h2 className="text-3xl font-bold text-white">
                  Creator Events
                </h2>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Anyone can create prediction events! Whether you're a content
                creator, football analyst, or just want to compete with friends,
                you can launch your own event with custom matches and invite
                codes.
              </p>
              <button
                onClick={() => router.push("/creator-events/create")}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3 px-8 rounded-lg transition-all"
              >
                Create Your Event →
              </button>
            </section>

            {/* CTA Section */}
            <section className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Start?
              </h2>
              <p className="text-gray-300 text-lg mb-6">
                Join the future of football predictions today
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push("/creator-events")}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Browse Events
                </button>
                <button
                  onClick={() => router.push("/creator-events/create")}
                  className="border border-gray-600 hover:border-orange-500 hover:text-orange-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Create Event
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
