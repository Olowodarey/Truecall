"use client";

import { useState } from "react";
import UnifiedBackground from "./UnifiedBackground";

const heroContent = [
  {
    id: 1,
    title: "What is TrueCall?",
    description:
      "TrueCall is a blockchain-powered football prediction platform where your forecasting skills are verifiable, transparent, and rewarded. No more lost predictions in comment sections.",
  },
  {
    id: 2,
    title: "The Problem We're Solving",
    description:
      "Traditional predictions disappear in social media comments. There's no proof, no accountability, and no reward for accurate forecasts. Your expertise goes unrecognized.",
  },
  {
    id: 3,
    title: "How It Works",
    description:
      "Make predictions on-chain. Every forecast is recorded, verifiable, and permanent. Earn points for accuracy, climb the leaderboard, and win from prize pools. Your reputation is built on proven results.",
  },
  {
    id: 4,
    title: "Why Blockchain?",
    description:
      "Blockchain ensures transparency and immutability. Your predictions can't be edited or deleted. Results are verified automatically. Trust is built into the system, not reliant on platforms.",
  },
];

export default function HeroSection() {
  const [currentTab, setCurrentTab] = useState(0);

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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
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
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 lg:p-12 min-h-[300px] flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                {heroContent[currentTab].title}
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed">
                {heroContent[currentTab].description}
              </p>
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
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors text-lg">
              Start Predicting
            </button>
            <button className="border border-gray-600 hover:border-orange-500 hover:text-orange-500 text-white px-8 py-4 rounded-lg font-semibold transition-colors text-lg">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
