"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Footer() {
  const router = useRouter();

  const footerSections = [
    {
      title: "PLATFORM",
      links: [
        { name: "Creator Events", href: "/creator-events" },
        { name: "About TrueCall", href: "/about" },
        { name: "How It Works", href: "/about" },
        { name: "FAQ", href: "/faq" },
      ],
    },
    {
      title: "LEGAL",
      links: [
        { name: "Terms of Service", href: "/terms" },
        { name: "Privacy Policy", href: "/privacy" },
      ],
    },
    {
      title: "COMMUNITY",
      links: [
        { name: "Twitter", href: "https://x.com/Truecall89" },
        { name: "Telegram", href: "https://t.me/Truecall98" },
        { name: "GitHub", href: "https://github.com/Olowodarey/Truecall" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-gray-800">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 space-y-4 text-center lg:text-left">
            <h3 className="text-white font-bold text-xl">TrueCall</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto lg:mx-0">
              Blockchain-powered football predictions. Transparent, verifiable,
              and rewarding.
            </p>

            {/* Create Event Button */}
            <button
              onClick={() => router.push("/creator-events/create")}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-6 rounded-lg transition-all text-sm"
            >
              + Create Event
            </button>

            {/* Social Links */}
            <div className="flex space-x-4 justify-center lg:justify-start pt-2">
              <a
                href="https://x.com/Truecall89"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://t.me/Truecall98"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M21.94 5.36c.26-1.07-.45-1.59-1.31-1.27L2.6 11.43c-1.05.42-1.04.99-.18 1.25l4.62 1.44 1.79 5.5c.21.58.36.81.74.81.39 0 .55-.18.76-.4l1.83-1.78 4.45 3.3c.82.45 1.41.22 1.62-.76l2.71-12.93zM8.36 13.39l9.9-6.24c.47-.28.9-.13.55.18l-8.43 7.6-.32 3.43-1.7-4.97z" />
                </svg>
              </a>
              <a
                href="https://github.com/Olowodarey/Truecall"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section, index) => (
            <div key={index} className="space-y-4">
              <h4 className="text-white font-semibold text-sm uppercase tracking-wide">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © 2024 TrueCall. All rights reserved. Built on Celo Blockchain.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/about")}
                className="text-gray-400 hover:text-orange-400 transition-colors text-sm font-medium"
              >
                About
              </button>
              <button
                onClick={() => router.push("/creator-events")}
                className="text-gray-400 hover:text-orange-400 transition-colors text-sm font-medium"
              >
                Events
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
