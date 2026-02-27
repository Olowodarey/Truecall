import Header from "../../components/Header";
import Footer from "../../components/Footer";
import MarketsSection from "../../components/MarketsSection";
import UnifiedBackground from "../../components/UnifiedBackground";

export default function MarketsPage() {
  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
      <div className="absolute inset-0 opacity-40 z-0">
        <UnifiedBackground variant="minimal" showParticles={true} particleCount={150} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                Global <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-500">Markets</span>
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Predict the future prices of top cryptocurrencies, stocks, and commodities. Provably fair, fully on-chain.
              </p>
            </div>
