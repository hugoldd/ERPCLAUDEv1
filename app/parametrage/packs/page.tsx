'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

interface Pack {
  id: string;
  code: string;
  nom: string;
  description?: string;
  prix_total?: number;
  duree_totale_jours?: number;
  actif: boolean;
  prestations?: Array<{
    prestation_id: string;
    quantite: number;
    ordre: number;
    prestation: {
      nom: string;
      code: string;
      prix_unitaire_defaut?: number;
      duree_estimee_jours?: number;
    };
  }>;
}

interface PrestationCatalogue {
  id: string;
  code: string;
  nom: string;
  prix_unitaire_defaut?: number;
  duree_estimee_jours?: number;
}

export default function GestionPacks() {
  const { colors } = useTheme();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [prestationsCatalogue, setPrestationsCatalogue] = useState<PrestationCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [modalPrestations, setModalPrestations] = useState(false);
  const [packEnCours, setPackEnCours] = useState<Pack | null>(null);
  const [prestationsSelectionnees, setPrestationsSelectionnees] = useState<Array<{
    prestation_id: string;
    quantite: number;
    ordre: number;
  }>>([]);
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    actif: true
  });

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    
    // Charger les packs avec leurs prestations
    const { data: packsData, error: erreurPacks } = await supabase
      .from('packs_prestations')
      .select(`
        *,
        prestations:pack_prestations_items(
          prestation_id,
          quantite,
          ordre,
          prestation:catalogue_prestations(
            nom,
            code,
            prix_unitaire_defaut,
            duree_estimee_jours
          )
        )
      `)
      .order('nom', { ascending: true });

    if (erreurPacks) {
      console.error('Erreur:', erreurPacks);
    } else {
      setPacks(packsData || []);
    }

    // Charger le catalogue de prestations
    const { data: prestationsData, error: erreurPrestations } = await supabase
      .from('catalogue_prestations')
      .select('id, code, nom, prix_unitaire_defaut, duree_estimee_jours')
      .eq('actif', true)
      .order('nom');

    if (!erreurPrestations) {
      setPrestationsCatalogue(prestationsData || []);
    }

    setLoading(false);
  };

  const ouvrirModal = (pack?: Pack) => {
    if (pack) {
      setPackEnCours(pack);
      setFormData({
        code: pack.code,
        nom: pack.nom,
        description: pack.description || '',
        actif: pack.actif
      });
      setPrestationsSelectionnees(
        (pack.prestations || []).map(p => ({
          prestation_id: p.prestation_id,
          quantite: p.quantite,
          ordre: p.ordre
        }))
      );
    } else {
      setPackEnCours(null);
      setFormData({
        code: '',
        nom: '',
        description: '',
        actif: true
      });
      setPrestationsSelectionnees([]);
    }
    setModalOuvert(true);
  };

  const calculerTotaux = () => {
    let prixTotal = 0;
    let dureeTotal = 0;

    prestationsSelectionnees.forEach(ps => {
      const prestation = prestationsCatalogue.find(p => p.id === ps.prestation_id);
      if (prestation) {
        prixTotal += (prestation.prix_unitaire_defaut || 0) * ps.quantite;
        dureeTotal += (prestation.duree_estimee_jours || 0) * ps.quantite;
      }
    });

    return { prixTotal, dureeTotal };
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const totaux = calculerTotaux();
      const dataToSave = {
        ...formData,
        prix_total: totaux.prixTotal,
        duree_totale_jours: totaux.dureeTotal
      };

      let packId = packEnCours?.id;

      if (packEnCours) {
        // Mise à jour
        const { error } = await supabase
          .from('packs_prestations')
          .update(dataToSave)
          .eq('id', packEnCours.id);

        if (error) throw error;
      } else {
        // Création
        const { data, error } = await supabase
          .from('packs_prestations')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        packId = data.id;
      }

      // Mettre à jour les prestations du pack
      if (packId) {
        // Supprimer les anciennes liaisons
        await supabase
          .from('pack_prestations_items')
          .delete()
          .eq('pack_id', packId);

        // Ajouter les nouvelles
        if (prestationsSelectionnees.length > 0) {
          const items = prestationsSelectionnees.map(p => ({
            pack_id: packId,
            ...p
          }));

          await supabase
            .from('pack_prestations_items')
            .insert(items);
        }
      }

      alert('Pack sauvegardé avec succès');
      setModalOuvert(false);
      chargerDonnees();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const ajouterPrestation = () => {
    setModalPrestations(true);
  };

  const confirmerAjoutPrestation = (prestationId: string) => {
    if (!prestationsSelectionnees.find(p => p.prestation_id === prestationId)) {
      setPrestationsSelectionnees([
        ...prestationsSelectionnees,
        { 
          prestation_id: prestationId, 
          quantite: 1,
          ordre: prestationsSelectionnees.length + 1
        }
      ]);
    }
    setModalPrestations(false);
  };

  const retirerPrestation = (prestationId: string) => {
    setPrestationsSelectionnees(
      prestationsSelectionnees.filter(p => p.prestation_id !== prestationId)
    );
  };

  const modifierQuantite = (prestationId: string, quantite: number) => {
    if (quantite < 1) return;
    setPrestationsSelectionnees(
      prestationsSelectionnees.map(p => 
        p.prestation_id === prestationId ? { ...p, quantite } : p
      )
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
              Gestion des Packs
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Créez des packs de prestations pré-configurés
            </p>
          </div>
          <button
            onClick={() => ouvrirModal()}
            className="px-6 py-3 rounded font-semibold transition-colors text-white"
            style={{ backgroundColor: colors.accent }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accentHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
          >
            + Nouveau pack
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map(pack => {
            const nbPrestations = pack.prestations?.length || 0;
            return (
              <div
                key={pack.id}
                className="rounded-lg p-6 transition-all"
                style={{
                  backgroundColor: pack.actif ? colors.card : colors.background,
                  border: `1px solid ${colors.border}`,
                  opacity: pack.actif ? 1 : 0.6
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1" style={{ color: colors.text }}>
                      {pack.nom}
                    </h3>
                    <span className="font-mono text-sm" style={{ color: colors.textSecondary }}>
                      {pack.code}
                    </span>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: pack.actif ? `${colors.success}20` : `${colors.textSecondary}20`,
                      color: pack.actif ? colors.success : colors.textSecondary
                    }}
                  >
                    {pack.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {pack.description && (
                  <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                    {pack.description}
                  </p>
                )}

                <div 
                  className="grid grid-cols-2 gap-4 py-4 mb-4"
                  style={{ borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}
                >
                  <div>
                    <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>
                      Prix total
                    </div>
                    <div className="font-bold" style={{ color: colors.text }}>
                      {pack.prix_total ? `${pack.prix_total.toLocaleString('fr-FR')} €` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>
                      Durée totale
                    </div>
                    <div className="font-bold" style={{ color: colors.text }}>
                      {pack.duree_totale_jours ? `${pack.duree_totale_jours} j` : '-'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2" style={{ color: colors.text }}>
                    {nbPrestations} prestation{nbPrestations > 1 ? 's' : ''}
                  </div>
                  <div className="space-y-1">
                    {(pack.prestations || []).slice(0, 3).map((p, i) => (
                      <div 
                        key={i} 
                        className="text-xs flex justify-between"
                        style={{ color: colors.textSecondary }}
                      >
                        <span>{p.prestation.nom}</span>
                        <span>x{p.quantite}</span>
                      </div>
                    ))}
                    {nbPrestations > 3 && (
                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        +{nbPrestations - 3} autres...
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => ouvrirModal(pack)}
                  className="w-full py-2 rounded font-medium transition-colors"
                  style={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.accent
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accent;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background;
                    e.currentTarget.style.color = colors.accent;
                  }}
                >
                  Modifier le pack
                </button>
              </div>
            );
          })}
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
                {packEnCours ? 'Modifier le pack' : 'Nouveau pack'}
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
                      placeholder="PACK-001"
                    />
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

                <div 
                  className="border-t pt-4"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold" style={{ color: colors.text }}>
                      Prestations du pack
                    </h3>
                    <button
                      type="button"
                      onClick={ajouterPrestation}
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
                    {prestationsSelectionnees.map((ps) => {
                      const prestation = prestationsCatalogue.find(p => p.id === ps.prestation_id);
                      if (!prestation) return null;
                      
                      const sousTotal = (prestation.prix_unitaire_defaut || 0) * ps.quantite;
                      const dureeTotal = (prestation.duree_estimee_jours || 0) * ps.quantite;

                      return (
                        <div 
                          key={ps.prestation_id}
                          className="flex items-center gap-3 p-3 rounded"
                          style={{ backgroundColor: colors.background }}
                        >
                          <div className="flex-1">
                            <div className="font-medium" style={{ color: colors.text }}>
                              {prestation.nom}
                            </div>
                            <div className="text-xs" style={{ color: colors.textSecondary }}>
                              {prestation.code} • {prestation.prix_unitaire_defaut?.toLocaleString('fr-FR')} € 
                              {prestation.duree_estimee_jours && ` • ${prestation.duree_estimee_jours} j`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-sm" style={{ color: colors.text }}>Qté:</label>
                            <input
                              type="number"
                              min="1"
                              value={ps.quantite}
                              onChange={(e) => modifierQuantite(ps.prestation_id, parseInt(e.target.value) || 1)}
                              className="w-16 rounded px-2 py-1 text-center"
                              style={{
                                backgroundColor: colors.card,
                                border: `1px solid ${colors.border}`,
                                color: colors.text
                              }}
                            />
                          </div>

                          <div className="text-sm font-medium" style={{ color: colors.text }}>
                            {sousTotal.toLocaleString('fr-FR')} €
                          </div>

                          <button
                            type="button"
                            onClick={() => retirerPrestation(ps.prestation_id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {prestationsSelectionnees.length > 0 && (
                    <div 
                      className="mt-4 p-3 rounded"
                      style={{ 
                        backgroundColor: `${colors.accent}10`,
                        border: `1px solid ${colors.accent}`
                      }}
                    >
                      <div className="flex justify-between text-lg font-bold" style={{ color: colors.text }}>
                        <span>Total du pack:</span>
                        <div className="text-right">
                          <div>{calculerTotaux().prixTotal.toLocaleString('fr-FR')} €</div>
                          <div className="text-sm font-normal" style={{ color: colors.textSecondary }}>
                            {calculerTotaux().dureeTotal} jours
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                    Pack actif
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

        {/* Modal sélection prestation */}
        {modalPrestations && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[60]"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setModalPrestations(false)}
          >
            <div
              className="rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: colors.text }}>
                Sélectionner une prestation
              </h3>
              <div className="space-y-2">
                {prestationsCatalogue
                  .filter(p => !prestationsSelectionnees.find(ps => ps.prestation_id === p.id))
                  .map(prestation => (
                    <button
                      key={prestation.id}
                      type="button"
                      onClick={() => confirmerAjoutPrestation(prestation.id)}
                      className="w-full text-left p-3 rounded transition-colors"
                      style={{
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.cardHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.background}
                    >
                      <div className="font-medium">{prestation.nom}</div>
                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        {prestation.code}
                        {prestation.prix_unitaire_defaut && ` • ${prestation.prix_unitaire_defaut.toLocaleString('fr-FR')} €`}
                        {prestation.duree_estimee_jours && ` • ${prestation.duree_estimee_jours} j`}
                      </div>
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