"use client";

import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: "🎯",
    title: "Create Your Event",
    description:
      "Pay a small CELO creation fee, set an invite code, and add up to 5 matches. Your event is live on-chain instantly — no approval needed.",
  },
  {
    number: "02",
    icon: "🔗",
    title: "Share the Code",
    description:
      "Send your invite code to anyone you want. Joining is completely free — only you as the creator pay. No entry fees for participants.",
  },
  {
    number: "03",
    icon: "⚽",
    title: "Everyone Predicts",
    description:
      "Joined users predict the exact score for each match before kickoff. Every prediction is locked on-chain with a timestamp — immutable proof.",
  },
  {
    number: "04",
    icon: "🏆",
    title: "Winners On-Chain",
    description:
      "Our AI Oracle submits the real score. The contract instantly finds everyone who predicted correctly and records them with their timestamps. No cheating possible.",
  },
];

const highlights = [
  { icon: "🆓", label: "Free to join" },
  { icon: "🔑", label: "Invite-code access" },
  { icon: "⛓️", label: "Winners on-chain" },
  { icon: "⏱️", label: "Timestamp proof" },
  { icon: "🤖", label: "AI Oracle verified" },
  { icon: "🛡️", label: "Anti-cheat built-in" },
];

export default function CreatorEventsSection() {
  return (
    <section className="relative py-24 border-t border-gray-800/60">
      {/* Subtle orange glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-orange-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Badge + headline */}
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 mb-5 uppercase tracking-widest">
            New — Creator Events
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            Host Your Own
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
              Prediction Event
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Creator Events put you in charge. Create an event, pick the matches,
            share your invite code — and let your community predict for free.
            Every winner is verified on-chain by our AI Oracle with an immutable
            timestamp. No way to fake it, no way to cheat.
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

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 hover:border-orange-500/40 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full">
                  {step.number}
                </span>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2 group-hover:text-orange-300 transition-colors">
                {step.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Anti-cheat callout */}
        <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-500/20 rounded-2xl p-8 mb-12 text-center max-w-3xl mx-auto">
          <p className="text-gray-200 text-lg leading-relaxed">
            Every prediction is stored on-chain the moment it's submitted — with
            a block timestamp that can never be changed. When the AI Oracle
            posts the real score, the contract picks winners from that immutable
            list. The creator sees who predicted correctly and when. No late
            entries. No manipulation. Just proof.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/creator-events/create"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 px-10 rounded-lg transition text-lg"
          >
            Create an Event →
          </Link>
          <Link
            href="/creator-events"
            className="inline-flex items-center justify-center gap-2 border border-gray-600 hover:border-orange-500/60 text-gray-300 hover:text-white font-semibold py-3.5 px-10 rounded-lg transition text-lg"
          >
            Browse Creator Events
          </Link>
        </div>
      </div>
    </section>
  );
}
