import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          
           <div>
             <Link href="/" className="text-white font-bold text-xl">
              TrueCall
            </Link>
           </div>
          <div>
              <div className="hidden md:flex items-center space-x-6">
              <Link href="/platform" className="text-gray-300 hover:text-white transition-colors">
                Platform
              </Link>
              <Link href="/tournaments" className="text-gray-300 hover:text-white transition-colors">
                Tournaments
              </Link>
              <Link href="/governance" className="text-gray-300 hover:text-white transition-colors">
                Governance
              </Link>
              <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
                Docs
              </Link>
            </div>
          </div>
        
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
            Connect Wallet
          </button>
        </nav>
      </div>
    </header>
  );
}