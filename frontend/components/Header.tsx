"use client";

import Link from "next/link";
import Image from "next/image";
import WalletButton from "./WalletButton";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                alt="TrueCall"
                width={420}
                height={440}
                className="h-10 w-auto"
              />
              <span className="text-white font-bold text-xl">Truecall</span>
            </Link>
          </div>
          <div>
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/creator-events"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Events
              </Link>
              <Link
                href="/creator-events/create"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Create Event
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <WalletButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
