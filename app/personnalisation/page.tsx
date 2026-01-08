'use client';

import { useTheme, ThemeName } from '@/context/ThemeContext';
import AppLayout from '@/components/AppLayout';

export default function Personnalisation() {
  const { theme, themes, setTheme, colors } = useTheme();

  const themeDescriptions: Record<ThemeName, string> = {
    darkBlue: 'Thème sombre élégant avec accents orange vif',
    purple: 'Ambiance violette mystérieuse et moderne',
    light: 'Interface claire et lumineuse pour le jour',
    greenTeal: 'Vert tech moderne avec touches turquoise',
    deepPurple: 'Violet profond avec accents roses néon',
    vivid: 'Design moderne avec couleurs vives et contrastes forts',
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
          Personnalisation
        </h1>
        <p className="mb-8" style={{ color: colors.textSecondary }}>
          Personnalisez l'apparence de votre interface
        </p>

        {/* Section Thèmes */}
        <div 
          className="rounded-xl p-6 mb-8"
          style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
            Thème de couleur
          </h2>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            Choisissez le thème qui correspond à votre style de travail
          </p>

          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(themes) as ThemeName[]).map((themeName) => {
              const themeColors = themes[themeName];
              const isActive = theme === themeName;

              return (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className="relative p-6 rounded-xl transition-all duration-200 text-left"
                  style={{
                    backgroundColor: themeColors.card,
                    border: `2px solid ${isActive ? colors.accent : themeColors.border}`,
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {/* Badge actif */}
                  {isActive && (
                    <div 
                      className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Actif
                    </div>
                  )}

                  {/* Nom du thème */}
                  <div className="mb-4">
                    <h3 
                      className="text-lg font-bold mb-1"
                      style={{ color: themeColors.text }}
                    >
                      {themeColors.name}
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: themeColors.textSecondary }}
                    >
                      {themeDescriptions[themeName]}
                    </p>
                  </div>

                  {/* Palette de couleurs */}
                  <div className="flex gap-2">
                    <div 
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: themeColors.background }}
                      title="Background"
                    />
                    <div 
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: themeColors.sidebar }}
                      title="Sidebar"
                    />
                    <div 
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: themeColors.accent }}
                      title="Accent"
                    />
                    <div 
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: themeColors.success }}
                      title="Success"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Préférences (à venir) */}
        <div 
          className="rounded-xl p-6"
          style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
            Autres préférences
          </h2>
          <p style={{ color: colors.textSecondary }}>
            D'autres options de personnalisation seront bientôt disponibles :
          </p>
          <ul className="mt-4 space-y-2" style={{ color: colors.textSecondary }}>
            <li>• Taille de la police</li>
            <li>• Densité de l'affichage</li>
            <li>• Format de date</li>
            <li>• Langue de l'interface</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}