"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UnifiedBackground from "./UnifiedBackground";

const heroContent = [
  {
    id: 1,
    title: "What is TrueCall?",
    description:
      "TrueCall is a blockchain-powered football prediction platform where your forecasting skills are verifiable, transparent, and rewarded. No more lost predictions in comment sections.",
    bullets: [
      "Predict scores for real football matches",
      "Every prediction is recorded on-chain — permanent proof",
      "Built on Celo — a fast, low-cost mobile-first blockchain",
    ],
    icon: (
      <svg
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 2,
    title: "The Problem We're Solving",
    description:
      "Traditional predictions disappear in social media comments. There's no proof, no accountability, and no reward for accurate forecasts. Your expertise goes unrecognized.",
    bullets: [
      "\"I called it!\" claims with zero proof",
      "No way to track your prediction record over time",
      "Accurate fans never get rewarded for being right",
    ],
    icon: (
      <svg
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    id: 3,
    title: "How It Works",
    description:
      "Getting started takes minutes — no crypto experience needed. Open TrueCall in your wallet's browser and follow these steps:",
    bullets: [
      "1. Connect your wallet",
      "2. Verify your Twitter — quick, one-time, free",
      "3. Join an event with an invite code & predict 5 match scores",
      "4. Our AI oracle verifies real results automatically",
      "5. Exact-score winners are recorded on-chain, fully verifiable",
    ],
    icon: (
      <svg
        className="w-10 h-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    id: 4,
    title: "Free to Play, Always",
    description:
      "Joining and predicting costs nothing for players. TrueCall runs on Celo — a fast, low-fee blockchain, so everything feels instant and familiar.",
    bullets: [
      "No gas fees to join events or submit predictions",
      "Always free to play — event creators cover hosting costs",
      "Works with any Celo-compatible wallet — no extra setup",
    ],
    icon: (
      <svg
        className="w-10 h-10"
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
  },
  {
    id: 5,
    title: "Why Blockchain?",
    description:
      "Blockchain ensures transparency and immutability. Your predictions can't be edited or deleted. Results are verified automatically. Trust is built into the system, not reliant on platforms.",
    bullets: [
      "Predictions are locked on-chain the moment you submit",
      "An AI oracle settles results — no human can change the outcome",
      "Anyone can verify everything on Celo's public ledger",
    ],
    icon: (
      <svg
        className="w-10 h-10"
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
  },
];

export default function HeroSection() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);

  // Auto-advance to next tab every 10 seconds (slower so larger cards are readable)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTab((prev) => (prev + 1) % heroContent.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const nextTab = () => {
    setCurrentTab((prev) => (prev + 1) % heroContent.length);
  };

  const prevTab = () => {
    setCurrentTab(
      (prev) => (prev - 1 + heroContent.length) % heroContent.length,
    );
  };

  return (
    <section className="relative min-h-screen overflow-hidden flex items-center">
      {/* Particle Effects Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-60">
          <UnifiedBackground
            variant="minimal"
            showParticles={true}
            particleCount={300}
            opacity={1}
            className="bg-transparent"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                TrueCall
              </span>
            </h1>
            <p className="text-2xl lg:text-3xl text-gray-300 font-light">
              Where Football Predictions Meet Blockchain
            </p>
          </div>

          {/* Tab Navigation Dots */}
          <div className="flex justify-center gap-2">
            {heroContent.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTab(index)}
                className={`h-2 rounded-full transition-all ${
                  currentTab === index
                    ? "w-8 bg-orange-500"
                    : "w-2 bg-gray-600 hover:bg-gray-500"
                }`}
                aria-label={`Go to tab ${index + 1}`}
              />
            ))}
          </div>

          {/* Content Card */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 lg:p-12 min-h-[420px] lg:min-h-[440px] flex flex-col justify-between">
            <div className="space-y-6 text-left">
              <div className="flex items-center gap-4">
                <div className="text-amber-500 shrink-0">
                  {heroContent[currentTab].icon}
                </div>
                <h2 className="text-2xl lg:text-4xl font-bold text-white">
                  {heroContent[currentTab].title}
                </h2>
              </div>
              <p className="text-lg lg:text-xl text-gray-300 leading-relaxed">
                {heroContent[currentTab].description}
              </p>
              <ul className="space-y-3">
                {heroContent[currentTab].bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-base lg:text-lg text-gray-300"
                  >
                    <svg
                      className="w-5 h-5 text-amber-500 shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation Arrows */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={prevTab}
                className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="font-medium">Previous</span>
              </button>

              <span className="text-gray-500 font-medium">
                {currentTab + 1} / {heroContent.length}
              </span>

              <button
                onClick={nextTab}
                className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors"
              >
                <span className="font-medium">Next</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push("/creator-events")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors text-lg"
            >
              Start Predicting
            </button>
            <button
              onClick={() => router.push("/about")}
              className="border border-gray-600 hover:border-orange-500 hover:text-orange-500 text-white px-8 py-4 rounded-lg font-semibold transition-colors text-lg"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
