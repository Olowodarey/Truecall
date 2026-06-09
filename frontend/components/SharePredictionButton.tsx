"use client";

interface SharePredictionButtonProps {
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  creatorTwitter?: string | null;
  eventId: number;
  matchId: number;
  variant?: "primary" | "secondary";
  replyToTweetId?: string | null; // Optional tweet ID to reply to
}

export default function SharePredictionButton({
  eventName,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  creatorTwitter,
  eventId,
  matchId,
  variant = "secondary",
  replyToTweetId,
}: SharePredictionButtonProps) {
  const handleShare = () => {
    // Build the prediction text
    const predictionText = `⚽️ My prediction for ${homeTeam} vs ${awayTeam}:\n\n${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}\n\n`;

    // Add creator mention if available
    const creatorMention = creatorTwitter
      ? `🎯 Event by @${creatorTwitter}\n`
      : "";

    // Add hashtags and link
    const hashtags = `#TrueCall #FootballPrediction #${eventName.replace(/\s+/g, "")}`;
    const eventUrl = `https://truecall.vercel.app/creator-events/${eventId}`;

    const fullText = `${predictionText}${creatorMention}\n${hashtags}\n\n🔗 Join: ${eventUrl}`;

    // Build Twitter URL - if replyToTweetId is provided, this will be a reply
    let tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;

    // If creator provided a tweet ID, add it as a reply parameter
    if (replyToTweetId) {
      tweetUrl += `&in_reply_to=${replyToTweetId}`;
    }

    // Open Twitter in a new window
    window.open(tweetUrl, "_blank", "width=550,height=420");
  };

  const isPrimary = variant === "primary";

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition-all ${
        isPrimary
          ? "bg-blue-500 hover:bg-blue-600 text-white"
          : "border border-blue-500/50 hover:border-blue-500 text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10"
      }`}
      title={
        replyToTweetId
          ? "Share as reply to creator's tweet"
          : "Share on X (Twitter)"
      }
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span className="text-sm">
        {replyToTweetId ? "Reply on X" : "Share on X"}
      </span>
    </button>
  );
}
