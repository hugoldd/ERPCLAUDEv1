'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Modal from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { supabase, Equipe } from '@/lib/supabase';

export default function EquipesPage() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<Equipe[]>([]);
  const [q, setQ] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);

  const [form, setForm] = useState({
    nom: '',
    description: '',
    actif: true,
    ressource_generique: false,
  });

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await supabase.from('equipes').select('*').order('nom', { ascending: true });
      if (res.error) throw res.error;
      setRows((res.data || []) as Equipe[]);
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement des équipes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.nom} ${(r.description || '')}`.toLowerCase().includes(s));
  }, [rows, q]);

  function openCreate() {
    setEditing(null);
    setForm({ nom: '', description: '', actif: true, ressource_generique: false });
    setModalOpen(true);
  }

  function openEdit(r: Equipe) {
    setEditing(r);
    setForm({
      nom: r.nom,
      description: (r.description || '') as string,
      actif: r.actif,
      ressource_generique: r.ressource_generique,
    });
    setModalOpen(true);
  }

  function validate() {
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

    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      actif: form.actif,
      ressource_generique: form.ressource_generique,
    };

    try {
      if (!editing) {
        const ins = await supabase.from('equipes').insert(payload);
        if (ins.error) throw ins.error;
      } else {
        const upd = await supabase.from('equipes').update(payload).eq('id', editing.id);
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
      const del = await supabase.from('equipes').delete().eq('id', id);
      if (del.error) throw del.error;
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erreur suppression');
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Équipes</h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Paramétrage des équipes. Une équipe peut être marquée “ressource générique” (placeholder de planning).
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ backgroundColor: colors.success, color: '#ffffff' }}
            >
              + Nouvelle équipe
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
              placeholder="Nom, description…"
            />
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
                    <th className="px-3 py-2 text-left font-medium">Nom</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-left font-medium">Active</th>
                    <th className="px-3 py-2 text-left font-medium">Ressource générique</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b" style={{ borderColor: colors.border }}>
                      <td className="px-3 py-2 font-medium">{r.nom}</td>
                      <td className="px-3 py-2">{r.description || '—'}</td>
                      <td className="px-3 py-2">{r.actif ? 'Oui' : 'Non'}</td>
                      <td className="px-3 py-2">
                        {r.ressource_generique ? (
                          <span className="inline-flex rounded-full border px-2 py-1 text-xs" style={{ borderColor: colors.accent, color: colors.accent }}>
                            Oui
                          </span>
                        ) : (
                          'Non'
                        )}
                      </td>
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
                  ))}

                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={5}>
                        Aucune équipe.
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
          title={editing ? 'Modifier une équipe' : 'Nouvelle équipe'}
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
          <div className="grid gap-3">
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
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                rows={3}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.actif}
                  onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
                />
                <span style={{ color: colors.text }}>Équipe active</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ressource_generique}
                  onChange={(e) => setForm((f) => ({ ...f, ressource_generique: e.target.checked }))}
                />
                <span style={{ color: colors.text }}>Ressource générique</span>
              </label>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
