import Link from 'next/link';


export default function Navbar() {
  return (
    <nav className="bg-[#2E3744] border-b border-[#FFFFFF26]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Accueil */}
          <Link 
            href="/" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Logo variant="dark" width={140} height={42} showTagline={false} />
          </Link>
          
          {/* Navigation */}
          <div className="flex items-center gap-6">
            <Link 
              href="/clients"
              className="text-[#FFFFFF] hover:text-[#2196F3] transition-colors font-medium flex items-center gap-2"
            >
              <span>👥</span>
              <span>Clients</span>
            </Link>
            <Link 
              href="/commandes/nouvelle"
              className="text-[#FFFFFF] hover:text-[#2196F3] transition-colors font-medium flex items-center gap-2"
            >
              <span>📝</span>
              <span>Commandes</span>
            </Link>
            <Link 
              href="/bannette"
              className="text-[#FFFFFF] hover:text-[#2196F3] transition-colors font-medium flex items-center gap-2"
            >
              <span>📋</span>
              <span>Bannette</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}