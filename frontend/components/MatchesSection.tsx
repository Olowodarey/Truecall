"use client";

import { useEffect, useState } from "react";
import { getAllEvents, getQuestionsForEvent } from "@/lib/stacks";
import type { ChainEvent, ChainQuestion } from "@/lib/types";

interface QuestionWithEvent {
  question: ChainQuestion;
  event: ChainEvent;
}

function SkeletonCard() {
  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/30 p-5 animate-pulse">
      <div className="flex justify-end mb-3">
        <div className="h-5 w-16 bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-700 rounded w-2/3 mt-4" />
    </div>
  );
}

function QuestionCard({ question, event }: QuestionWithEvent) {
  const targetUsd = question.targetPrice.toLocaleString();
  const isOpen = question.status === "open";
  const statusClasses = isOpen
    ? "bg-green-500/20 text-green-400 border-green-500/40"
    : "bg-gray-500/20 text-gray-400 border-gray-500/40";

  return (
    <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-orange-500/50 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-0.5">
      <div className="flex justify-between items-start mb-3">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusClasses}`}
        >
          {question.status.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 truncate max-w-[120px]">
          {event.title}
        </span>
      </div>

      <p className="text-sm font-bold text-white mb-1 group-hover:text-orange-300 transition-colors leading-tight">
        {question.question}
      </p>
      <p className="text-xs text-orange-400 font-semibold">
        Target: ${targetUsd}
      </p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50 text-xs text-gray-400">
        <span>Fee: {(event.entryFee / 1_000_000).toFixed(2)} STX</span>
        <span>Closes #{question.closeBlock}</span>
      </div>
    </div>
  );
}

export default function MatchesSection() {
  const [items, setItems] = useState<QuestionWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const events = await getAllEvents();
        const openEvents = events.filter((e) => e.isActive);
        // Fetch questions for each open event in parallel
        const nested = await Promise.allSettled(
          openEvents.map((ev) =>
            getQuestionsForEvent(ev.id).then((questions) =>
              questions.map((q) => ({ question: q, event: ev }))
            )
          )
        );
        if (!cancelled) {
          const flat = nested
            .filter(
              (r): r is PromiseFulfilledResult<QuestionWithEvent[]> =>
                r.status === "fulfilled"
            )
            .flatMap((r) => r.value)
            .filter((x) => x.question.status === "open")
            .slice(0, 12); // show max 12 cards
          setItems(flat);
        }
      } catch {
        if (!cancelled) setError("Could not load questions from blockchain.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative py-20 px-6">
      <div className="max-w-7xl mx-auto mb-12 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 mb-4">
          Live on Stacks Testnet
        </span>
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
          Open{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
            Questions
          </span>
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-lg">
          Pick a BTC price question, predict YES or NO, and win from the prize
          pool.
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-gray-400">
              No open questions on-chain yet. Admin can create one.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(({ question, event }) => (
              <QuestionCard key={question.id} question={question} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
