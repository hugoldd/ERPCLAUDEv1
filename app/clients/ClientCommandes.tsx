'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge, SectionHeader, formatDateFR, formatCurrencyEUR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { Commande } from '@/types/clients';

export default function ClientCommandes(props: { clientId: string }) {
  const ui = useClientUi();

  const [items, setItems] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [statut, setStatut] = useState<string>('all');

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

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Commandes"
          subtitle="Historique des commandes du client"
          right={
            <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="px-3 py-2 sm:col-span-2"
            style={ui.inputStyle}
            placeholder="Rechercher (numéro, source)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
          />
          <select className="px-3 py-2" style={ui.inputStyle} value={statut} onChange={(e) => setStatut(e.target.value)} disabled={loading}>
            <option value="all">Tous statuts</option>
            <option value="recue">recue</option>
            <option value="transformee">transformee</option>
            <option value="annulee">annulee</option>
          </select>
        </div>

        {loading ? <div className="mt-4 text-sm opacity-80">Chargement...</div> : null}
        {!loading && filtered.length === 0 ? <div className="mt-4 text-sm opacity-80">Aucune commande.</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-semibold">{c.numero_commande}</div>
                  <div className="mt-1 text-sm opacity-80">
                    Date : {formatDateFR(c.date_commande)} · Montant : {formatCurrencyEUR(c.montant_total)} · Source : {c.source ?? '—'}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Badge label={c.statut} tone={tone(c.statut)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
