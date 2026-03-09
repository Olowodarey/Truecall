'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import UnifiedBackground from '../../components/UnifiedBackground';

// SVG Icons
const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);

const GamepadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
);

const CoinsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>
);

const TOURNAMENTS = [
  {
    id: 1,
    title: "Global Alpha Championship",
    game: "Neon Strikers",
    prizePool: "50,000 STX",
    entryFee: "100 STX",
    participants: "128/256",
    status: "Active",
    date: "Mar 10 - Mar 15, 2026",
    color: "from-purple-500 to-indigo-600",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    title: "Web3 Fighters Open",
    game: "Block Brawlers",
    prizePool: "25,000 STX",
    entryFee: "Free Entry",
    participants: "512/1024",
    status: "Active",
    date: "Mar 12 - Mar 20, 2026",
    color: "from-emerald-500 to-teal-600",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    title: "DeFi Racing League",
    game: "Crypto Racers",
    prizePool: "10,000 STX",
    entryFee: "50 STX",
    participants: "45/100",
    status: "Active",
    date: "Mar 11 - Mar 14, 2026",
    color: "from-orange-500 to-red-600",
    image: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 4,
    title: "Metaverse Cup 2026",
    game: "Cyber Legends",
    prizePool: "100,000 STX",
    entryFee: "500 STX",
    participants: "16/32",
    status: "Active",
    date: "Mar 09 - Mar 30, 2026",
    color: "from-blue-500 to-cyan-600",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 5,
    title: "Galactic Showdown",
    game: "Space Miners",
    prizePool: "5,000 STX",
    entryFee: "10 STX",
    participants: "89/128",
    status: "Active",
    date: "Mar 13 - Mar 18, 2026",
    color: "from-pink-500 to-rose-600",
    image: "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 6,
    title: "Yield Farmers Battle",
    game: "DeFi Tactics",
    prizePool: "15,000 STX",
    entryFee: "25 STX",
    participants: "0/64",
    status: "Upcoming",
    date: "Mar 20 - Mar 25, 2026",
    color: "from-amber-500 to-orange-600",
    image: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 7,
    title: "NFT Creators Clash",
    game: "Pixel Warriors",
    prizePool: "20,000 STX",
    entryFee: "100 STX",
    participants: "0/256",
    status: "Upcoming",
    date: "Apr 01 - Apr 15, 2026",
    color: "from-fuchsia-500 to-purple-600",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 8,
    title: "Zero Knowledge Rumble",
    game: "ZK Chess",
    prizePool: "8,000 STX",
    entryFee: "Free Entry",
    participants: "0/512",
    status: "Upcoming",
    date: "Mar 25 - Mar 30, 2026",
    color: "from-slate-500 to-gray-600",
    image: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 9,
    title: "Diamond Hands Arena",
    game: "HODL Survivor",
    prizePool: "30,000 STX",
    entryFee: "200 STX",
    participants: "0/100",
    status: "Upcoming",
    date: "Apr 10 - Apr 20, 2026",
    color: "from-cyan-500 to-blue-600",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 10,
    title: "Genesis Open",
    game: "Block Brawlers",
    prizePool: "50,000 STX",
    entryFee: "Free Entry",
    participants: "0/1024",
    status: "Upcoming",
    date: "May 01 - May 05, 2026",
    color: "from-green-500 to-emerald-600",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800"
  }
];

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Upcoming'>('All');

  const filteredTournaments = TOURNAMENTS.filter(t => {
    if (activeTab === 'All') return true;
    return t.status === activeTab;
  });

  return (
    <div className="relative min-h-screen bg-black">
      {/* Page Background */}
      <UnifiedBackground 
        variant="section"
        showParticles={true}
        showNetworkLines={true}
        particleCount={200}
        opacity={0.4}
        className="fixed inset-0 -z-10"
      />
      
      <Header />
      
      <main className="relative z-10 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Tournaments
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Join competitive blockchain gaming tournaments with provably fair outcomes
              and transparent prize distribution.
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex justify-center mb-10">
            <div className="bg-gray-900/50 backdrop-blur-md p-1.5 rounded-full border border-gray-800 inline-flex">
              {(['All', 'Active', 'Upcoming'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tournaments Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <div 
                key={tournament.id} 
                className="group relative bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Card Header with Image */}
                <div className="h-48 relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-r ${tournament.color} opacity-40 mix-blend-overlay z-10`} />
                  <img 
                    src={tournament.image} 
                    alt={tournament.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4 z-20 flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${
                      tournament.status === 'Active' 
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                    }`}>
                      {tournament.status}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 z-20">
                    <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                      <GamepadIcon className="w-4 h-4 text-gray-300" />
                      <span className="text-sm font-medium text-gray-200">{tournament.game}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-colors">
                    {tournament.title}
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-400">
                        <TrophyIcon className="w-4 h-4 mr-2" />
                        <span>Prize Pool</span>
                      </div>
                      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
                        {tournament.prizePool}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-400">
                        <CoinsIcon className="w-4 h-4 mr-2" />
                        <span>Entry Fee</span>
                      </div>
                      <span className="font-semibold text-white">
                        {tournament.entryFee}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-400">
                        <UsersIcon className="w-4 h-4 mr-2" />
                        <span>Participants</span>
                      </div>
                      <span className="text-gray-300 font-medium">
                        {tournament.participants}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-400">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span>Date</span>
                      </div>
                      <span className="text-gray-300 font-medium">
                        {tournament.date}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-gray-800 to-gray-700 hover:from-blue-600 hover:to-purple-600 border border-gray-700 hover:border-transparent transition-all duration-300 transform active:scale-95">
                    {tournament.status === 'Active' ? 'Join Now' : 'Register Pre-sale'}
                  </button>
                </div>
                
                {/* Subtle bottom border highlight */}
                <div className={`h-1 w-full bg-gradient-to-r ${tournament.color}`} />
              </div>
            ))}
          </div>
          
          {filteredTournaments.length === 0 && (
            <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
              <GamepadIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Tournaments Found</h3>
              <p className="text-gray-400">There are currently no tournaments in this category.</p>
            </div>
          )}

        </div>
      </main>
      
      <Footer />
    </div>
  );
}// Update 1 for Tournaments Page
// Update 2 for Tournaments Page
// Update 3 for Tournaments Page
// Update 4 for Tournaments Page
// Update 5 for Tournaments Page
// Update 6 for Tournaments Page
// Update 7 for Tournaments Page
// Update 8 for Tournaments Page
// Update 9 for Tournaments Page
