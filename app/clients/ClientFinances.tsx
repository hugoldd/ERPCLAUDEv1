'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrencyEUR } from '@/app/clients/_ui';
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

type YearStats = {
  year: number;
  factures: number;
  paiements: number;
  nbFactures: number;
  nbRetard: number;
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

  const yearly = useMemo<YearStats[]>(() => {
    const map = new Map<number, YearStats>();
    const ensure = (year: number) => {
      if (!map.has(year)) {
        map.set(year, { year, factures: 0, paiements: 0, nbFactures: 0, nbRetard: 0 });
      }
      return map.get(year)!;
    };

    for (const inv of invoices) {
      const y = new Date(inv.date_emission).getFullYear();
      const row = ensure(y);
      if (inv.statut !== 'annulee') {
        row.factures += typeof inv.montant_ttc === 'number' ? inv.montant_ttc : 0;
        row.nbFactures += 1;
      }
      if (inv.statut === 'en_retard') row.nbRetard += 1;
    }

    for (const pay of payments) {
      const y = new Date(pay.date_paiement).getFullYear();
      const row = ensure(y);
      row.paiements += typeof pay.montant === 'number' ? pay.montant : 0;
    }

    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [invoices, payments]);

  const tooltipFormatter = (value: any) => formatCurrencyEUR(typeof value === 'number' ? value : 0);

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Finances</div>
            <div className="text-sm" style={{ color: ui.c.muted }}>Factures et paiements</div>
          </div>
          <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
            {loading ? 'Chargement...' : 'Rafraichir'}
          </button>
        </div>

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm" style={{ color: ui.c.muted }}>Total facture</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrencyEUR(totals.totalFact)}</div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm" style={{ color: ui.c.muted }}>Total encaisse</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrencyEUR(totals.totalPay)}</div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm" style={{ color: ui.c.muted }}>Impayees</div>
            <div className="mt-2 text-xl font-semibold">{totals.impayees}</div>
          </div>
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="text-sm" style={{ color: ui.c.muted }}>En retard</div>
            <div className="mt-2 text-xl font-semibold">{totals.enRetard}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Evolution mensuelle</div>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ui.c.border} />
                  <XAxis dataKey="month" stroke={ui.c.muted} />
                  <YAxis stroke={ui.c.muted} />
                  <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: ui.c.card, border: `1px solid ${ui.c.border}` }} />
                  <Legend />
                  <Line type="monotone" dataKey="factures" stroke={ui.c.accent} strokeWidth={2} />
                  <Line type="monotone" dataKey="paiements" stroke={ui.c.success} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Comparatif factures / paiements</div>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ui.c.border} />
                  <XAxis dataKey="month" stroke={ui.c.muted} />
                  <YAxis stroke={ui.c.muted} />
                  <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: ui.c.card, border: `1px solid ${ui.c.border}` }} />
                  <Legend />
                  <Bar dataKey="factures" fill={ui.c.accent} />
                  <Bar dataKey="paiements" fill={ui.c.success} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="font-semibold">Historique annuel</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `2px solid ${ui.c.border}` }}>
                  <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Annee</th>
                  <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Factures</th>
                  <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Paiements</th>
                  <th className="text-center py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Nb factures</th>
                  <th className="text-center py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Retard</th>
                </tr>
              </thead>
              <tbody>
                {yearly.map((row) => (
                  <tr key={row.year} style={{ borderBottom: `1px solid ${ui.c.border}` }}>
                    <td className="py-3 px-3 font-semibold">{row.year}</td>
                    <td className="py-3 px-3 text-right" style={{ color: ui.c.accent }}>
                      {formatCurrencyEUR(row.factures)}
                    </td>
                    <td className="py-3 px-3 text-right" style={{ color: ui.c.success }}>
                      {formatCurrencyEUR(row.paiements)}
                    </td>
                    <td className="py-3 px-3 text-center">{row.nbFactures}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                        style={{
                          backgroundColor: row.nbRetard > 0 ? `${ui.c.warning}22` : `${ui.c.success}22`,
                          color: row.nbRetard > 0 ? ui.c.warning : ui.c.success
                        }}
                      >
                        {row.nbRetard}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && yearly.length === 0 ? <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Aucune donnee annuelle.</div> : null}
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
      </div>
    </div>
  );
}
