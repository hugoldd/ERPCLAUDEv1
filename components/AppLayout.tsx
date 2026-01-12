'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import Logo from './Logo';

interface AppLayoutProps {
  children: ReactNode;
  rightPanel?: ReactNode;
}

export default function AppLayout({ children, rightPanel }: AppLayoutProps) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const navigation = [
    { name: 'Accueil', href: '/', icon: '🏠' },
    { name: 'Clients', href: '/clients', icon: '👥' },
    { name: 'Commandes', href: '/commandes/nouvelle', icon: '📝' },
    { name: 'Bannette', href: '/bannette', icon: '📋' },
    // Ressources
    { name: 'Consultants', href: '/consultants', icon: '🧑‍💼' },
    { name: 'Équipes', href: '/equipes', icon: '👥' },

    // Module planning
    { name: 'Gestion projet', href: '/gestion-projet', icon: '📅' },

    { name: 'Catalogues', href: '/catalogues', icon: '📚' },
    { name: 'Personnalisation', href: '/personnalisation', icon: '🎨' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ backgroundColor: colors.sidebar, borderColor: colors.border }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Logo
            variant={colors.name === 'Light' ? 'light' : 'dark'}
            width={140}
            height={42}
            showTagline={false}
          />
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.accent }}>
            <span className="text-white font-bold">U</span>
          </div>
          <div className="hidden md:block">
            <div className="font-medium text-sm" style={{ color: colors.text }}>
              Utilisateur
            </div>
            <div className="text-xs" style={{ color: colors.textSecondary }}>
              Directeur de Projet
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex-shrink-0 overflow-y-auto border-r" style={{ backgroundColor: colors.sidebar, borderColor: colors.border }}>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: isActive(item.href) ? colors.accent : 'transparent',
                  color: isActive(item.href) ? '#ffffff' : colors.text,
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) e.currentTarget.style.backgroundColor = colors.sidebarHover;
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>

        {rightPanel && (
          <>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="fixed right-0 top-1/2 -translate-y-1/2 p-2 rounded-l-lg z-40"
              style={{ backgroundColor: colors.accent }}
            >
              <span className="text-white text-xl">{rightPanelOpen ? '→' : '←'}</span>
            </button>

            <aside
              className={`w-80 flex-shrink-0 overflow-y-auto border-l fixed right-0 top-0 bottom-0 transition-transform duration-300 z-30 ${
                rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="p-6">{rightPanel}</div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
