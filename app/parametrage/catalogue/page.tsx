'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

interface Prestation {
  id: string;
  code: string;
  nom: string;
  description?: string;
  type_prestation?: string;
  duree_estimee_jours?: number;
  prix_unitaire_defaut?: number;
  actif: boolean;
  competences?: Array<{
    competence_id: string;
    niveau_requis?: string;
    obligatoire: boolean;
    competence: {
      nom: string;
    };
  }>;
}

interface Competence {
  id: string;
  nom: string;
  niveau_requis?: string;
}

export default function CataloguePrestations() {
  const { colors } = useTheme();
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [competencesDisponibles, setCompetencesDisponibles] = useState<Competence[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalCompetences, setModalCompetences] = useState(false);
  const [prestationEnCours, setPrestationEnCours] = useState<Prestation | null>(null);
  const [competencesSelectionnees, setCompetencesSelectionnees] = useState<Array<{
    competence_id: string;
    niveau_requis: string;
    obligatoire: boolean;
  }>>([]);
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    type_prestation: '',
    duree_estimee_jours: 0,
    prix_unitaire_defaut: 0,
    actif: true
  });

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    
    // Charger les prestations avec leurs compétences
    const { data: prestationsData, error: erreurPrestations } = await supabase
      .from('catalogue_prestations')
      .select(`
        *,
        competences:catalogue_prestations_competences(
          competence_id,
          niveau_requis,
          obligatoire,
          competence:competences(nom)
        )
      `)
      .order('type_prestation', { ascending: true })
      .order('nom', { ascending: true });

    if (erreurPrestations) {
      console.error('Erreur:', erreurPrestations);
    } else {
      setPrestations(prestationsData || []);
    }

    // Charger la liste des compétences
    const { data: competencesData, error: erreurCompetences } = await supabase
      .from('competences')
      .select('id, nom, niveau_requis')
      .eq('actif', true)
      .order('nom');

    if (!erreurCompetences) {
      setCompetencesDisponibles(competencesData || []);
    }

    setLoading(false);
  };

  const ouvrirModal = (prestation?: Prestation) => {
    if (prestation) {
      setPrestationEnCours(prestation);
      setFormData({
        code: prestation.code,
        nom: prestation.nom,
        description: prestation.description || '',
        type_prestation: prestation.type_prestation || '',
        duree_estimee_jours: prestation.duree_estimee_jours || 0,
        prix_unitaire_defaut: prestation.prix_unitaire_defaut || 0,
        actif: prestation.actif
      });
      setCompetencesSelectionnees(
        (prestation.competences || []).map(c => ({
          competence_id: c.competence_id,
          niveau_requis: c.niveau_requis || '',
          obligatoire: c.obligatoire
        }))
      );
    } else {
      setPrestationEnCours(null);
      setFormData({
        code: '',
        nom: '',
        description: '',
        type_prestation: '',
        duree_estimee_jours: 0,
        prix_unitaire_defaut: 0,
        actif: true
      });
      setCompetencesSelectionnees([]);
    }
    setModalOuvert(true);
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let prestationId = prestationEnCours?.id;

      if (prestationEnCours) {
        // Mise à jour
        const { error } = await supabase
          .from('catalogue_prestations')
          .update(formData)
          .eq('id', prestationEnCours.id);

        if (error) throw error;
      } else {
        // Création
        const { data, error } = await supabase
          .from('catalogue_prestations')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        prestationId = data.id;
      }

      // Mettre à jour les compétences
      if (prestationId) {
        // Supprimer les anciennes liaisons
        await supabase
          .from('catalogue_prestations_competences')
          .delete()
          .eq('prestation_id', prestationId);

        // Ajouter les nouvelles
        if (competencesSelectionnees.length > 0) {
          const liaisons = competencesSelectionnees.map(c => ({
            prestation_id: prestationId,
            ...c
          }));

          await supabase
            .from('catalogue_prestations_competences')
            .insert(liaisons);
        }
      }

      alert('Prestation sauvegardée avec succès');
      setModalOuvert(false);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const ajouterCompetence = () => {
    setModalCompetences(true);
  };

  const confirmerAjoutCompetence = (competenceId: string) => {
    if (!competencesSelectionnees.find(c => c.competence_id === competenceId)) {
      setCompetencesSelectionnees([
        ...competencesSelectionnees,
        { competence_id: competenceId, niveau_requis: '', obligatoire: true }
      ]);
    }
    setModalCompetences(false);
  };

  const retirerCompetence = (competenceId: string) => {
    setCompetencesSelectionnees(
      competencesSelectionnees.filter(c => c.competence_id !== competenceId)
    );
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
              Catalogue de Prestations
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Gérez le catalogue des prestations et leurs compétences requises
            </p>
          </div>
          <button
            onClick={() => ouvrirModal()}
            className="px-6 py-3 rounded font-semibold transition-colors text-white"
            style={{ backgroundColor: colors.accent }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accentHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
          >
            + Nouvelle prestation
          </button>
        </div>

        <div 
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <table className="w-full">
            <thead style={{ backgroundColor: colors.background }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Durée (j)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Prix</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Compétences</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.text }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prestations.map((prestation, index) => (
                <tr 
                  key={prestation.id}
                  style={{
                    borderTop: index > 0 ? `1px solid ${colors.border}` : 'none',
                    opacity: prestation.actif ? 1 : 0.5
                  }}
                >
                  <td className="px-4 py-3" style={{ color: colors.text }}>
                    <span className="font-mono text-sm">{prestation.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: colors.text }}>{prestation.nom}</div>
                    {prestation.description && (
                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        {prestation.description.substring(0, 60)}...
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm capitalize" style={{ color: colors.textSecondary }}>
                      {prestation.type_prestation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: colors.text }}>
                    {prestation.duree_estimee_jours || '-'}
                  </td>
                  <td className="px-4 py-3" style={{ color: colors.text }}>
                    {prestation.prix_unitaire_defaut ? 
                      `${prestation.prix_unitaire_defaut.toLocaleString('fr-FR')} €` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(prestation.competences || []).slice(0, 2).map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `${colors.accent}20`,
                            color: colors.accent
                          }}
                        >
                          {c.competence.nom}
                        </span>
                      ))}
                      {(prestation.competences?.length || 0) > 2 && (
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          +{(prestation.competences?.length || 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: prestation.actif ? `${colors.success}20` : `${colors.textSecondary}20`,
                        color: prestation.actif ? colors.success : colors.textSecondary
                      }}
                    >
                      {prestation.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => ouvrirModal(prestation)}
                      className="text-sm font-medium transition-colors"
                      style={{ color: colors.accent }}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal principale */}
        {modalOuvert && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setModalOuvert(false)}
          >
            <div
              className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
                {prestationEnCours ? 'Modifier la prestation' : 'Nouvelle prestation'}
              </h2>

              <form onSubmit={sauvegarder} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded px-3 py-2 font-mono"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                      placeholder="LOG-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Type de prestation
                    </label>
                    <select
                      value={formData.type_prestation}
                      onChange={(e) => setFormData({ ...formData, type_prestation: e.target.value })}
                      className="w-full rounded px-3 py-2"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="logiciel">Logiciel</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="licence">Licence</option>
                      <option value="formation">Formation</option>
                      <option value="assistance">Assistance</option>
                    </select>
                  </div>
                </div>

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
                      Durée estimée (jours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.duree_estimee_jours}
                      onChange={(e) => setFormData({ ...formData, duree_estimee_jours: parseFloat(e.target.value) })}
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
                      Prix unitaire défaut (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.prix_unitaire_defaut}
                      onChange={(e) => setFormData({ ...formData, prix_unitaire_defaut: parseFloat(e.target.value) })}
                      className="w-full rounded px-3 py-2"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    />
                  </div>
                </div>

                <div 
                  className="border-t pt-4"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold" style={{ color: colors.text }}>
                      Compétences requises
                    </h3>
                    <button
                      type="button"
                      onClick={ajouterCompetence}
                      className="text-sm px-3 py-1 rounded"
                      style={{
                        backgroundColor: colors.accent,
                        color: 'white'
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>

                  <div className="space-y-2">
                    {competencesSelectionnees.map((cs) => {
                      const comp = competencesDisponibles.find(c => c.id === cs.competence_id);
                      return (
                        <div 
                          key={cs.competence_id}
                          className="flex items-center gap-3 p-2 rounded"
                          style={{ backgroundColor: colors.background }}
                        >
                          <span className="flex-1" style={{ color: colors.text }}>{comp?.nom}</span>
                          <select
                            value={cs.niveau_requis}
                            onChange={(e) => {
                              const updated = competencesSelectionnees.map(c => 
                                c.competence_id === cs.competence_id 
                                  ? { ...c, niveau_requis: e.target.value }
                                  : c
                              );
                              setCompetencesSelectionnees(updated);
                            }}
                            className="rounded px-2 py-1 text-sm"
                            style={{
                              backgroundColor: colors.card,
                              border: `1px solid ${colors.border}`,
                              color: colors.text
                            }}
                          >
                            <option value="">Niveau...</option>
                            <option value="junior">Junior</option>
                            <option value="confirmé">Confirmé</option>
                            <option value="senior">Senior</option>
                            <option value="expert">Expert</option>
                          </select>
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={cs.obligatoire}
                              onChange={(e) => {
                                const updated = competencesSelectionnees.map(c => 
                                  c.competence_id === cs.competence_id 
                                    ? { ...c, obligatoire: e.target.checked }
                                    : c
                                );
                                setCompetencesSelectionnees(updated);
                              }}
                            />
                            <span style={{ color: colors.text }}>Obligatoire</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => retirerCompetence(cs.competence_id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
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
                    Prestation active
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <button
                    type="button"
                    onClick={() => setModalOuvert(false)}
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

        {/* Modal sélection compétence */}
        {modalCompetences && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[60]"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setModalCompetences(false)}
          >
            <div
              className="rounded-lg p-6 w-full max-w-md"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                Sélectionner une compétence
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {competencesDisponibles
                  .filter(c => !competencesSelectionnees.find(cs => cs.competence_id === c.id))
                  .map(competence => (
                    <button
                      key={competence.id}
                      type="button"
                      onClick={() => confirmerAjoutCompetence(competence.id)}
                      className="w-full text-left p-3 rounded transition-colors"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.cardHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.background}
                    >
                      {competence.nom}
                      {competence.niveau_requis && (
                        <span className="text-xs ml-2" style={{ color: colors.textSecondary }}>
                          ({competence.niveau_requis})
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}