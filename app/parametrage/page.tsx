'use client';

import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

type MenuItem = {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  stats: string;
};

export default function ParametragePage() {
  const { colors } = useTheme();

  const items: MenuItem[] = [
    {
      href: '/parametrage/competence',
      icon: '🎯',
      title: 'Compétences',
      description: 'Gérez le référentiel de compétences requis pour les prestations.',
      color: colors.accent,
      stats: 'Catégories, niveaux, activation'
    },
    {
      href: '/parametrage/catalogue',
      icon: '📋',
      title: 'Catalogue de Prestations',
      description: 'Gérez le catalogue des prestations et associez les compétences requises.',
      color: colors.success,
      stats: 'Prestations & compétences'
    },
    {
      href: '/parametrage/packs',
      icon: '📦',
      title: 'Packs de Prestations',
      description: 'Créez des packs de prestations pré-configurés.',
      color: '#8b5cf6',
      stats: 'Offres groupées & tarifs'
    }
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
            Catalogues & Paramétrage
          </h1>
          <p style={{ color: colors.textSecondary }}>
            Accédez aux modules de paramétrage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <div
                className="rounded-xl p-6 transition-all duration-200 cursor-pointer h-full group"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${colors.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.cardHover;
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.card;
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  className="text-4xl mb-4 w-14 h-14 rounded-lg flex items-center justify-center transition-all"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  {item.icon}
                </div>

                <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                  {item.title}
                </h3>

                <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                  {item.description}
                </p>

                <div
                  className="text-xs px-3 py-1 rounded-full inline-block"
                  style={{
                    backgroundColor: `${item.color}15`,
                    color: item.color
                  }}
                >
                  {item.stats}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div
          className="mt-8 rounded-xl p-6"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
            📚 Guide d&apos;utilisation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                1. Compétences
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Créez, filtrez, activez/désactivez les compétences (codes uniques, catégories, niveaux).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                2. Prestations
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Définissez les prestations et les compétences requises (niveau, priorité, obligatoire).
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                3. Packs
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Regroupez des prestations en packs pour industrialiser vos offres.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
