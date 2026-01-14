'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge, SectionHeader, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { Projet } from '@/types/clients';

export default function ClientProjets(props: { clientId: string }) {
  const ui = useClientUi();

  const [items, setItems] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [statut, setStatut] = useState<string>('all');

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
      const okStatut = statut === 'all' ? true : (p.statut === statut);
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

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Projets"
          subtitle="Liste des projets associés au client"
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
            placeholder="Rechercher (numéro, titre, description)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
          />
          <select className="px-3 py-2" style={ui.inputStyle} value={statut} onChange={(e) => setStatut(e.target.value)} disabled={loading}>
            <option value="all">Tous statuts</option>
            <option value="bannette">bannette</option>
            <option value="affecte">affecte</option>
            <option value="en_cours">en_cours</option>
            <option value="termine">termine</option>
            <option value="cloture">cloture</option>
          </select>
        </div>

        {loading ? <div className="mt-4 text-sm opacity-80">Chargement...</div> : null}
        {!loading && filtered.length === 0 ? <div className="mt-4 text-sm opacity-80">Aucun projet.</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {p.titre} <span className="opacity-70 text-sm">({p.numero_projet})</span>
                  </div>
                  <div className="mt-1 text-sm opacity-80">
                    Créé : {formatDateFR(p.created_at)} · Début prévu : {formatDateFR(p.date_debut_prevue)} · Fin prévue : {formatDateFR(p.date_fin_prevue)}
                  </div>
                  {p.description ? <div className="mt-2 text-sm opacity-80">{p.description}</div> : null}
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <Badge label={p.statut} tone={statusTone(p.statut)} />
                  {p.budget_total != null ? <Badge label={`Budget ${p.budget_total}`} tone="neutral" /> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
