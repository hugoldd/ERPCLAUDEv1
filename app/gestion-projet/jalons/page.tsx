'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { supabase, Projet, JalonProjet, JalonType, JalonStatut } from '@/lib/supabase';

const TYPES: JalonType[] = ['jalon', 'phase', 'livrable'];
const STATUTS: JalonStatut[] = ['a_venir', 'en_cours', 'termine', 'retard'];

export default function JalonsPage() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projets, setProjets] = useState<Projet[]>([]);
  const [rows, setRows] = useState<JalonProjet[]>([]);
  const [filterProjetId, setFilterProjetId] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JalonProjet | null>(null);

  const [form, setForm] = useState({
    projet_id: '',
    nom: '',
    date_prevue: '',
    date_reelle: '',
    type: 'jalon' as JalonType,
    statut: 'a_venir' as JalonStatut,
  });

  const projetsById = useMemo(() => {
    const m = new Map<string, Projet>();
    projets.forEach((p) => m.set(p.id, p));
    return m;
  }, [projets]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [pRes, jRes] = await Promise.all([
        supabase
          .from('projets')
          .select('id, numero_projet, commande_id, client_id, titre, statut, date_creation, date_affectation, date_debut_prevue, date_fin_prevue, priorite, budget_total, notes_affectation, charge_totale_estimee_jours')
          .order('date_creation', { ascending: false }),
        supabase.from('jalons_projet').select('*').order('date_prevue', { ascending: true }),
      ]);

      if (pRes.error) throw pRes.error;
      if (jRes.error) throw jRes.error;

      setProjets((pRes.data || []) as Projet[]);
      setRows((jRes.data || []) as JalonProjet[]);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!filterProjetId) return rows;
    return rows.filter((r) => r.projet_id === filterProjetId);
  }, [rows, filterProjetId]);

  function openCreate() {
    setEditing(null);
    setForm({
      projet_id: projets[0]?.id || '',
      nom: '',
      date_prevue: '',
      date_reelle: '',
      type: 'jalon',
      statut: 'a_venir',
    });
    setModalOpen(true);
  }

  function openEdit(r: JalonProjet) {
    setEditing(r);
    setForm({
      projet_id: r.projet_id,
      nom: r.nom,
      date_prevue: r.date_prevue || '',
      date_reelle: r.date_reelle || '',
      type: r.type,
      statut: r.statut,
    });
    setModalOpen(true);
  }

  function validate() {
    if (!form.projet_id) return 'Projet requis';
    if (!form.nom.trim()) return 'Nom requis';
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setError(null);

    try {
      if (!editing) {
        const ins = await supabase.from('jalons_projet').insert({
          projet_id: form.projet_id,
          nom: form.nom.trim(),
          date_prevue: form.date_prevue || null,
          date_reelle: form.date_reelle || null,
          type: form.type,
          statut: form.statut,
        });
        if (ins.error) throw ins.error;
      } else {
        const upd = await supabase
          .from('jalons_projet')
          .update({
            projet_id: form.projet_id,
            nom: form.nom.trim(),
            date_prevue: form.date_prevue || null,
            date_reelle: form.date_reelle || null,
            type: form.type,
            statut: form.statut,
          })
          .eq('id', editing.id);
        if (upd.error) throw upd.error;
      }

      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erreur enregistrement');
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const del = await supabase.from('jalons_projet').delete().eq('id', id);
      if (del.error) throw del.error;
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erreur suppression');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Jalons projet</h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              CRUD : jalons / phases / livrables (README).
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: colors.success, color: '#ffffff' }}
          >
            + Nouveau jalon
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Projet
            </label>
            <select
              value={filterProjetId}
              onChange={(e) => setFilterProjetId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              <option value="">Tous</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero_projet} — {p.titre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.danger, color: colors.danger }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
        {loading ? (
          <div className="text-sm" style={{ color: colors.textSecondary }}>
            Chargement…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: colors.border }}>
                  <th className="px-3 py-2 text-left font-medium">Projet</th>
                  <th className="px-3 py-2 text-left font-medium">Nom</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Statut</th>
                  <th className="px-3 py-2 text-left font-medium">Prévue</th>
                  <th className="px-3 py-2 text-left font-medium">Réelle</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const p = projetsById.get(r.projet_id);
                  return (
                    <tr key={r.id} className="border-b" style={{ borderColor: colors.border }}>
                      <td className="px-3 py-2">{p ? `${p.numero_projet} — ${p.titre}` : r.projet_id}</td>
                      <td className="px-3 py-2 font-medium">{r.nom}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.statut}</td>
                      <td className="px-3 py-2">{r.date_prevue || '—'}</td>
                      <td className="px-3 py-2">{r.date_reelle || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded-lg border px-3 py-1.5 text-xs"
                            style={{ borderColor: colors.border, color: colors.text }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(r.id)}
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
                    <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={7}>
                      Aucun enregistrement.
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
        title={editing ? 'Modifier un jalon' : 'Nouveau jalon'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={submit}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ backgroundColor: colors.success, color: '#ffffff' }}
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Projet
            </label>
            <select
              value={form.projet_id}
              onChange={(e) => setForm((f) => ({ ...f, projet_id: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              <option value="">—</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero_projet} — {p.titre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Nom
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              placeholder="Ex : Kickoff, Phase 1, Livraison V1…"
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as JalonType }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
              onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as JalonStatut }))}
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
              Date prévue
            </label>
            <input
              type="date"
              value={form.date_prevue}
              onChange={(e) => setForm((f) => ({ ...f, date_prevue: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Date réelle
            </label>
            <input
              type="date"
              value={form.date_reelle}
              onChange={(e) => setForm((f) => ({ ...f, date_reelle: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
