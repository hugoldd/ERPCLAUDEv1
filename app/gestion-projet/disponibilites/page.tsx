'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { supabase, Consultant, DisponibiliteConsultant, DisponibiliteType } from '@/lib/supabase';

const TYPES: DisponibiliteType[] = ['conges', 'formation', 'inter_contrat', 'indisponible'];

function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export default function DisponibilitesPage() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [rows, setRows] = useState<DisponibiliteConsultant[]>([]);

  const [filterConsultantId, setFilterConsultantId] = useState('');
  const [filterType, setFilterType] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DisponibiliteConsultant | null>(null);

  const [form, setForm] = useState({
    consultant_id: '',
    date_debut: '',
    date_fin: '',
    type: 'conges' as DisponibiliteType,
    pourcentage: 100,
    motif: '',
  });

  const consultantsById = useMemo(() => {
    const m = new Map<string, Consultant>();
    consultants.forEach((c) => m.set(c.id, c));
    return m;
  }, [consultants]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [cRes, dRes] = await Promise.all([
        supabase
          .from('consultants')
          .select('id, nom, prenom, email, telephone, statut, type_contrat, date_entree, date_sortie, tjm, disponibilite_pct, photo_url, cv_url, notes, created_at, updated_at')
          .order('nom', { ascending: true }),
        supabase.from('disponibilites_consultants').select('*').order('date_debut', { ascending: false }),
      ]);

      if (cRes.error) throw cRes.error;
      if (dRes.error) throw dRes.error;

      setConsultants((cRes.data || []) as Consultant[]);
      setRows((dRes.data || []) as DisponibiliteConsultant[]);
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
    return rows.filter((r) => {
      if (filterConsultantId && r.consultant_id !== filterConsultantId) return false;
      if (filterType && r.type !== filterType) return false;
      return true;
    });
  }, [rows, filterConsultantId, filterType]);

  function openCreate() {
    setEditing(null);
    setForm({
      consultant_id: consultants[0]?.id || '',
      date_debut: '',
      date_fin: '',
      type: 'conges',
      pourcentage: 100,
      motif: '',
    });
    setModalOpen(true);
  }

  function openEdit(r: DisponibiliteConsultant) {
    setEditing(r);
    setForm({
      consultant_id: r.consultant_id,
      date_debut: r.date_debut,
      date_fin: r.date_fin,
      type: r.type,
      pourcentage: r.pourcentage,
      motif: r.motif || '',
    });
    setModalOpen(true);
  }

  function validate() {
    if (!form.consultant_id) return 'Consultant requis';
    if (!form.date_debut) return 'Date début requise';
    if (!form.date_fin) return 'Date fin requise';
    if (parseISODate(form.date_fin) < parseISODate(form.date_debut)) return 'Dates incohérentes';
    if (form.pourcentage < 0 || form.pourcentage > 100) return 'Pourcentage invalide (0..100)';
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
        const ins = await supabase.from('disponibilites_consultants').insert({
          consultant_id: form.consultant_id,
          date_debut: form.date_debut,
          date_fin: form.date_fin,
          type: form.type,
          pourcentage: form.pourcentage,
          motif: form.motif || null,
        });
        if (ins.error) throw ins.error;
      } else {
        const upd = await supabase
          .from('disponibilites_consultants')
          .update({
            consultant_id: form.consultant_id,
            date_debut: form.date_debut,
            date_fin: form.date_fin,
            type: form.type,
            pourcentage: form.pourcentage,
            motif: form.motif || null,
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
      const del = await supabase.from('disponibilites_consultants').delete().eq('id', id);
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
            <h1 className="text-xl font-semibold">Disponibilités</h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              CRUD : congés, formation, inter-contrat, indisponible (README).
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: colors.success, color: '#ffffff' }}
          >
            + Déclarer une indisponibilité
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Consultant
            </label>
            <select
              value={filterConsultantId}
              onChange={(e) => setFilterConsultantId(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              <option value="">Tous</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.prenom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              <option value="">Tous</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
                  <th className="px-3 py-2 text-left font-medium">Consultant</th>
                  <th className="px-3 py-2 text-left font-medium">Période</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">% indispo</th>
                  <th className="px-3 py-2 text-left font-medium">Motif</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const c = consultantsById.get(r.consultant_id);
                  return (
                    <tr key={r.id} className="border-b" style={{ borderColor: colors.border }}>
                      <td className="px-3 py-2">{c ? `${c.nom} ${c.prenom}` : r.consultant_id}</td>
                      <td className="px-3 py-2">
                        {r.date_debut} → {r.date_fin}
                      </td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.pourcentage}%</td>
                      <td className="px-3 py-2">{r.motif || '—'}</td>
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
                    <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={6}>
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
        title={editing ? 'Modifier une disponibilité' : 'Nouvelle disponibilité'}
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
          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Consultant
            </label>
            <select
              value={form.consultant_id}
              onChange={(e) => setForm((f) => ({ ...f, consultant_id: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              <option value="">—</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} {c.prenom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DisponibiliteType }))}
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
              Date début
            </label>
            <input
              type="date"
              value={form.date_debut}
              onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Date fin
            </label>
            <input
              type="date"
              value={form.date_fin}
              onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              % d’indisponibilité
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.pourcentage}
              onChange={(e) => setForm((f) => ({ ...f, pourcentage: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Motif
            </label>
            <textarea
              value={form.motif}
              onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
