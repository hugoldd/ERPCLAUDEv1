'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

interface Competence {
  id: string;
  code: string;
  nom: string;
  description?: string | null;
  categorie: string;
  niveau_requis: string;
  actif: boolean;
}

interface FormData {
  code: string;
  nom: string;
  description: string;
  categorie: string;
  niveau_requis: string;
}

export default function CataloguesCompetences() {
  const { colors } = useTheme();
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [categorieFiltre, setCategorieFiltre] = useState<string>('tous');
  const [showModal, setShowModal] = useState(false);
  const [editingCompetence, setEditingCompetence] = useState<Competence | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    nom: '',
    description: '',
    categorie: 'technique',
    niveau_requis: 'intermediaire'
  });
  const [saving, setSaving] = useState(false);

  const categories = [
    { value: 'tous', label: 'Toutes catégories', icon: '📚' },
    { value: 'technique', label: 'Techniques', icon: '💻' },
    { value: 'fonctionnel', label: 'Fonctionnelles', icon: '⚙️' },
    { value: 'metier', label: 'Métier', icon: '🏢' },
    { value: 'soft_skills', label: 'Soft Skills', icon: '🤝' }
  ];

  const niveaux = [
    { value: 'debutant', label: 'Débutant', icon: '🌱' },
    { value: 'intermediaire', label: 'Intermédiaire', icon: '🌿' },
    { value: 'expert', label: 'Expert', icon: '🌳' }
  ];

  useEffect(() => {
    chargerCompetences();
  }, []);

  const chargerCompetences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('competences')
      .select('*')
      .order('categorie', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des compétences');
    } else {
      setCompetences((data as Competence[]) || []);
    }
    setLoading(false);
  };

  const competencesFiltrees = competences.filter((comp) => {
    const q = recherche.toLowerCase();
    const matchRecherche =
      comp.nom.toLowerCase().includes(q) ||
      (comp.description || '').toLowerCase().includes(q) ||
      comp.code.toLowerCase().includes(q);

    const matchCategorie = categorieFiltre === 'tous' || comp.categorie === categorieFiltre;
    return matchRecherche && matchCategorie;
  });

  const getCategorieLabel = (categorie: string) => {
    const cat = categories.find((c) => c.value === categorie);
    return cat?.label || categorie;
  };

  const getCategorieIcon = (categorie: string) => {
    const cat = categories.find((c) => c.value === categorie);
    return cat?.icon || '📌';
  };

  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'technique':
        return colors.accent;
      case 'fonctionnel':
        return colors.success;
      case 'metier':
        return '#f59e0b';
      case 'soft_skills':
        return '#8b5cf6';
      default:
        return colors.textSecondary;
    }
  };

  const getNiveauColor = (niveau: string) => {
    switch (niveau) {
      case 'debutant':
        return '#10b981';
      case 'intermediaire':
        return '#f59e0b';
      case 'expert':
        return '#ef4444';
      default:
        return colors.textSecondary;
    }
  };

  const getNiveauLabel = (niveau: string) => {
    const niv = niveaux.find((n) => n.value === niveau);
    return niv?.label || niveau;
  };

  const ouvrirModal = (competence?: Competence) => {
    if (competence) {
      setEditingCompetence(competence);
      setFormData({
        code: competence.code,
        nom: competence.nom,
        description: competence.description || '',
        categorie: competence.categorie,
        niveau_requis: competence.niveau_requis
      });
    } else {
      setEditingCompetence(null);
      setFormData({
        code: '',
        nom: '',
        description: '',
        categorie: 'technique',
        niveau_requis: 'intermediaire'
      });
    }
    setShowModal(true);
  };

  const fermerModal = () => {
    setShowModal(false);
    setEditingCompetence(null);
    setFormData({
      code: '',
      nom: '',
      description: '',
      categorie: 'technique',
      niveau_requis: 'intermediaire'
    });
  };

  const sauvegarderCompetence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCompetence) {
        const { error } = await supabase
          .from('competences')
          .update(formData)
          .eq('id', editingCompetence.id);

        if (error) throw error;
        alert('Compétence modifiée avec succès');
      } else {
        const { error } = await supabase
          .from('competences')
          .insert([{ ...formData, actif: true }]);

        if (error) throw error;
        alert('Compétence créée avec succès');
      }

      fermerModal();
      chargerCompetences();
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error?.code === '23505') {
        alert('Ce code de compétence existe déjà');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActif = async (comp: Competence) => {
    const { error } = await supabase
      .from('competences')
      .update({ actif: !comp.actif })
      .eq('id', comp.id);

    if (error) {
      alert('Erreur lors de la modification');
    } else {
      chargerCompetences();
    }
  };

  const supprimerCompetence = async (comp: Competence) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la compétence "${comp.nom}" ?`)) {
      return;
    }

    const { error } = await supabase.from('competences').delete().eq('id', comp.id);

    if (error) {
      console.error('Erreur:', error);
      alert('Impossible de supprimer cette compétence (elle est peut-être utilisée)');
    } else {
      alert('Compétence supprimée');
      chargerCompetences();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: colors.text }}>
            Chargement...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Navigation + Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/parametrage"
            className="text-sm font-medium hover:underline"
            style={{ color: colors.textSecondary }}
          >
            ← Retour au paramétrage
          </Link>

          <button
            onClick={() => ouvrirModal()}
            className="px-6 py-3 rounded font-semibold transition-colors text-white"
            style={{ backgroundColor: colors.accent }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.accent)}
          >
            + Nouvelle compétence
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
            📚 Catalogue des Compétences
          </h1>
          <p style={{ color: colors.textSecondary }}>
            Gérez le référentiel de compétences de votre organisation
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {categories.slice(1).map((cat) => {
            const count = competences.filter((c) => c.categorie === cat.value && c.actif).length;
            return (
              <div
                key={cat.value}
                className="rounded-xl p-6 cursor-pointer transition-all"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${
                    categorieFiltre === cat.value ? getCategorieColor(cat.value) : colors.border
                  }`
                }}
                onClick={() => setCategorieFiltre(cat.value)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.cardHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.card)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-3xl font-bold" style={{ color: colors.text }}>
                    {count}
                  </span>
                </div>
                <div className="font-semibold" style={{ color: getCategorieColor(cat.value) }}>
                  {cat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="🔍 Rechercher une compétence (nom, code, description)..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded px-4 py-3 placeholder-gray-400"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.text
            }}
          />

          <select
            value={categorieFiltre}
            onChange={(e) => setCategorieFiltre(e.target.value)}
            className="w-full rounded px-4 py-3"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.text
            }}
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des compétences */}
        {competencesFiltrees.length === 0 ? (
          <div
            className="rounded-lg p-12 text-center"
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <p className="text-xl mb-2" style={{ color: colors.text }}>
              Aucune compétence trouvée
            </p>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {recherche || categorieFiltre !== 'tous'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Commencez par créer votre première compétence'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competencesFiltrees.map((comp) => (
              <div
                key={comp.id}
                className="rounded-xl p-6 transition-all duration-200"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${colors.border}`,
                  opacity: comp.actif ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.cardHover;
                  e.currentTarget.style.borderColor = getCategorieColor(comp.categorie);
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.card;
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategorieIcon(comp.categorie)}</span>
                    <span
                      className="text-xs font-semibold uppercase px-2 py-1 rounded"
                      style={{
                        backgroundColor: getCategorieColor(comp.categorie) + '20',
                        color: getCategorieColor(comp.categorie)
                      }}
                    >
                      {getCategorieLabel(comp.categorie)}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleActif(comp)}
                    className="text-xs px-2 py-1 rounded font-semibold"
                    style={{
                      backgroundColor: comp.actif ? colors.success + '20' : colors.danger + '20',
                      color: comp.actif ? colors.success : colors.danger
                    }}
                  >
                    {comp.actif ? '✓ Actif' : '✗ Inactif'}
                  </button>
                </div>

                {/* Code */}
                <div className="text-xs font-mono mb-2" style={{ color: colors.textSecondary }}>
                  {comp.code}
                </div>

                {/* Nom */}
                <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                  {comp.nom}
                </h3>

                {/* Description */}
                <p className="text-sm mb-4 line-clamp-2" style={{ color: colors.textSecondary }}>
                  {comp.description || 'Aucune description'}
                </p>

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      Niveau:
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{
                        backgroundColor: getNiveauColor(comp.niveau_requis) + '20',
                        color: getNiveauColor(comp.niveau_requis)
                      }}
                    >
                      {getNiveauLabel(comp.niveau_requis)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => ouvrirModal(comp)}
                      className="text-sm font-medium hover:underline"
                      style={{ color: colors.accent }}
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => supprimerCompetence(comp)}
                      className="text-sm font-medium hover:underline"
                      style={{ color: colors.danger }}
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats footer */}
        <div className="mt-8 text-center" style={{ color: colors.textSecondary }}>
          <p className="text-lg font-semibold" style={{ color: colors.text }}>
            {competencesFiltrees.length} compétence{competencesFiltrees.length > 1 ? 's' : ''}{' '}
            affichée{competencesFiltrees.length > 1 ? 's' : ''}
          </p>
          <p className="text-sm">
            {competences.filter((c) => c.actif).length} active
            {competences.filter((c) => c.actif).length > 1 ? 's' : ''} sur {competences.length}{' '}
            total
          </p>
        </div>
      </div>

      {/* Modal Création/Édition */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={fermerModal}
        >
          <div
            className="rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
              {editingCompetence ? '✏️ Modifier la compétence' : '➕ Nouvelle compétence'}
            </h2>

            <form onSubmit={sauvegarderCompetence} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Code <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: TECH_SQL"
                    className="w-full rounded px-3 py-2 font-mono"
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                    disabled={!!editingCompetence}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Catégorie <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <select
                    required
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    className="w-full rounded px-3 py-2"
                    style={{
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  >
                    {categories.slice(1).map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Nom <span style={{ color: colors.danger }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: SQL / Bases de données"
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
                  placeholder="Description détaillée de la compétence..."
                  rows={4}
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
                  Niveau requis par défaut
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
                  {niveaux.map((niv) => (
                    <option key={niv.value} value={niv.value}>
                      {niv.icon} {niv.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="flex justify-end gap-3 pt-4"
                style={{ borderTop: `1px solid ${colors.border}` }}
              >
                <button
                  type="button"
                  onClick={fermerModal}
                  className="px-6 py-3 rounded font-semibold transition-colors"
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
                  disabled={saving}
                  className="px-6 py-3 rounded font-semibold transition-colors text-white"
                  style={{
                    backgroundColor: colors.success,
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Enregistrement...' : editingCompetence ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
