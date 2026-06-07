"use client";

interface ShareEventButtonProps {
  eventId: number;
  eventName: string;
  inviteCode?: string; // Optional - may not be available in list view
  matchCount?: number;
  participantCount?: number;
  creatorTwitter?: string | null;
  variant?: "primary" | "secondary" | "icon";
  size?: "small" | "medium" | "large";
}

export default function ShareEventButton({
  eventId,
  eventName,
  inviteCode,
  matchCount,
  participantCount,
  creatorTwitter,
  variant = "primary",
  size = "medium",
}: ShareEventButtonProps) {
  const handleShare = () => {
    // Build the event announcement text with event name and clear search instruction
    let eventText = `🎯 ${eventName.toUpperCase()}\n\nJoin my football prediction event on TrueCall!\n\n`;

    // Add optional details if available
    if (inviteCode) {
      eventText += `🎫 Invite Code: ${inviteCode}\n`;
    }
    if (matchCount !== undefined) {
      eventText += `⚽️ ${matchCount} match${matchCount !== 1 ? "es" : ""}\n`;
    }
    if (participantCount !== undefined) {
      eventText += `👥 ${participantCount}/200 spots filled\n`;
    }

    eventText += `\n`;

    // Add search instruction with creator mention
    const searchInstruction = creatorTwitter
      ? `🔍 Search for "${eventName}" event created by @${creatorTwitter}\n`
      : `🔍 Search for "${eventName}" event on TrueCall\n`;

    // Add hashtags and link
    const hashtags = `#TrueCall #FootballPrediction #${eventName.replace(/\s+/g, "")}`;
    const eventUrl = `https://truecall.xyz/creator-events/${eventId}`;

    const codeHint = !inviteCode ? `\n💬 DM me for the invite code!` : "";

    const fullText = `${eventText}${searchInstruction}${hashtags}${codeHint}\n\n🔗 ${eventUrl}`;

    // Build Twitter URL
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;

    // Open Twitter in a new window
    window.open(tweetUrl, "_blank", "width=550,height=420");
  };

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isIcon = variant === "icon";

  // Size classes
  const sizeClasses = {
    small: "py-1.5 px-3 text-xs",
    medium: "py-2.5 px-5 text-sm",
    large: "py-3 px-6 text-base",
  };

  if (isIcon) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleShare();
        }}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-all"
        title="Share event on X (Twitter)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleShare();
      }}
      className={`flex items-center gap-2 font-semibold rounded-lg transition-all ${sizeClasses[size]} ${
        isPrimary
          ? "bg-blue-500 hover:bg-blue-600 text-white"
          : isSecondary
            ? "border border-blue-500/50 hover:border-blue-500 text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10"
            : ""
      }`}
      title="Share event on X (Twitter)"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>Share</span>
    </button>
  );
}
