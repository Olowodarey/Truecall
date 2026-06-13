"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import LeaderboardCard from "./LeaderboardCard";
import type { EventLeaderboard } from "@/lib/creator-api";

interface ShareLeaderboardButtonProps {
  data: EventLeaderboard;
  onToast?: (type: "success" | "error" | "info", message: string) => void;
}

export default function ShareLeaderboardButton({
  data,
  onToast,
}: ShareLeaderboardButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0a0a0f",
      });

      const fileName = `truecall-leaderboard-${data.eventId}.png`;
      const text = `🏆 Leaderboard for ${data.eventName} on TrueCall!\n\n#TrueCall #FootballPrediction\n\n🔗 https://truecall.vercel.app/creator-events/${data.eventId}`;

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], text });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.click();

        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          "_blank",
          "width=550,height=420",
        );
        onToast?.(
          "info",
          "Leaderboard image downloaded — attach it to your tweet!",
        );
      }
    } catch (err) {
      console.error("Failed to share leaderboard", err);
      onToast?.("error", "Failed to generate leaderboard image");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Off-screen render target captured as the shared image */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <LeaderboardCard ref={cardRef} data={data} />
      </div>

      <button
        onClick={handleShare}
        disabled={generating}
        className="flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition-all border border-amber-500/50 hover:border-amber-500 text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 disabled:opacity-50"
        title="Share leaderboard as an image"
      >
        <span className="text-base">🏆</span>
        <span className="text-sm">
          {generating ? "Generating…" : "Share Leaderboard"}
        </span>
      </button>
    </>
  );
}
