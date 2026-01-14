'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Badge, formatCurrencyEUR, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { Projet, ProjetPriorite, ProjetStatut } from '@/types/clients';

type EditState = {
  id: string;
  numero_projet: string;
  titre: string;
  description: string;
  statut: ProjetStatut;
  priorite: ProjetPriorite | '';
  budget_total: string;
  date_debut_prevue: string;
  date_fin_prevue: string;
  dp_affecte_id: string;
};

export default function ClientProjets(props: { clientId: string }) {
  const ui = useClientUi();
  const router = useRouter();

  const [items, setItems] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [statut, setStatut] = useState<string>('all');
  const [edit, setEdit] = useState<EditState | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('projets')
        .select('*')
        .eq('client_id', props.clientId)
        .order('created_at', { ascending: false });

      if (e) throw e;
      setItems((data ?? []) as Projet[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.clientId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((p) => {
      const okStatut = statut === 'all' ? true : p.statut === statut;
      if (!okStatut) return false;
      if (!s) return true;
      const blob = `${p.numero_projet ?? ''} ${p.titre ?? ''} ${p.description ?? ''}`.toLowerCase();
      return blob.includes(s);
    });
  }, [items, q, statut]);

  const statusTone = (st: string) => {
    if (st === 'en_cours') return 'accent';
    if (st === 'affecte') return 'warning';
    if (st === 'termine' || st === 'cloture') return 'success';
    return 'neutral';
  };

  const statButtons = [
    { label: 'Tous', value: 'all' },
    { label: 'En cours', value: 'en_cours' },
    { label: 'Affecte', value: 'affecte' },
    { label: 'Termine', value: 'termine' },
    { label: 'Cloture', value: 'cloture' },
    { label: 'Bannette', value: 'bannette' }
  ];

  const stats = useMemo(() => {
    const total = items.length;
    const enCours = items.filter((p) => p.statut === 'en_cours').length;
    const affecte = items.filter((p) => p.statut === 'affecte').length;
    const termine = items.filter((p) => p.statut === 'termine' || p.statut === 'cloture').length;
    return { total, enCours, affecte, termine };
  }, [items]);

  const startEdit = (p: Projet) => {
    setEdit({
      id: p.id,
      numero_projet: p.numero_projet ?? '',
      titre: p.titre ?? '',
      description: p.description ?? '',
      statut: p.statut ?? 'bannette',
      priorite: p.priorite ?? '',
      budget_total: p.budget_total != null ? String(p.budget_total) : '',
      date_debut_prevue: p.date_debut_prevue ?? '',
      date_fin_prevue: p.date_fin_prevue ?? '',
      dp_affecte_id: p.dp_affecte_id ?? ''
    });
  };

  const save = async () => {
    if (!edit) return;
    setError(null);
    setSavingId(edit.id);
    try {
      const payload = {
        numero_projet: edit.numero_projet.trim(),
        titre: edit.titre.trim(),
        description: edit.description.trim() || null,
        statut: edit.statut,
        priorite: edit.priorite || null,
        budget_total: edit.budget_total.trim() ? Number(edit.budget_total) : null,
        date_debut_prevue: edit.date_debut_prevue || null,
        date_fin_prevue: edit.date_fin_prevue || null,
        dp_affecte_id: edit.dp_affecte_id.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error: e1 } = await supabase.from('projets').update(payload).eq('id', edit.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'projet',
        titre: 'Projet modifie',
        description: payload.titre,
        metadata: { projet_id: edit.id, ...payload }
      });

      setEdit(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-3 sm:p-0">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="p-4" style={ui.cardStyle}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {statButtons.map((btn) => (
                  <button
                    key={btn.value}
                    type="button"
                    className="px-3 py-2 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: statut === btn.value ? ui.c.accent : ui.c.bg,
                      color: statut === btn.value ? 'white' : ui.c.muted,
                      border: `1px solid ${ui.c.border}`
                    }}
                    onClick={() => setStatut(btn.value)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}` }}>
                <Search size={16} style={{ color: ui.c.muted }} />
                <input
                  className="bg-transparent outline-none text-sm"
                  style={{ color: ui.c.text }}
                  placeholder="Rechercher un projet..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${ui.c.border}` }}>
                    <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Numero</th>
                    <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Titre</th>
                    <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Statut</th>
                    <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Budget</th>
                    <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Debut</th>
                    <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Fin</th>
                    <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>DP</th>
                    <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: `1px solid ${ui.c.border}`, cursor: 'pointer' }}
                      onClick={() => router.push(`/gestion-projet?projet_id=${p.id}`)}
                    >
                      <td className="py-3 px-3 text-sm font-semibold">{p.numero_projet}</td>
                      <td className="py-3 px-3 text-sm">{p.titre}</td>
                      <td className="py-3 px-3">
                        <Badge label={p.statut} tone={statusTone(p.statut)} />
                      </td>
                      <td className="py-3 px-3 text-right text-sm" style={{ color: ui.c.accent }}>
                        {p.budget_total != null ? formatCurrencyEUR(p.budget_total) : '-'}
                      </td>
                      <td className="py-3 px-3 text-sm" style={{ color: ui.c.muted }}>
                        {formatDateFR(p.date_debut_prevue)}
                      </td>
                      <td className="py-3 px-3 text-sm" style={{ color: ui.c.muted }}>
                        {formatDateFR(p.date_fin_prevue)}
                      </td>
                      <td className="py-3 px-3 text-sm" style={{ color: ui.c.muted }}>
                        {p.dp_affecte_id ?? '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          className="px-3 py-1 text-xs"
                          style={ui.btnStyle}
                          onClick={(event) => {
                            event.stopPropagation();
                            startEdit(p);
                          }}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
            {!loading && filtered.length === 0 ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Aucun projet.</div> : null}

            {edit ? (
              <div className="mt-5 p-4 rounded-xl" style={{ border: `1px solid ${ui.c.border}`, backgroundColor: ui.editBg }}>
                <div className="font-semibold">Modifier le projet</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Numero</div>
                    <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.numero_projet} onChange={(e) => setEdit((s) => (s ? { ...s, numero_projet: e.target.value } : s))} />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Titre</div>
                    <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.titre} onChange={(e) => setEdit((s) => (s ? { ...s, titre: e.target.value } : s))} />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Statut</div>
                    <select
                      className="mt-1 w-full px-3 py-2"
                      style={{ ...ui.inputStyle, backgroundColor: ui.c.bg, color: ui.c.text }}
                      value={edit.statut}
                      onChange={(e) => setEdit((s) => (s ? { ...s, statut: e.target.value as ProjetStatut } : s))}
                    >
                      <option value="bannette">bannette</option>
                      <option value="affecte">affecte</option>
                      <option value="en_cours">en_cours</option>
                      <option value="termine">termine</option>
                      <option value="cloture">cloture</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Priorite</div>
                    <select
                      className="mt-1 w-full px-3 py-2"
                      style={{ ...ui.inputStyle, backgroundColor: ui.c.bg, color: ui.c.text }}
                      value={edit.priorite}
                      onChange={(e) => setEdit((s) => (s ? { ...s, priorite: e.target.value as ProjetPriorite } : s))}
                    >
                      <option value="">-</option>
                      <option value="basse">basse</option>
                      <option value="normale">normale</option>
                      <option value="haute">haute</option>
                      <option value="urgente">urgente</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Budget total</div>
                    <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.budget_total} onChange={(e) => setEdit((s) => (s ? { ...s, budget_total: e.target.value } : s))} />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>DP affecte</div>
                    <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.dp_affecte_id} onChange={(e) => setEdit((s) => (s ? { ...s, dp_affecte_id: e.target.value } : s))} />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Debut prevu</div>
                    <input type="date" className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.date_debut_prevue} onChange={(e) => setEdit((s) => (s ? { ...s, date_debut_prevue: e.target.value } : s))} />
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: ui.c.muted }}>Fin prevue</div>
                    <input type="date" className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.date_fin_prevue} onChange={(e) => setEdit((s) => (s ? { ...s, date_fin_prevue: e.target.value } : s))} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm" style={{ color: ui.c.muted }}>Description</div>
                    <textarea className="mt-1 w-full px-3 py-2 min-h-[120px]" style={ui.inputStyle} value={edit.description} onChange={(e) => setEdit((s) => (s ? { ...s, description: e.target.value } : s))} />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className="px-4 py-2 text-sm" style={ui.btnStyle} onClick={() => setEdit(null)} disabled={!!savingId}>
                    Annuler
                  </button>
                  <button type="button" className="px-4 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={() => void save()} disabled={!!savingId}>
                    {savingId ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full lg:w-72">
          <div className="p-4" style={ui.cardStyle}>
            <div className="font-semibold">Statistiques</div>
            <div className="mt-4 space-y-3">
              <StatItem label="Total" value={stats.total} color={ui.c.text} />
              <StatItem label="En cours" value={stats.enCours} color={ui.c.accent} />
              <StatItem label="Affecte" value={stats.affecte} color={ui.c.warning} />
              <StatItem label="Termine" value={stats.termine} color={ui.c.success} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  const ui = useClientUi();
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: ui.c.bg }}>
      <span className="text-sm" style={{ color: ui.c.muted }}>{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}
