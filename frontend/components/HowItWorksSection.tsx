export default function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Join an Event",
      description:
        "Enter a public prediction event or private league. Each event features multiple football matches where you predict scores, outcomes, and more. Pay the entry fee once and compete for the entire event.",
    },
    {
      number: "02",
      title: "Make Your Predictions",
      description:
        "Predict exact match scores or outcomes (win/draw/loss). Every prediction is recorded on-chain with a timestamp. No changing your mind. No faking it after the match. Just pure forecasting skill.",
    },
    {
      number: "03",
      title: "AI-Verified Results",
      description:
        "Match results are verified by our AI Oracle Agent using real-time football data. Scores settle automatically on-chain. Your points update instantly. No manual disputes, no delays.",
    },
    {
      number: "04",
      title: "Win Prizes & Build Reputation",
      description:
        "Top-ranked predictors share the prize pool based on final leaderboard position. Earn points for correct predictions: 5 pts for exact scores, 3 pts for correct outcomes. Build an on-chain reputation as a skilled forecaster.",
    },
  ];

  return (
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-[200px]">
          {/* Left side - Title and illustration */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 mb-5 uppercase tracking-widest">
              Public Events
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
              How It{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-lg mx-auto lg:mx-0">
              Open to everyone — no invite needed. Join a public event, make
              your football predictions, and compete against the whole
              community. The best forecasters win the prize pool.
            </p>
          </div>

          {/* Right side - Steps with curved connecting line */}
          <div className="relative space-y-8">
            {/* Curved connecting line SVG */}
            <svg
              className="absolute left-8 top-8 opacity-30 pointer-events-none"
              width="2"
              height="calc(100% - 64px)"
              viewBox="0 0 2 400"
              fill="none"
              style={{ left: "32px", top: "32px" }}
            >
              <path
                d="M1 0 Q50 100 1 200 Q-50 300 1 400"
                stroke="url(#gradient)"
                strokeWidth="2"
                fill="none"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>

            {steps.map((step, index) => (
              <div
                key={index}
                className="relative flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-6 text-center lg:text-left"
              >
                {/* Step number circle */}
                <div className="relative z-10 flex-shrink-0 w-16 h-16 bg-gray-900 border-2 border-orange-400 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-orange-400">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pt-0 lg:pt-2">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
