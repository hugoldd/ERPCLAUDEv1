'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalClients: number;
  totalProjets: number;
  projetsEnCours: number;
  projetsBannette: number;
}

export default function Home() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalProjets: 0,
    projetsEnCours: 0,
    projetsBannette: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerStats();
  }, []);

  const chargerStats = async () => {
    try {
      const [clients, projets, enCours, bannette] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('projets').select('id', { count: 'exact', head: true }),
        supabase.from('projets').select('id', { count: 'exact', head: true }).eq('statut', 'en_cours'),
        supabase.from('projets').select('id', { count: 'exact', head: true }).eq('statut', 'bannette')
      ]);

      setStats({
        totalClients: clients.count || 0,
        totalProjets: projets.count || 0,
        projetsEnCours: enCours.count || 0,
        projetsBannette: bannette.count || 0
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Clients',
      value: stats.totalClients,
      icon: '👥',
      color: colors.accent,
      trendPositive: true
    },
    {
      title: 'Projets Total',
      value: stats.totalProjets,
      icon: '📊',
      color: colors.success,
      trendPositive: true
    },
    {
      title: 'En cours',
      value: stats.projetsEnCours,
      icon: '🚀',
      color: '#f59e0b',
      trendPositive: true
    },
    {
      title: 'En attente',
      value: stats.projetsBannette,
      icon: '⏳',
      color: colors.warning,
      trendPositive: false
    }
  ];

  const quickActions = [
    {
      href: '/clients',
      icon: '👥',
      title: 'Gestion des Clients',
      description: 'Créer et gérer les fiches clients',
      color: colors.accent
    },
    {
      href: '/commandes/nouvelle',
      icon: '📝',
      title: 'Nouvelle Commande',
      description: 'Créer une commande rapidement',
      color: colors.success
    },
    {
      href: '/bannette',
      icon: '📋',
      title: 'Bannette',
      description: 'Affecter les projets en attente',
      color: colors.warning
    },
    {
      href: '/projets',
      icon: '🎯',
      title: 'Mes Projets',
      description: 'Suivre vos projets',
      color: '#8b5cf6'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header avec titre */}
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
            Bienvenue sur Publiplan
          </h1>
          <p style={{ color: colors.textSecondary }}>
            Voici un aperçu de votre activité
          </p>
        </div>

        {/* Stats Cards - Grid responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="rounded-xl p-6 transition-all duration-200"
              style={{ 
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  {stat.icon}
                </div>
                <div 
                  className="text-sm font-semibold px-2 py-1 rounded"
                  style={{ 
                    color: stat.trendPositive ? colors.success : colors.danger,
                    backgroundColor: stat.trendPositive ? `${colors.success}20` : `${colors.danger}20`
                  }}
                >
                </div>
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: colors.text }}>
                {loading ? '...' : stat.value}
              </div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {stat.title}
              </div>
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <div 
                  className="rounded-xl p-6 transition-all duration-200 cursor-pointer h-full group"
                  style={{ 
                    backgroundColor: colors.card,
                    border: `2px solid ${colors.border}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.cardHover;
                    e.currentTarget.style.borderColor = action.color;
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
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                    {action.title}
                  </h3>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projets récents */}
          <div 
            className="rounded-xl p-6"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: colors.text }}>
                Projets récents
              </h3>
              <Link 
                href="/projets" 
                className="text-sm font-medium hover:underline"
                style={{ color: colors.accent }}
              >
                Voir tout →
              </Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p style={{ color: colors.textSecondary }}>Chargement...</p>
              ) : stats.totalProjets === 0 ? (
                <p style={{ color: colors.textSecondary }}>Aucun projet pour le moment</p>
              ) : (
                <p style={{ color: colors.textSecondary }}>
                  {stats.projetsEnCours} projet(s) en cours<br/>
                  {stats.projetsBannette} projet(s) en attente
                </p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div 
            className="rounded-xl p-6"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: colors.text }}>
                Notifications
              </h3>
              <Link 
                href="/notifications" 
                className="text-sm font-medium hover:underline"
                style={{ color: colors.accent }}
              >
                Voir tout →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div 
                  className="w-2 h-2 rounded-full mt-2"
                  style={{ backgroundColor: colors.success }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.text }}>
                    Système opérationnel
                  </p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Tous les services fonctionnent normalement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer version */}
        <div className="text-center pt-8">
          <div 
            className="inline-block rounded-lg px-6 py-3"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              <strong style={{ color: colors.text }}>Version v1.0</strong> - Axe 1 : Transformation commande et affectation projet
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}