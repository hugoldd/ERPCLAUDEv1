'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, formatCurrencyEUR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientInvoice, ClientPayment } from '@/types/clients';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';

type MonthPoint = {
  month: string;
  factures: number;
  paiements: number;
};

export default function ClientFinances(props: { clientId: string }) {
  const ui = useClientUi();

  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ data: i, error: e1 }, { data: p, error: e2 }] = await Promise.all([
        supabase.from('client_finance_invoices').select('*').eq('client_id', props.clientId).order('date_emission', { ascending: true }),
        supabase.from('client_finance_payments').select('*').eq('client_id', props.clientId).order('date_paiement', { ascending: true })
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      setInvoices((i ?? []) as ClientInvoice[]);
      setPayments((p ?? []) as ClientPayment[]);
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

  const totals = useMemo(() => {
    const inv = invoices.filter((x) => x.statut !== 'annulee');
    const totalFact = inv.reduce((acc, x) => acc + (typeof x.montant_ttc === 'number' ? x.montant_ttc : 0), 0);
    const totalPay = payments.reduce((acc, x) => acc + (typeof x.montant === 'number' ? x.montant : 0), 0);
    const enRetard = invoices.filter((x) => x.statut === 'en_retard').length;
    const impayees = invoices.filter((x) => x.statut === 'emise' || x.statut === 'en_retard').length;
    return { totalFact, totalPay, enRetard, impayees };
  }, [invoices, payments]);

  const chartData = useMemo<MonthPoint[]>(() => {
    const map = new Map<string, MonthPoint>();

    const monthKey = (d: string) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    for (const inv of invoices) {
      if (inv.statut === 'annulee') continue;
      const k = monthKey(inv.date_emission);
      const p = map.get(k) ?? { month: k, factures: 0, paiements: 0 };
      p.factures += typeof inv.montant_ttc === 'number' ? inv.montant_ttc : 0;
      map.set(k, p);
    }

    for (const pay of payments) {
      const k = monthKey(pay.date_paiement);
      const p = map.get(k) ?? { month: k, factures: 0, paiements: 0 };
      p.paiements += typeof pay.montant === 'number' ? pay.montant : 0;
      map.set(k, p);
    }

    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices, payments]);

  const tooltipFormatter = (value: any) => formatCurrencyEUR(typeof value === 'number' ? value : 0);

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Finances"
          subtitle="Vue financière (factures / paiements) + graphiques"
          right={
            <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Total facturé</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrencyEUR(totals.totalFact)}</div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Total encaissé</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrencyEUR(totals.totalPay)}</div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">Factures impayées</div>
            <div className="mt-2 text-xl font-semibold">{totals.impayees}</div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm opacity-80">En retard</div>
            <div className="mt-2 text-xl font-semibold">{totals.enRetard}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Évolution mensuelle</div>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="factures" />
                  <Line type="monotone" dataKey="paiements" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Comparatif factures / paiements</div>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Bar dataKey="factures" />
                  <Bar dataKey="paiements" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm opacity-80">Chargement...</div> : null}
      </div>
    </div>
  );
}
