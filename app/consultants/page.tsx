'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { supabase, Consultant, Competence, ConsultantCompetence, Equipe } from '@/lib/supabase';

const STATUTS: Consultant['statut'][] = ['actif', 'disponible', 'en_mission', 'inactif'];
const CONTRATS: NonNullable<Consultant['type_contrat']>[] = ['interne', 'freelance', 'sous_traitant'];
const NIVEAUX: ConsultantCompetence['niveau_maitrise'][] = ['debutant', 'intermediaire', 'expert'];

type SelectedSkill = {
  competence_id: string;
  niveau_maitrise: ConsultantCompetence['niveau_maitrise'];
  certification: boolean;
  annees_experience: string; // input
};

export default function ConsultantsPage() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<Consultant[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [competences, setCompetences] = useState<Competence[]>([]);

  const [q, setQ] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Consultant | null>(null);

  const [skills, setSkills] = useState<SelectedSkill[]>([]);

  // Sections pliables
  const [addressOpen, setAddressOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(true);

  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    statut: 'disponible' as Consultant['statut'],
    type_contrat: 'interne' as NonNullable<Consultant['type_contrat']>,
    date_entree: '',
    date_sortie: '',

    // Gardés en base pour compatibilité (non affichés)
    tjm: '',
    disponibilite_pct: 100,

    equipe_id: '',

    travail_lundi: true,
    travail_mardi: true,
    travail_mercredi: true,
    travail_jeudi: true,
    travail_vendredi: true,

    adresse_ligne1: '',
    adresse_ligne2: '',
    code_postal: '',
    ville: '',
    pays: 'FR',

    // Position précise (pour carte / trajets plus tard)
    latitude: '',
    longitude: '',

    notes: '',
  });

  const equipeById = useMemo(() => {
    const m = new Map<string, Equipe>();
    equipes.forEach((e) => m.set(e.id, e));
    return m;
  }, [equipes]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [cRes, eRes, compRes] = await Promise.all([
        supabase
          .from('consultants')
          .select(
            `
            id, nom, prenom, email, telephone, statut, type_contrat, date_entree, date_sortie, tjm, disponibilite_pct,
            equipe_id,
            travail_lundi, travail_mardi, travail_mercredi, travail_jeudi, travail_vendredi,
            adresse_ligne1, adresse_ligne2, code_postal, ville, pays, latitude, longitude,
            photo_url, cv_url, notes, created_at, updated_at
          `
          )
          .order('nom', { ascending: true }),
        supabase.from('equipes').select('*').order('nom', { ascending: true }),
        supabase
          .from('competences')
          .select('id, code, nom, description, categorie, niveau_requis, actif, created_at, updated_at')
          .order('nom', { ascending: true }),
      ]);

      if (cRes.error) throw cRes.error;
      if (eRes.error) throw eRes.error;
      if (compRes.error) throw compRes.error;

      setRows((cRes.data || []) as Consultant[]);
      setEquipes((eRes.data || []) as Equipe[]);
      setCompetences((compRes.data || []) as Competence[]);
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) => `${c.nom} ${c.prenom} ${c.email}`.toLowerCase().includes(s));
  }, [rows, q]);

  function resetFormForCreate() {
    setEditing(null);
    setSkills([]);
    setAddressOpen(false);
    setSkillsOpen(true);

    setForm({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      statut: 'disponible',
      type_contrat: 'interne',
      date_entree: '',
      date_sortie: '',

      tjm: '',
      disponibilite_pct: 100,

      equipe_id: '',

      travail_lundi: true,
      travail_mardi: true,
      travail_mercredi: true,
      travail_jeudi: true,
      travail_vendredi: true,

      adresse_ligne1: '',
      adresse_ligne2: '',
      code_postal: '',
      ville: '',
      pays: 'FR',

      latitude: '',
      longitude: '',

      notes: '',
    });
  }

  function openCreate() {
    resetFormForCreate();
    setModalOpen(true);
  }

  async function openEdit(c: Consultant) {
    setError(null);
    setEditing(c);

    setAddressOpen(false);
    setSkillsOpen(true);

    setForm({
      nom: c.nom || '',
      prenom: c.prenom || '',
      email: c.email || '',
      telephone: c.telephone || '',
      statut: c.statut,
      type_contrat: (c.type_contrat || 'interne') as NonNullable<Consultant['type_contrat']>,
      date_entree: c.date_entree || '',
      date_sortie: c.date_sortie || '',

      tjm: c.tjm !== undefined && c.tjm !== null ? String(c.tjm) : '',
      disponibilite_pct: c.disponibilite_pct ?? 100,

      equipe_id: c.equipe_id || '',

      travail_lundi: c.travail_lundi ?? true,
      travail_mardi: c.travail_mardi ?? true,
      travail_mercredi: c.travail_mercredi ?? true,
      travail_jeudi: c.travail_jeudi ?? true,
      travail_vendredi: c.travail_vendredi ?? true,

      adresse_ligne1: (c.adresse_ligne1 || '') as string,
      adresse_ligne2: (c.adresse_ligne2 || '') as string,
      code_postal: (c.code_postal || '') as string,
      ville: (c.ville || '') as string,
      pays: (c.pays || 'FR') as string,

      latitude: c.latitude !== undefined && c.latitude !== null ? String(c.latitude) : '',
      longitude: c.longitude !== undefined && c.longitude !== null ? String(c.longitude) : '',

      notes: (c.notes || '') as string,
    });

    try {
      const sRes = await supabase
        .from('consultant_competences')
        .select('competence_id, niveau_maitrise, certification, annees_experience')
        .eq('consultant_id', c.id);

      if (sRes.error) throw sRes.error;

      const loaded: SelectedSkill[] = (sRes.data || []).map((x: any) => ({
        competence_id: x.competence_id,
        niveau_maitrise: x.niveau_maitrise,
        certification: !!x.certification,
        annees_experience: x.annees_experience !== null && x.annees_experience !== undefined ? String(x.annees_experience) : '',
      }));

      setSkills(loaded);
      setModalOpen(true);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement compétences');
      setSkills([]);
      setModalOpen(true);
    }
  }

  function validate() {
    if (!form.nom.trim()) return 'Nom requis';
    if (!form.prenom.trim()) return 'Prénom requis';
    if (!form.email.trim()) return 'Email requis';

    const lat = form.latitude.trim();
    const lng = form.longitude.trim();
    if ((lat && Number.isNaN(Number(lat))) || (lng && Number.isNaN(Number(lng)))) {
      return 'Latitude/Longitude invalides (nombre attendu)';
    }

    return null;
  }

  function isSkillSelected(competence_id: string) {
    return skills.some((s) => s.competence_id === competence_id);
  }

  function toggleSkill(competence_id: string) {
    setSkills((prev) => {
      const exists = prev.find((s) => s.competence_id === competence_id);
      if (exists) return prev.filter((s) => s.competence_id !== competence_id);
      return [
        ...prev,
        {
          competence_id,
          niveau_maitrise: 'intermediaire',
          certification: false,
          annees_experience: '',
        },
      ];
    });
  }

  function updateSkill(competence_id: string, patch: Partial<SelectedSkill>) {
    setSkills((prev) => prev.map((s) => (s.competence_id === competence_id ? { ...s, ...patch } : s)));
  }

  async function saveSkills(consultantId: string) {
    const del = await supabase.from('consultant_competences').delete().eq('consultant_id', consultantId);
    if (del.error) throw del.error;

    if (skills.length === 0) return;

    const payload = skills.map((s) => ({
      consultant_id: consultantId,
      competence_id: s.competence_id,
      niveau_maitrise: s.niveau_maitrise,
      certification: s.certification,
      annees_experience: s.annees_experience.trim() ? Number(s.annees_experience.trim()) : null,
    }));

    const ins = await supabase.from('consultant_competences').insert(payload);
    if (ins.error) throw ins.error;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError(null);
    setSaving(true);

    const lat = form.latitude.trim();
    const lng = form.longitude.trim();

    const payload: any = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim() || null,
      statut: form.statut,
      type_contrat: form.type_contrat,
      date_entree: form.date_entree || null,
      date_sortie: form.date_sortie || null,

      // Non affichés, mais gardés en base (valeurs par défaut)
      tjm: form.tjm.trim() ? Number(form.tjm.trim()) : null,
      disponibilite_pct: form.disponibilite_pct ?? 100,

      equipe_id: form.equipe_id || null,

      travail_lundi: form.travail_lundi,
      travail_mardi: form.travail_mardi,
      travail_mercredi: form.travail_mercredi,
      travail_jeudi: form.travail_jeudi,
      travail_vendredi: form.travail_vendredi,

      adresse_ligne1: form.adresse_ligne1.trim() || null,
      adresse_ligne2: form.adresse_ligne2.trim() || null,
      code_postal: form.code_postal.trim() || null,
      ville: form.ville.trim() || null,
      pays: form.pays.trim() || null,

      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,

      notes: form.notes.trim() || null,
    };

    try {
      let consultantId = editing?.id;

      if (!editing) {
        const ins = await supabase.from('consultants').insert(payload).select('id').single();
        if (ins.error) throw ins.error;
        consultantId = ins.data.id;
      } else {
        const upd = await supabase.from('consultants').update(payload).eq('id', editing.id);
        if (upd.error) throw upd.error;
        consultantId = editing.id;
      }

      await saveSkills(consultantId!);

      setModalOpen(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const del = await supabase.from('consultants').delete().eq('id', id);
      if (del.error) throw del.error;
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Erreur suppression');
    }
  }

  const dayButtons = [
    { key: 'travail_lundi' as const, label: 'Lun' },
    { key: 'travail_mardi' as const, label: 'Mar' },
    { key: 'travail_mercredi' as const, label: 'Mer' },
    { key: 'travail_jeudi' as const, label: 'Jeu' },
    { key: 'travail_vendredi' as const, label: 'Ven' },
  ];

  function openMapPreview() {
    const lat = form.latitude.trim();
    const lng = form.longitude.trim();
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Consultants</h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Gestion : équipe, jours travaillés (lun→ven), adresse (avec position), compétences.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ backgroundColor: colors.success, color: '#ffffff' }}
            >
              + Nouveau consultant
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Recherche
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              placeholder="Nom, prénom, email…"
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.danger, color: colors.danger }}>
              {error}
            </div>
          ) : null}
        </div>

        {/* Tableau (sans Dispo / TJM) */}
        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
          {loading ? (
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Chargement…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    <th className="px-3 py-2 text-left font-medium">Identité</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Équipe</th>
                    <th className="px-3 py-2 text-left font-medium">Statut</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const eq = c.equipe_id ? equipeById.get(c.equipe_id) : null;
                    return (
                      <tr key={c.id} className="border-b" style={{ borderColor: colors.border }}>
                        <td className="px-3 py-2 font-medium">
                          {c.nom} {c.prenom}
                        </td>
                        <td className="px-3 py-2">{c.email}</td>
                        <td className="px-3 py-2">
                          {eq ? (
                            <span className="inline-flex items-center gap-2">
                              <span>{eq.nom}</span>
                              {eq.ressource_generique ? (
                                <span className="inline-flex rounded-full border px-2 py-1 text-xs" style={{ borderColor: colors.accent, color: colors.accent }}>
                                  Générique
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2">{c.statut}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void openEdit(c)}
                              className="rounded-lg border px-3 py-1.5 text-xs"
                              style={{ borderColor: colors.border, color: colors.text }}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(c.id)}
                              className="rounded-lg border px-3 py-1.5 text-xs"
                              style={{ borderColor: colors.danger, color: colors.danger }}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={5}>
                        Aucun consultant.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal
          open={modalOpen}
          title={editing ? 'Modifier un consultant' : 'Nouveau consultant'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: colors.border, color: colors.text }}
                disabled={saving}
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={{ backgroundColor: colors.success, color: '#ffffff', opacity: saving ? 0.8 : 1 }}
                disabled={saving}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          {/* Scroll interne pour éviter une modale “trop longue” */}
          <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
            {/* Identité */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Nom
                </label>
                <input
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Prénom
                </label>
                <input
                  value={form.prenom}
                  onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Téléphone
                </label>
                <input
                  value={form.telephone}
                  onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                />
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Équipe
                </label>
                <select
                  value={form.equipe_id}
                  onChange={(e) => setForm((f) => ({ ...f, equipe_id: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                >
                  <option value="">—</option>
                  {equipes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom} {e.ressource_generique ? '(Générique)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Statut
                </label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as Consultant['statut'] }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                >
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                  Type de contrat
                </label>
                <select
                  value={form.type_contrat}
                  onChange={(e) => setForm((f) => ({ ...f, type_contrat: e.target.value as NonNullable<Consultant['type_contrat']> }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                >
                  {CONTRATS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Boulier jours travaillés */}
            <div className="rounded-xl border p-3" style={{ borderColor: colors.border, backgroundColor: colors.sidebarHover }}>
              <div className="text-sm font-medium" style={{ color: colors.text }}>
                Jours travaillés (Lundi → Vendredi)
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {dayButtons.map((d) => {
                  const active = form[d.key];
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, [d.key]: !f[d.key] } as any))}
                      className="rounded-full px-3 py-1 text-sm border"
                      style={{
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accent : colors.card,
                        color: active ? '#ffffff' : colors.text,
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adresse (pliable) */}
            <div className="rounded-xl border" style={{ borderColor: colors.border }}>
              <button
                type="button"
                onClick={() => setAddressOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-3"
                style={{ backgroundColor: colors.sidebarHover, color: colors.text }}
              >
                <span className="text-sm font-medium">Adresse & position</span>
                <span className="text-sm">{addressOpen ? '▲' : '▼'}</span>
              </button>

              {addressOpen ? (
                <div className="p-3 space-y-3" style={{ backgroundColor: colors.card }}>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    Pour le calcul de trajets plus tard, l’idéal est d’enregistrer une position précise (Latitude / Longitude).
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        Adresse ligne 1
                      </label>
                      <input
                        value={form.adresse_ligne1}
                        onChange={(e) => setForm((f) => ({ ...f, adresse_ligne1: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        Adresse ligne 2
                      </label>
                      <input
                        value={form.adresse_ligne2}
                        onChange={(e) => setForm((f) => ({ ...f, adresse_ligne2: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        Code postal
                      </label>
                      <input
                        value={form.code_postal}
                        onChange={(e) => setForm((f) => ({ ...f, code_postal: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        Ville
                      </label>
                      <input
                        value={form.ville}
                        onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        Pays
                      </label>
                      <input
                        value={form.pays}
                        onChange={(e) => setForm((f) => ({ ...f, pays: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                        placeholder="FR"
                      />
                    </div>

                    <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Latitude
                        </label>
                        <input
                          value={form.latitude}
                          onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                          placeholder="Ex : 48.8566"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Longitude
                        </label>
                        <input
                          value={form.longitude}
                          onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                          placeholder="Ex : 2.3522"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={openMapPreview}
                        className="rounded-lg px-3 py-2 text-sm font-medium"
                        style={{
                          backgroundColor: form.latitude.trim() && form.longitude.trim() ? colors.accent : colors.border,
                          color: '#ffffff',
                          opacity: form.latitude.trim() && form.longitude.trim() ? 1 : 0.7,
                        }}
                        disabled={!form.latitude.trim() || !form.longitude.trim()}
                        title="Ouvre un aperçu dans Google Maps"
                      >
                        Voir sur la carte
                      </button>

                      <div className="text-xs flex items-center" style={{ color: colors.textSecondary }}>
                        (La visualisation “dans l’app” se fera lors de l’intégration carte.)
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Compétences (pliable) */}
            <div className="rounded-xl border" style={{ borderColor: colors.border }}>
              <button
                type="button"
                onClick={() => setSkillsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-3"
                style={{ backgroundColor: colors.sidebarHover, color: colors.text }}
              >
                <span className="text-sm font-medium">Compétences</span>
                <span className="text-sm">{skillsOpen ? '▲' : '▼'}</span>
              </button>

              {skillsOpen ? (
                <div className="p-3" style={{ backgroundColor: colors.card }}>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    Cochez les compétences, puis définissez niveau / certification / années d’expérience.
                  </div>

                  <div className="mt-3 max-h-64 overflow-auto rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: colors.border }}>
                          <th className="px-3 py-2 text-left font-medium">Actif</th>
                          <th className="px-3 py-2 text-left font-medium">Compétence</th>
                          <th className="px-3 py-2 text-left font-medium">Niveau</th>
                          <th className="px-3 py-2 text-left font-medium">Certif</th>
                          <th className="px-3 py-2 text-left font-medium">Années</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competences
                          .filter((c) => c.actif)
                          .map((c) => {
                            const selected = isSkillSelected(c.id);
                            const current = skills.find((s) => s.competence_id === c.id) || null;

                            return (
                              <tr key={c.id} className="border-b" style={{ borderColor: colors.border }}>
                                <td className="px-3 py-2">
                                  <input type="checkbox" checked={selected} onChange={() => toggleSkill(c.id)} />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-medium">{c.nom}</div>
                                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                                    {c.code} — {c.categorie}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    disabled={!selected}
                                    value={current?.niveau_maitrise || 'intermediaire'}
                                    onChange={(e) => updateSkill(c.id, { niveau_maitrise: e.target.value as any })}
                                    className="w-full rounded-lg border px-2 py-1 text-sm"
                                    style={{
                                      backgroundColor: selected ? colors.sidebarHover : colors.card,
                                      borderColor: colors.border,
                                      color: colors.text,
                                      opacity: selected ? 1 : 0.6,
                                    }}
                                  >
                                    {NIVEAUX.map((n) => (
                                      <option key={n} value={n}>
                                        {n}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    disabled={!selected}
                                    checked={current?.certification || false}
                                    onChange={(e) => updateSkill(c.id, { certification: e.target.checked })}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    disabled={!selected}
                                    value={current?.annees_experience || ''}
                                    onChange={(e) => updateSkill(c.id, { annees_experience: e.target.value })}
                                    className="w-24 rounded-lg border px-2 py-1 text-sm"
                                    style={{
                                      backgroundColor: selected ? colors.sidebarHover : colors.card,
                                      borderColor: colors.border,
                                      color: colors.text,
                                      opacity: selected ? 1 : 0.6,
                                    }}
                                    placeholder="Ex : 3"
                                  />
                                </td>
                              </tr>
                            );
                          })}

                        {competences.filter((c) => c.actif).length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={5}>
                              Aucune compétence active.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                rows={4}
              />
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
