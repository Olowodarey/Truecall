"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WalletButton from "./WalletButton";
import { UserRound, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/creator-events", label: "Events" },
  { href: "/creator-events/create", label: "Create Event" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <nav className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <Image
              src="/newlogo.png"
              alt="TrueCall"
              width={420}
              height={440}
              className="h-9 sm:h-10 w-auto"
            />
            <span className="text-white font-bold text-lg sm:text-xl">
              Truecall
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/profile"
              className="p-2 text-gray-300 hover:text-white transition-colors"
              title="Profile & Twitter Verification"
            >
              <UserRound className="w-5 h-5" />
            </Link>

            <WalletButton />

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="md:hidden mt-3 pb-2 border-t border-gray-800 pt-3 flex flex-col space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors px-3 py-2.5 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
