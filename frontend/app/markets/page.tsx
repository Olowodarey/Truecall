import Header from "../../components/Header";
import Footer from "../../components/Footer";
import MarketsSection from "../../components/MarketsSection";
import UnifiedBackground from "../../components/UnifiedBackground";

export default function MarketsPage() {
  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900">
      <div className="absolute inset-0 opacity-40 z-0">
        <UnifiedBackground variant="minimal" showParticles={true} particleCount={150} />
