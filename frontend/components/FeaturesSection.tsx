"use client";

import { useRouter } from "next/navigation";

export default function FeaturesSection() {
  const router = useRouter();

  const features = [
    {
      icon: (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      title: "Twitter Verification Required",
      description:
        "Link your Twitter account to get verified on-chain. This prevents Sybil attacks and ensures every user is unique and authentic. No bots, no fake accounts.",
      highlight: "Anti-Sybil Protection",
    },
    {
      icon: (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      title: "On-Chain Verification Only",
      description:
        "No predictions without verification. Every account must be Twitter-verified and recorded on the Celo blockchain before participating. Your identity, your predictions, all transparent.",
      highlight: "Blockchain Security",
    },
    {
      icon: (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        </svg>
      ),
      title: "Creator Events Live Now",
      description:
        "Verified creators can host custom 5-match prediction events. Our AI oracle automatically submits results when matches complete. Winners are determined transparently on-chain.",
      highlight: "Currently Available",
    },
    {
      icon: (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      title: "Free for Predictors",
      description:
        "Joining events and submitting predictions costs nothing. Works seamlessly with any Celo wallet — no gas fees, no hidden costs to play.",
      highlight: "Always Free to Play",
    },
  ];

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Built for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Trust & Transparency
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Every feature designed to ensure fair play, prevent fraud, and
            reward authentic football knowledge
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-amber-500/50 rounded-2xl p-8 transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Highlight Badge */}
              <div className="absolute top-4 right-4">
                <span className="inline-block bg-amber-500/10 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/20">
                  {feature.highlight}
                </span>
              </div>

              {/* Icon */}
              <div className="text-amber-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-amber-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-6">
          <div className="inline-block bg-gray-900/70 backdrop-blur-sm border border-amber-500/30 rounded-2xl px-8 py-6">
            <p className="text-gray-300 text-lg mb-4">
              <span className="text-amber-400 font-bold">
                Creator Events Feature is Live!
              </span>
              <br />
              Start creating or join prediction events now
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/creator-events/create")}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Create Event
              </button>
              <button
                onClick={() => router.push("/creator-events")}
                className="border border-gray-600 hover:border-amber-500 hover:text-amber-400 text-white px-8 py-3 rounded-lg font-semibold transition-all"
              >
                Browse Events
              </button>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            More features coming soon: Global prediction pools, reputation
            scores, and exclusive tournaments
          </p>
        </div>
      </div>
    </section>
  );
}
