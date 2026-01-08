'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

interface ProjetBannette {
  id: string;
  numero_projet: string;
  titre: string;
  date_creation: string;
  budget_total: number;
  priorite: string;
  client: { nom: string };
  prestations: Array<{ type_prestation: string; libelle: string }>;
}

interface DP {
  id: string;
  nom: string;
  prenom: string;
}

export default function Bannette() {
  const { colors } = useTheme();
  const [projets, setProjets] = useState<ProjetBannette[]>([]);
  const [dps, setDps] = useState<DP[]>([]);
  const [loading, setLoading] = useState(true);
  const [affectationEnCours, setAffectationEnCours] = useState<string | null>(null);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);

    // Charger les projets en bannette
    const { data: projetsData, error: erreurProjets } = await supabase
      .from('projets')
      .select(`
        *,
        client:clients(nom),
        projet_prestations(
          prestation:prestations(type_prestation, libelle)
        )
      `)
      .eq('statut', 'bannette')
      .order('date_creation', { ascending: false });

    if (erreurProjets) {
      console.error('Erreur chargement projets:', erreurProjets);
    } else {
      const projetsFormattes = projetsData.map(p => ({
        ...p,
        prestations: p.projet_prestations.map((pp: any) => pp.prestation)
      }));
      setProjets(projetsFormattes);
    }

    // Charger les DPs disponibles
    const { data: dpsData, error: erreurDps } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom')
      .eq('role', 'dp')
      .eq('actif', true)
      .order('nom');

    if (erreurDps) {
      console.error('Erreur chargement DPs:', erreurDps);
    } else {
      setDps(dpsData || []);
    }

    setLoading(false);
  };

  const affecterProjet = async (projetId: string, dpId: string) => {
    setAffectationEnCours(projetId);

    try {
      // Mettre à jour le projet
      const { error: erreurMaj } = await supabase
        .from('projets')
        .update({
          dp_affecte_id: dpId,
          statut: 'affecte',
          date_affectation: new Date().toISOString().split('T')[0]
        })
        .eq('id', projetId);

      if (erreurMaj) throw erreurMaj;

      // Créer une notification pour le DP
      const dpInfo = dps.find(d => d.id === dpId);
      const projetInfo = projets.find(p => p.id === projetId);

      await supabase.from('notifications').insert({
        utilisateur_id: dpId,
        projet_id: projetId,
        type_notification: 'affectation',
        message: `Nouveau projet affecté : ${projetInfo?.titre}`
      });

      alert(`Projet affecté à ${dpInfo?.prenom} ${dpInfo?.nom}`);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur affectation:', error);
      alert('Erreur lors de l\'affectation');
    } finally {
      setAffectationEnCours(null);
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'urgente': return colors.danger;
      case 'haute': return '#f59e0b';
      case 'normale': return colors.accent;
      case 'basse': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getPrioriteBadge = (priorite: string) => {
    const color = getPrioriteColor(priorite);
    return {
      backgroundColor: `${color}20`,
      color: color,
      borderColor: color
    };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: colors.text }}>Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Bannette - Projets à affecter
          </h1>
          <div 
            className="text-lg font-semibold px-4 py-2 rounded"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.text
            }}
          >
            {projets.length} projet{projets.length > 1 ? 's' : ''} en attente
          </div>
        </div>

        {projets.length === 0 ? (
          <div 
            className="rounded-lg p-12 text-center"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <p className="text-xl" style={{ color: colors.text }}>
              Aucun projet en attente d'affectation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projets.map((projet) => (
              <div
                key={projet.id}
                className="rounded-lg p-6 border-l-4"
                style={{ 
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderLeftColor: getPrioriteColor(projet.priorite),
                  borderLeftWidth: '4px'
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                        {projet.titre}
                      </h2>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-semibold uppercase border"
                        style={getPrioriteBadge(projet.priorite)}
                      >
                        {projet.priorite}
                      </span>
                    </div>
                    <div className="space-y-1" style={{ color: colors.text }}>
                      <p><strong>N° Projet:</strong> {projet.numero_projet}</p>
                      <p><strong>Client:</strong> {projet.client?.nom}</p>
                      <p><strong>Date création:</strong> {new Date(projet.date_creation).toLocaleDateString('fr-FR')}</p>
                      <p><strong>Budget:</strong> {projet.budget_total.toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2" style={{ color: colors.text }}>
                    Prestations:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {projet.prestations.map((p, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded text-sm"
                        style={{ 
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                      >
                        {p.type_prestation}: {p.libelle}
                      </span>
                    ))}
                  </div>
                </div>

                <div 
                  className="border-t pt-4"
                  style={{ borderColor: colors.border }}
                >
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Affecter à un DP:
                  </label>
                  <div className="flex gap-2">
                    <select
                      id={`dp-select-${projet.id}`}
                      className="flex-1 rounded px-3 py-2"
                      style={{ 
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Sélectionner un DP...</option>
                      {dps.map((dp) => (
                        <option key={dp.id} value={dp.id}>
                          {dp.prenom} {dp.nom}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById(`dp-select-${projet.id}`) as HTMLSelectElement;
                        if (select.value) {
                          affecterProjet(projet.id, select.value);
                        } else {
                          alert('Veuillez sélectionner un DP');
                        }
                      }}
                      disabled={affectationEnCours === projet.id}
                      className="px-6 py-2 rounded font-semibold transition-colors text-white disabled:opacity-50"
                      style={{ backgroundColor: colors.accent }}
                      onMouseEnter={(e) => !affectationEnCours && (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => !affectationEnCours && (e.currentTarget.style.opacity = '1')}
                    >
                      {affectationEnCours === projet.id ? 'Affectation...' : 'Affecter'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}