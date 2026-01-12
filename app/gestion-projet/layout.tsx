'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

export default function GestionProjetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { colors } = useTheme();

  const tabs = [
    { href: '/gestion-projet', label: 'Aperçu' },
    { href: '/gestion-projet/reservations', label: 'Réservations' },
    { href: '/gestion-projet/disponibilites', label: 'Disponibilités' },
    { href: '/gestion-projet/jalons', label: 'Jalons' },
    { href: '/gestion-projet/dashboard', label: 'Dashboard' },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? colors.accent : colors.sidebarHover,
                    color: active ? '#ffffff' : colors.text,
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </AppLayout>
  );
}
