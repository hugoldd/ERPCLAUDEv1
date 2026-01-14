'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge, formatDateFR, formatCurrencyEUR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { Commande, CommandeStatut } from '@/types/clients';

type EditState = {
  id: string;
  numero_commande: string;
  date_commande: string;
  montant_total: string;
  statut: CommandeStatut;
  source: string;
};

export default function ClientCommandes(props: { clientId: string }) {
  const ui = useClientUi();

  const [items, setItems] = useState<Commande[]>([]);
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
        .from('commandes')
        .select('*')
        .eq('client_id', props.clientId)
        .order('date_commande', { ascending: false });

      if (e) throw e;
      setItems((data ?? []) as Commande[]);
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
    return items.filter((c) => {
      const okStatut = statut === 'all' ? true : c.statut === statut;
      if (!okStatut) return false;
      if (!s) return true;
      return `${c.numero_commande ?? ''} ${c.source ?? ''}`.toLowerCase().includes(s);
    });
  }, [items, q, statut]);

  const tone = (st: string) => {
    if (st === 'transformee') return 'success';
    if (st === 'annulee') return 'danger';
    return 'warning';
  };

  const statusButtons = [
    { label: 'Toutes', value: 'all' },
    { label: 'Recue', value: 'recue' },
    { label: 'Transformee', value: 'transformee' },
    { label: 'Annulee', value: 'annulee' }
  ];

  const totalMontant = useMemo(() => {
    return filtered.reduce((acc, c) => acc + (typeof c.montant_total === 'number' ? c.montant_total : 0), 0);
  }, [filtered]);

  const startEdit = (c: Commande) => {
    setEdit({
      id: c.id,
      numero_commande: c.numero_commande ?? '',
      date_commande: c.date_commande ?? '',
      montant_total: c.montant_total != null ? String(c.montant_total) : '',
      statut: c.statut ?? 'recue',
      source: c.source ?? ''
    });
  };

  const save = async () => {
    if (!edit) return;
    setError(null);
    setSavingId(edit.id);
    try {
      const payload = {
        numero_commande: edit.numero_commande.trim(),
        date_commande: edit.date_commande,
        montant_total: edit.montant_total.trim() ? Number(edit.montant_total) : null,
        statut: edit.statut,
        source: edit.source.trim() || null
      };

      const { error: e1 } = await supabase.from('commandes').update(payload).eq('id', edit.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'commande',
        titre: 'Commande modifiee',
        description: payload.numero_commande,
        metadata: { commande_id: edit.id, ...payload }
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
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusButtons.map((btn) => (
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
              placeholder="Rechercher une commande..."
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
                <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Date</th>
                <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Montant</th>
                <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Source</th>
                <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Statut</th>
                <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${ui.c.border}` }}>
                  <td className="py-3 px-3 text-sm font-semibold">{c.numero_commande}</td>
                  <td className="py-3 px-3 text-sm" style={{ color: ui.c.muted }}>{formatDateFR(c.date_commande)}</td>
                  <td className="py-3 px-3 text-right text-sm" style={{ color: ui.c.accent }}>
                    {formatCurrencyEUR(c.montant_total)}
                  </td>
                  <td className="py-3 px-3 text-sm">{c.source ?? '-'}</td>
                  <td className="py-3 px-3">
                    <Badge label={c.statut} tone={tone(c.statut)} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button type="button" className="px-3 py-1 text-xs" style={ui.btnStyle} onClick={() => startEdit(c)}>
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
        {!loading && filtered.length === 0 ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Aucune commande.</div> : null}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm" style={{ color: ui.c.muted }}>
            {filtered.length} commande(s)
          </div>
          <div className="text-sm" style={{ color: ui.c.accent }}>
            Total: {formatCurrencyEUR(totalMontant)}
          </div>
        </div>

        {edit ? (
          <div className="mt-5 p-4 rounded-xl" style={{ border: `1px solid ${ui.c.border}`, backgroundColor: ui.editBg }}>
            <div className="font-semibold">Modifier la commande</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Numero</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.numero_commande} onChange={(e) => setEdit((s) => (s ? { ...s, numero_commande: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Date</div>
                <input type="date" className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.date_commande} onChange={(e) => setEdit((s) => (s ? { ...s, date_commande: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Montant</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.montant_total} onChange={(e) => setEdit((s) => (s ? { ...s, montant_total: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Statut</div>
                <select
                  className="mt-1 w-full px-3 py-2"
                  style={{ ...ui.inputStyle, backgroundColor: ui.c.bg, color: ui.c.text }}
                  value={edit.statut}
                  onChange={(e) => setEdit((s) => (s ? { ...s, statut: e.target.value as CommandeStatut } : s))}
                >
                  <option value="recue">recue</option>
                  <option value="transformee">transformee</option>
                  <option value="annulee">annulee</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm" style={{ color: ui.c.muted }}>Source</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.source} onChange={(e) => setEdit((s) => (s ? { ...s, source: e.target.value } : s))} />
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
  );
}
