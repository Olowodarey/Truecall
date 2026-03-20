"use client";

import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: "🔐",
    title: "Create Your League",
    description:
      "Set your entry fee, number of rounds, and a secret invite code. Share the code with friends — only people with the code can join.",
  },
  {
    number: "02",
    icon: "🔄",
    title: "Take Turns Asking",
    description:
      "Each round, a different player in the group submits a Bitcoin prediction question with a target price. Everyone else answers YES or NO.",
  },
  {
    number: "03",
    icon: "📊",
    title: "Resolve & Score",
    description:
      "After the answer window closes, the creator resolves the round with the real BTC price. Correct predictions earn points on the leaderboard.",
  },
  {
    number: "04",
    icon: "💰",
    title: "Best Forecaster Wins",
    description:
      "When all rounds are done, the top scorers split the prize pool. Everything is settled on-chain — no middleman, no disputes.",
  },
];

const highlights = [
  { icon: "👥", label: "Up to 50 players" },
  { icon: "🔒", label: "Invite-only access" },
  { icon: "⛓️", label: "100% on-chain" },
  { icon: "🎯", label: "Up to 200 rounds" },
  { icon: "⚡", label: "STX entry fees" },
  { icon: "🏅", label: "Leaderboard payouts" },
];

export default function PrivateLeaguesSection() {
  return (
    <section className="relative py-24 border-t border-gray-800/60">
      {/* Subtle purple glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Badge + headline */}
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 mb-5 uppercase tracking-widest">
            Private Events
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            Run Your Own
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Bitcoin Prediction League
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            TrueCall Private Events let you create an invite only prediction
            league with your friends, colleagues, or community. You set the
            rules  entry fee, number of rounds, time windows  and the smart
            contract handles everything else. No trust required. No admin. Just
            Bitcoin calls and on-chain proof.
          </p>
        </div>

        {/* Quick highlights */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {highlights.map((h) => (
            <span
              key={h.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 border border-gray-700/50 text-gray-300 text-sm font-medium"
            >
              <span>{h.icon}</span>
              {h.label}
            </span>
          ))}
        </div>

        {/* How it works steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 hover:border-purple-500/40 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">
                  {step.number}
                </span>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-300 transition-colors">
                {step.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Narrative callout */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl p-8 mb-12 text-center max-w-3xl mx-auto">
          <p className="text-gray-200 text-lg leading-relaxed">
            Think of it like a private fantasy league  but instead of picking
            players, your group takes turns asking Bitcoin questions. Who called
            the top? Who predicted the dip? The leaderboard doesn't lie, and the
            prize pool goes to whoever had the sharpest eye.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/private-events/create"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 px-10 rounded-lg transition text-lg"
          >
            Create a Private League →
          </Link>
          <Link
            href="/private-events"
            className="inline-flex items-center justify-center gap-2 border border-gray-600 hover:border-purple-500/60 text-gray-300 hover:text-white font-semibold py-3.5 px-10 rounded-lg transition text-lg"
          >
            Browse Private Events
          </Link>
        </div>
      </div>
    </section>
  );
}
