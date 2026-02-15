"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { fetchEvents } from "@/lib/api";
import { Event, EventStatus } from "@/lib/types";
import EventCard from "@/components/EventCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

export default function ProfilePage() {
  const { isConnected, userAddress } = useWallet();
  const [events, setEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    correctPredictions: 0,
    totalPredictions: 0,
  });

  useEffect(() => {
    if (isConnected && userAddress) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const allEvents = await fetchEvents();
      setEvents(allEvents);

      setJoinedEvents(allEvents.slice(0, 2));

      setStats({
        totalPoints: 120,
        correctPredictions: 12,
        totalPredictions: 15,
      });

    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative min-h-screen">
        <UnifiedBackground />
        <Header />
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-gray-800/50 backdrop-blur-xl p-10 rounded-3xl border border-gray-700 shadow-2xl text-center max-w-lg">
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
              <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Please connect your Stacks wallet to view your personalized profile, track your predictions, and claim your rewards.
            </p>
            <button 
              onClick={() => (window as any).StacksProvider?.authenticationRequest()}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-orange-500/25"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20">
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 p-1">
              <div className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/80 rounded-full border border-gray-700 text-gray-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            <StatCard label="Total Points" value={stats.totalPoints} icon="🏆" color="from-yellow-400 to-orange-500" />
            <StatCard label="Accuracy" value={`${Math.round((stats.correctPredictions / (stats.totalPredictions || 1)) * 100)}%`} icon="🎯" color="from-green-400 to-emerald-500" />
            <StatCard label="Predictions" value={stats.totalPredictions} icon="📈" color="from-blue-400 to-indigo-500" />
          </div>
        </div>

        <div className="space-y-12">
        <div className="space-y-12">
          {/* Rewards Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="p-2 bg-orange-500/10 rounded-lg text-orange-500">✨</span>
                Earned Rewards
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <RewardCard title="Early Predictor" description="Successfully predicted 5 events" status="Unlocked" icon="🏅" />
              <RewardCard title="Win Streak" description="3 correct predictions in a row" status="2/3 Progress" icon="🔥" isLocked />
              <RewardCard title="High Stakes" description="Participated in a tournament" status="Unlocked" icon="💎" />
              <RewardCard title="Oracle Master" description="Resolved 10 events manually" status="Locked" icon="🧙‍♂️" isLocked />
            </div>
          </section>

          {/* Joined Events Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="p-2 bg-blue-500/10 rounded-lg text-blue-500">📅</span>
                Joined Events
              </h2>
              <span className="text-gray-400 text-sm">{joinedEvents.length} events joined</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : joinedEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedEvents.map((event) => (
                  <EventCard key={event.id} event={event} onJoinEvent={() => {}} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-12 text-center">
                <p className="text-gray-500 text-lg mb-4">You haven't joined any events yet.</p>
                <a href="/events" className="text-orange-500 hover:text-orange-400 font-semibold transition-colors">
                  Explore events and start predicting &rarr;
                </a>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50 flex flex-col items-center text-center">
      <span className="text-2xl mb-1">{icon}</span>
      <span className={`text-2xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</span>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

function RewardCard({ title, description, status, icon, isLocked }: { title: string; description: string; status: string; icon: string; isLocked?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 ${isLocked ? 'bg-gray-800/20 border-gray-800 opacity-60' : 'bg-gray-800/50 border-gray-700 hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5'}`}>
      <div className="text-4xl mb-4 grayscale-[0.5]">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 leading-relaxed">{description}</p>
      <div className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block ${isLocked ? 'bg-gray-900/50 text-gray-600' : 'bg-orange-500/10 text-orange-500'}`}>
        {status}
      </div>
    </div>
  );
}
