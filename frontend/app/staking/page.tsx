import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function StakingPage() {
  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Staking (Deprecated)</h1>
        <p className="text-gray-400">Staking features are currently removed from the V2 contract model.</p>
      </main>
      <Footer />
    </div>
  );
}
