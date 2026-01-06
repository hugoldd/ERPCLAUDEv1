'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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
      case 'urgente': return 'border-l-red-500';
      case 'haute': return 'border-l-orange-500';
      case 'normale': return 'border-l-[#2196F3]';
      case 'basse': return 'border-l-gray-500';
      default: return 'border-l-gray-500';
    }
  };

  const getPrioriteBadge = (priorite: string) => {
    switch (priorite) {
      case 'urgente': return 'bg-red-500/20 text-red-300 border-red-500';
      case 'haute': return 'bg-orange-500/20 text-orange-300 border-orange-500';
      case 'normale': return 'bg-[#2196F3]/20 text-[#2196F3] border-[#2196F3]';
      case 'basse': return 'bg-gray-500/20 text-gray-300 border-gray-500';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2836] flex items-center justify-center">
        <div className="text-xl text-[#FFFFFF]">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2836] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Bouton retour */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[#2196F3] hover:text-[#FFFFFF] mb-6 transition-colors"
        >
          <span className="text-xl">🏠</span>
          <span className="font-medium">Retour à l'accueil</span>
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#FFFFFF]">Bannette - Projets à affecter</h1>
          <div className="text-lg font-semibold text-[#FFFFFF] bg-[#2E3744] px-4 py-2 rounded border border-[#FFFFFF26]">
            {projets.length} projet{projets.length > 1 ? 's' : ''} en attente
          </div>
        </div>

        {projets.length === 0 ? (
          <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-12 text-center">
            <p className="text-xl text-[#FFFFFF]">Aucun projet en attente d'affectation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projets.map((projet) => (
              <div
                key={projet.id}
                className={`bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6 border-l-4 ${getPrioriteColor(projet.priorite)}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-[#FFFFFF]">{projet.titre}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getPrioriteBadge(projet.priorite)}`}>
                        {projet.priorite}
                      </span>
                    </div>
                    <div className="text-[#FFFFFF] space-y-1">
                      <p><strong>N° Projet:</strong> {projet.numero_projet}</p>
                      <p><strong>Client:</strong> {projet.client?.nom}</p>
                      <p><strong>Date création:</strong> {new Date(projet.date_creation).toLocaleDateString('fr-FR')}</p>
                      <p><strong>Budget:</strong> {projet.budget_total.toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2 text-[#FFFFFF]">Prestations:</h3>
                  <div className="flex flex-wrap gap-2">
                    {projet.prestations.map((p, i) => (
                      <span
                        key={i}
                        className="bg-[#1F2836] border border-[#FFFFFF26] px-3 py-1 rounded text-sm text-[#FFFFFF]"
                      >
                        {p.type_prestation}: {p.libelle}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#FFFFFF26] pt-4">
                  <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Affecter à un DP:</label>
                  <div className="flex gap-2">
                    <select
                      id={`dp-select-${projet.id}`}
                      className="flex-1 bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
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
                      className="bg-[#2196F3] text-white px-6 py-2 rounded font-semibold hover:bg-[#1976D2] disabled:bg-gray-400 transition-colors"
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
    </div>
  );
}