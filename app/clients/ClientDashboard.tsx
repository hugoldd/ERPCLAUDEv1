'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  Info,
  Mail,
  Phone,
  Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useClientUi, formatCurrencyEUR, formatDateFR } from '@/app/clients/_ui';
import type { ClientAlerte, ClientContact, ClientActivityEvent, ClientInvoice } from '@/types/clients';

export default function ClientDashboard(props: { clientId: string; onOpenAlertes?: () => void }) {
  const ui = useClientUi();

  const [alertes, setAlertes] = useState<ClientAlerte[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [activities, setActivities] = useState<ClientActivityEvent[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ data: a, error: e1 }, { data: c, error: e2 }, { data: ev, error: e3 }, { data: inv, error: e4 }] =
        await Promise.all([
          supabase.from('client_alertes').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
          supabase.from('contacts_clients').select('*').eq('client_id', props.clientId).order('principal', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('client_activity_events').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
          supabase.from('client_finance_invoices').select('*').eq('client_id', props.clientId).order('date_emission', { ascending: true })
        ]);

      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      if (e4) throw e4;

      setAlertes((a ?? []) as ClientAlerte[]);
      setContacts((c ?? []) as ClientContact[]);
      setActivities((ev ?? []) as ClientActivityEvent[]);
      setInvoices((inv ?? []) as ClientInvoice[]);
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

  const revenueData = useMemo(() => {
    const map = new Map<string, number>();
    const monthKey = (d: string) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    for (const inv of invoices) {
      if (inv.statut === 'annulee') continue;
      const key = monthKey(inv.date_emission);
      const next = map.get(key) ?? 0;
      map.set(key, next + (typeof inv.montant_ttc === 'number' ? inv.montant_ttc : 0));
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value }));
  }, [invoices]);

  const activeAlerts = useMemo(() => alertes.filter((a) => a.actif), [alertes]);
  const topContacts = useMemo(() => contacts.slice(0, 3), [contacts]);
  const recentActivities = useMemo(() => activities.slice(0, 5), [activities]);

  const activityIcon = (type: string) => {
    if (type === 'finance') return DollarSign;
    if (type === 'document') return FileText;
    if (type === 'contact') return Phone;
    if (type === 'alerte') return AlertTriangle;
    return Info;
  };

  const activityColor = (type: string) => {
    if (type === 'finance') return ui.c.success;
    if (type === 'document') return ui.c.warning;
    if (type === 'contact') return ui.c.accent;
    if (type === 'alerte') return ui.c.danger;
    return ui.c.muted;
  };

  const alertConfig = (niveau: ClientAlerte['niveau']) => {
    if (niveau === 'danger') return { icon: AlertTriangle, color: ui.c.danger };
    if (niveau === 'warning') return { icon: AlertCircle, color: ui.c.warning };
    return { icon: Info, color: ui.c.accent };
  };

  return (
    <div className="p-3 sm:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4" style={ui.cardStyle}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Evolution du CA (factures)</div>
              <div className="text-xs" style={{ color: ui.c.muted }}>
                Total: {formatCurrencyEUR(revenueData.reduce((acc, item) => acc + item.value, 0))}
              </div>
            </div>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ui.c.border} />
                  <XAxis dataKey="month" stroke={ui.c.muted} />
                  <YAxis stroke={ui.c.muted} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip
                    formatter={(value) => formatCurrencyEUR(typeof value === 'number' ? value : 0)}
                    contentStyle={{ backgroundColor: ui.c.card, border: `1px solid ${ui.c.border}` }}
                  />
                  <Line type="monotone" dataKey="value" stroke={ui.c.accent} strokeWidth={3} dot={{ fill: ui.c.accent, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4" style={ui.cardStyle}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Dernieres activites</div>
              <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
                {loading ? 'Chargement...' : 'Rafraichir'}
              </button>
            </div>
            {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}
            <div className="mt-4 space-y-3">
              {recentActivities.map((activity) => {
                const Icon = activityIcon(activity.type_event);
                const color = activityColor(activity.type_event);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: ui.c.bg }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}22` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.titre}</div>
                      <div className="text-xs" style={{ color: ui.c.muted }}>
                        {activity.description ?? 'Aucun detail'} - {formatDateFR(activity.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && recentActivities.length === 0 ? (
                <div className="text-sm" style={{ color: ui.c.muted }}>Aucune activite recente.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="p-4" style={ui.cardStyle}>
            <div className="font-semibold">Alertes actives</div>
            <div className="mt-4 space-y-3">
              {activeAlerts.map((alert) => {
                const config = alertConfig(alert.niveau);
                const Icon = config.icon;
                return (
                  <button
                    key={alert.id}
                    type="button"
                    className="p-3 rounded-lg text-left"
                    style={{ backgroundColor: ui.c.bg, cursor: props.onOpenAlertes ? 'pointer' : 'default' }}
                    onClick={() => props.onOpenAlertes?.()}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}22` }}>
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{alert.titre}</div>
                        <div className="text-xs" style={{ color: ui.c.muted }}>{formatDateFR(alert.created_at)}</div>
                      </div>
                    </div>
                    {alert.message ? <div className="mt-2 text-xs" style={{ color: ui.c.muted }}>{alert.message}</div> : null}
                  </button>
                );
              })}
              {!loading && activeAlerts.length === 0 ? (
                <div className="text-sm" style={{ color: ui.c.muted }}>Aucune alerte active.</div>
              ) : null}
            </div>
          </div>

          <div className="p-4" style={ui.cardStyle}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Contacts principaux</div>
              <Users size={16} style={{ color: ui.c.muted }} />
            </div>
            <div className="mt-4 space-y-3">
              {topContacts.map((contact) => {
                const initials = `${contact.prenom ?? ''} ${contact.nom ?? ''}`
                  .trim()
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('') || 'C';
                return (
                  <div key={contact.id} className="p-3 rounded-lg" style={{ backgroundColor: ui.c.bg }}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-semibold" style={{ backgroundColor: ui.c.accent, color: 'white' }}>
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{`${contact.prenom ?? ''} ${contact.nom ?? ''}`.trim()}</div>
                        <div className="text-xs" style={{ color: ui.c.muted }}>{contact.fonction ?? 'Fonction non definie'}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ backgroundColor: ui.c.card, color: ui.c.muted, border: `1px solid ${ui.c.border}` }}
                        href={contact.email ? `mailto:${contact.email}` : undefined}
                      >
                        <Mail size={14} />
                        Email
                      </a>
                      <a
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ backgroundColor: ui.c.card, color: ui.c.muted, border: `1px solid ${ui.c.border}` }}
                        href={contact.telephone ? `tel:${contact.telephone}` : undefined}
                      >
                        <Phone size={14} />
                        Appel
                      </a>
                    </div>
                  </div>
                );
              })}
              {!loading && topContacts.length === 0 ? (
                <div className="text-sm" style={{ color: ui.c.muted }}>Aucun contact principal.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
