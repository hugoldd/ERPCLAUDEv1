'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

interface Competence {
  id: string;
  nom: string;
  description?: string;
  niveau_requis?: string;
  domaine?: string;
  actif: boolean;
}

export default function GestionCompetences() {
  const { colors } = useTheme();
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [competenceEnCours, setCompetenceEnCours] = useState<Competence | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    niveau_requis: '',
    domaine: '',
    actif: true
  });

  useEffect(() => {
    chargerCompetences();
  }, []);

  const chargerCompetences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('competences')
      .select('*')
      .order('domaine', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur:', error);
    } else {
      setCompetences(data || []);
    }
    setLoading(false);
  };

  const ouvrirModal = (competence?: Competence) => {
    if (competence) {
      setCompetenceEnCours(competence);
      setFormData({
        nom: competence.nom,
        description: competence.description || '',
        niveau_requis: competence.niveau_requis || '',
        domaine: competence.domaine || '',
        actif: competence.actif
      });
    } else {
      setCompetenceEnCours(null);
      setFormData({
        nom: '',
        description: '',
        niveau_requis: '',
        domaine: '',
        actif: true
      });
    }
    setModalOuvert(true);
  };

  const fermerModal = () => {
    setModalOuvert(false);
    setCompetenceEnCours(null);
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (competenceEnCours) {
        // Mise à jour
        const { error } = await supabase
          .from('competences')
          .update(formData)
          .eq('id', competenceEnCours.id);

        if (error) throw error;
        alert('Compétence mise à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('competences')
          .insert([formData]);

        if (error) throw error;
        alert('Compétence créée avec succès');
      }

      fermerModal();
      chargerCompetences();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const toggleActif = async (competence: Competence) => {
    try {
      const { error } = await supabase
        .from('competences')
        .update({ actif: !competence.actif })
        .eq('id', competence.id);

      if (error) throw error;
      chargerCompetences();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getNiveauBadge = (niveau?: string) => {
    if (!niveau) return { bg: colors.textSecondary, text: 'Non défini' };
    
    const niveaux: Record<string, { bg: string; text: string }> = {
      'junior': { bg: '#10b981', text: 'Junior' },
      'confirmé': { bg: colors.accent, text: 'Confirmé' },
      'senior': { bg: '#8b5cf6', text: 'Senior' },
      'expert': { bg: colors.danger, text: 'Expert' }
    };
    
    return niveaux[niveau] || { bg: colors.textSecondary, text: niveau };
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
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Gestion des Compétences
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Paramétrez les compétences requises pour les prestations
            </p>
          </div>
          <button
            onClick={() => ouvrirModal()}
            className="px-6 py-3 rounded font-semibold transition-colors text-white"
            style={{ backgroundColor: colors.accent }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accentHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
          >
            + Nouvelle compétence
          </button>
        </div>

        {/* Groupement par domaine */}
        {['technique', 'fonctionnel', 'gestion', 'autre'].map(domaine => {
          const competencesDomaine = competences.filter(c => 
            (c.domaine || 'autre').toLowerCase() === domaine
          );
          
          if (competencesDomaine.length === 0) return null;

          return (
            <div key={domaine} className="mb-8">
              <h2 
                className="text-xl font-bold mb-4 capitalize"
                style={{ color: colors.text }}
              >
                {domaine}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {competencesDomaine.map(competence => {
                  const niveauInfo = getNiveauBadge(competence.niveau_requis);
                  return (
                    <div
                      key={competence.id}
                      className="rounded-lg p-4 transition-all"
                      style={{
                        backgroundColor: competence.actif ? colors.card : colors.background,
                        border: `1px solid ${colors.border}`,
                        opacity: competence.actif ? 1 : 0.6
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold" style={{ color: colors.text }}>
                          {competence.nom}
                        </h3>
                        <button
                          onClick={() => toggleActif(competence)}
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: competence.actif ? colors.success : colors.textSecondary,
                            color: 'white'
                          }}
                        >
                          {competence.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </div>

                      {competence.description && (
                        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                          {competence.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: `${niveauInfo.bg}20`,
                            color: niveauInfo.bg
                          }}
                        >
                          {niveauInfo.text}
                        </span>
                      </div>

                      <button
                        onClick={() => ouvrirModal(competence)}
                        className="text-sm font-medium transition-colors"
                        style={{ color: colors.accent }}
                        onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.accent}
                      >
                        Modifier →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Modal */}
        {modalOuvert && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={fermerModal}
          >
            <div
              className="rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
                {competenceEnCours ? 'Modifier la compétence' : 'Nouvelle compétence'}
              </h2>

              <form onSubmit={sauvegarder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Nom <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full rounded px-3 py-2"
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded px-3 py-2"
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Domaine
                    </label>
                    <select
                      value={formData.domaine}
                      onChange={(e) => setFormData({ ...formData, domaine: e.target.value })}
                      className="w-full rounded px-3 py-2"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="technique">Technique</option>
                      <option value="fonctionnel">Fonctionnel</option>
                      <option value="gestion">Gestion</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Niveau requis
                    </label>
                    <select
                      value={formData.niveau_requis}
                      onChange={(e) => setFormData({ ...formData, niveau_requis: e.target.value })}
                      className="w-full rounded px-3 py-2"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="junior">Junior</option>
                      <option value="confirmé">Confirmé</option>
                      <option value="senior">Senior</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="actif"
                    checked={formData.actif}
                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="actif" style={{ color: colors.text }}>
                    Compétence active
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <button
                    type="button"
                    onClick={fermerModal}
                    className="px-6 py-2 rounded font-semibold transition-colors"
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded font-semibold text-white transition-colors"
                    style={{ backgroundColor: colors.success }}
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}