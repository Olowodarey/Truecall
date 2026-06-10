"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

const FAQS = [
  {
    question: "Is TrueCall gambling?",
    answer:
      "No. TrueCall is a free-to-play, skill-based prediction game. There's no entry fee, no stake, and no betting — you predict football scores using your own knowledge and build a verifiable on-chain track record.",
  },
  {
    question: "Do I need crypto experience to use TrueCall?",
    answer:
      "Not at all. Just open TrueCall, connect your Celo wallet, and you're ready to go — no extra setup and no gas fees to worry about for joining or predicting.",
  },
  {
    question: "Is it free to join and make predictions?",
    answer:
      "Yes — completely free for players. Joining an event and submitting predictions costs nothing. Only event creators pay a small one-time fee to host an event.",
  },
  {
    question: "What is Celo, and why does TrueCall use it?",
    answer:
      "Celo is a fast, low-cost mobile-first blockchain. It lets TrueCall record predictions and results permanently while keeping transactions quick and affordable.",
  },
  {
    question: "Why do I need to verify my Twitter account?",
    answer:
      "Verification links one wallet to one real account, preventing bots and duplicate entries (anti-Sybil protection). This keeps leaderboards and winner lists fair for everyone. It's a quick, one-time step and only used for identity verification.",
  },
  {
    question: "How are match results decided?",
    answer:
      "An automated AI oracle checks the real-world match result and submits it on-chain once the match ends. No one can manually edit or override the outcome — everything is verifiable on Celo's public ledger.",
  },
  {
    question: "What do I get if my prediction is correct?",
    answer:
      "Exact-score predictions are recorded as verified winners on-chain, building your public prediction track record. Event creators set up and recognize winners for their own events.",
  },
  {
    question: "Is my wallet safe? Will TrueCall ever ask for my seed phrase?",
    answer:
      "TrueCall will never ask for your seed phrase or private key. You'll only ever be asked to approve transactions you choose to make, directly from your wallet.",
  },
  {
    question: "Can I create my own prediction event?",
    answer:
      "Yes! Anyone can create a 5-match prediction event with custom matches and an invite code. Creating an event involves a small one-time hosting fee, paid in CELO from the creator's wallet.",
  },
];

export default function FAQPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4">
              Frequently Asked{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                Questions
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to know before you start predicting
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="bg-gray-800/40 border border-gray-700/50 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                  >
                    <span className="text-white font-semibold text-lg">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-amber-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-gray-300 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Still have questions?
            </h2>
            <p className="text-gray-300 mb-6">
              Jump in and explore — or reach out to our community
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/creator-events")}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Browse Events
              </button>
              <a
                href="https://t.me/Truecall98"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-600 hover:border-orange-500 hover:text-orange-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Join our Telegram
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
