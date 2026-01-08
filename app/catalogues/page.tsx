'use client';

import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

export default function Catalogues() {
  const { colors } = useTheme();

  const catalogues = [
    {
      href: '/parametrage/competence',
      icon: '🎯',
      title: 'Compétences',
      description: 'Gérez les compétences requises pour les prestations',
      color: colors.accent,
      stats: 'Domaines techniques, fonctionnels et gestion'
    },
    {
      href: '/parametrage/catalogue',
      icon: '📋',
      title: 'Catalogue de Prestations',
      description: 'Gérez le catalogue des prestations et leurs compétences',
      color: colors.success,
      stats: 'Logiciels, maintenance, formations...'
    },
    {
      href: '/parametrage/packs',
      icon: '📦',
      title: 'Packs de Prestations',
      description: 'Créez des packs de prestations pré-configurés',
      color: '#8b5cf6',
      stats: 'Offres groupées et tarifs préférentiels'
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
            Gérez vos catalogues de compétences, prestations et packs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogues.map((catalogue, index) => (
            <Link key={index} href={catalogue.href}>
              <div 
                className="rounded-xl p-6 transition-all duration-200 cursor-pointer h-full group"
                style={{ 
                  backgroundColor: colors.card,
                  border: `2px solid ${colors.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.cardHover;
                  e.currentTarget.style.borderColor = catalogue.color;
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
                  style={{ backgroundColor: `${catalogue.color}20` }}
                >
                  {catalogue.icon}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                  {catalogue.title}
                </h3>
                <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                  {catalogue.description}
                </p>
                <div 
                  className="text-xs px-3 py-1 rounded-full inline-block"
                  style={{ 
                    backgroundColor: `${catalogue.color}15`,
                    color: catalogue.color
                  }}
                >
                  {catalogue.stats}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Section d'aide */}
        <div 
          className="mt-8 rounded-xl p-6"
          style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
            📚 Guide d'utilisation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                1. Compétences
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Définissez les compétences nécessaires (techniques, fonctionnelles, gestion) avec leurs niveaux requis.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                2. Prestations
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Créez votre catalogue de prestations et associez les compétences requises pour chacune.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                3. Packs
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Assemblez plusieurs prestations en packs pour proposer des offres complètes à tarifs préférentiels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}