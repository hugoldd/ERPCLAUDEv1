'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge, SectionHeader, formatCurrencyEUR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type {
  Client,
  ClientAlerte,
  ClientSatisfactionEvaluation,
  ClientInvoice,
  Projet,
  Commande
} from '@/types/clients';

export default function ClientDashboard(props: { clientId: string }) {
  const ui = useClientUi();

  const [client, setClient] = useState<Client | null>(null);
  const [alertes, setAlertes] = useState<ClientAlerte[]>([]);
  const [satisfaction, setSatisfaction] = useState<ClientSatisfactionEvaluation[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: c, error: e0 } = await supabase.from('clients').select('*').eq('id', props.clientId).maybeSingle();
      if (e0) throw e0;
      setClient(c ?? null);

      const [{ data: a, error: e1 }, { data: s, error: e2 }, { data: i, error: e3 }, { data: p, error: e4 }, { data: co, error: e5 }] =
        await Promise.all([
          supabase.from('client_alertes').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
          supabase.from('client_satisfaction_evaluations').select('*').eq('client_id', props.clientId).order('date_evaluation', { ascending: false }),
          supabase.from('client_finance_invoices').select('*').eq('client_id', props.clientId).order('date_emission', { ascending: false }),
          supabase.from('projets').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
          supabase.from('commandes').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false })
        ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;
      if (e5) throw e5;

      setAlertes((a ?? []) as ClientAlerte[]);
      setSatisfaction((s ?? []) as ClientSatisfactionEvaluation[]);
      setInvoices((i ?? []) as ClientInvoice[]);
      setProjets((p ?? []) as Projet[]);
      setCommandes((co ?? []) as Commande[]);
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

  const kpis = useMemo(() => {
    const alertesActives = alertes.filter((x) => x.actif).length;

    const satAvg =
      satisfaction.length === 0 ? null : satisfaction.reduce((acc, x) => acc + (x.score ?? 0), 0) / satisfaction.length;

    const ca = invoices
      .filter((x) => x.statut !== 'annulee')
      .reduce((acc, x) => acc + (typeof x.montant_ttc === 'number' ? x.montant_ttc : 0), 0);

    const projetsActifs = projets.filter((p) => p.statut === 'en_cours' || p.statut === 'affecte').length;

    const commandesTotal = commandes.length;

    const facturesEnRetard = invoices.filter((x) => x.statut === 'en_retard').length;

    return { alertesActives, satAvg, ca, projetsActifs, commandesTotal, facturesEnRetard };
  }, [alertes, satisfaction, invoices, projets, commandes]);

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title={client ? client.nom : 'Client'}
          subtitle="Synthèse des indicateurs et signaux opérationnels"
          right={
            <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Statut</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                label={client?.statut ?? '—'}
                tone={client?.statut === 'actif' ? 'success' : client?.statut === 'prospect' ? 'warning' : 'neutral'}
              />
              {kpis.alertesActives > 0 ? <Badge label={`${kpis.alertesActives} alerte(s)`} tone="danger" /> : <Badge label="Aucune alerte" tone="success" />}
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">CA (factures non annulées)</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrencyEUR(kpis.ca)}</div>
            <div className="mt-1 text-sm opacity-70">
              {kpis.facturesEnRetard > 0 ? `${kpis.facturesEnRetard} facture(s) en retard` : 'Aucune facture en retard'}
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Satisfaction moyenne</div>
            <div className="mt-2 text-xl font-semibold">
              {kpis.satAvg === null ? '—' : `${kpis.satAvg.toFixed(2)} / 5`}
            </div>
            <div className="mt-1 text-sm opacity-70">{satisfaction.length} évaluation(s)</div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Projets actifs</div>
            <div className="mt-2 text-xl font-semibold">{kpis.projetsActifs}</div>
            <div className="mt-1 text-sm opacity-70">{projets.length} projet(s) total</div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Commandes</div>
            <div className="mt-2 text-xl font-semibold">{kpis.commandesTotal}</div>
            <div className="mt-1 text-sm opacity-70">Historique client</div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Coordonnées</div>
            <div className="mt-2 text-sm">
              <div className="opacity-90">{client?.email_contact ?? '—'}</div>
              <div className="opacity-70">{client?.telephone_contact ?? '—'}</div>
              <div className="opacity-70">{client?.ville ?? '—'} {client?.code_postal ? `(${client.code_postal})` : ''}</div>
            </div>
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm opacity-80">Chargement des données...</div> : null}
      </div>
    </div>
  );
}
