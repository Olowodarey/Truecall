"use client";

export function SkeletonCard() {
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 animate-pulse">
      <div className="space-y-3">
        <div className="h-6 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
        <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 animate-pulse">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="h-8 bg-gray-700/50 rounded w-1/2"></div>
          <div className="h-6 bg-gray-700/50 rounded w-20"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded"></div>
              <div className="h-6 bg-gray-700/50 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonLeaderboard() {
  return (
    <div className="bg-gray-800/60 border border-orange-500/20 rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-700/50 rounded"></div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMatchCard() {
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-700/50 rounded w-1/2"></div>
          <div className="h-5 bg-gray-700/50 rounded w-16"></div>
        </div>
        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
      </div>
    </div>
  );
}
