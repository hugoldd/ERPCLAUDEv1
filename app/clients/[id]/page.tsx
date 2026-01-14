'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

import ClientDashboard from '@/app/clients/ClientDashboard';
import ClientInfos from '@/app/clients/ClientInfos';
import ClientContacts from '@/app/clients/ClientContacts';
import ClientProjets from '@/app/clients/ClientProjets';
import ClientCommandes from '@/app/clients/ClientCommandes';
import ClientFinances from '@/app/clients/ClientFinances';
import ClientNotes from '@/app/clients/ClientNotes';
import ClientSatisfaction from '@/app/clients/ClientSatisfaction';
import ClientAlertes from '@/app/clients/ClientAlertes';
import ClientTimeline from '@/app/clients/ClientTimeline';

type TabKey =
  | 'dashboard'
  | 'infos'
  | 'contacts'
  | 'projets'
  | 'commandes'
  | 'finances'
  | 'notes'
  | 'satisfaction'
  | 'alertes'
  | 'timeline';

type Tab = {
  key: TabKey;
  label: string;
  icon: string;
};

export default function ClientFichePage() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme() as unknown as { colors: Record<string, string> };

  const clientId = useMemo(() => {
    const raw = (params as unknown as { id?: string })?.id;
    return typeof raw === 'string' ? raw : '';
  }, [params]);

  const tabs: Tab[] = useMemo(
    () => [
      { key: 'dashboard', label: 'Vue d’ensemble', icon: '📊' },
      { key: 'infos', label: 'Informations', icon: '🏢' },
      { key: 'contacts', label: 'Contacts', icon: '👤' },
      { key: 'projets', label: 'Projets', icon: '🧩' },
      { key: 'commandes', label: 'Commandes', icon: '🧾' },
      { key: 'finances', label: 'Finances', icon: '💶' },
      { key: 'notes', label: 'Notes & Docs', icon: '🗂️' },
      { key: 'satisfaction', label: 'Satisfaction', icon: '⭐' },
      { key: 'alertes', label: 'Alertes', icon: '🚨' },
      { key: 'timeline', label: 'Timeline', icon: '🕒' }
    ],
    []
  );

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const styles = useMemo(() => {
    const bg = colors.background ?? '#0b0f19';
    const card = colors.card ?? '#111827';
    const text = colors.text ?? '#e5e7eb';
    const border = colors.border ?? 'rgba(255,255,255,0.08)';
    const accent = colors.accent ?? '#6d28d9';

    return {
      page: { backgroundColor: bg, color: text },
      headerCard: {
        backgroundColor: card,
        border: `1px solid ${border}`,
        borderRadius: 16
      },
      btn: {
        border: `1px solid ${border}`,
        borderRadius: 12
      },
      tabBtn: (selected: boolean) => ({
        border: `1px solid ${selected ? accent : border}`,
        backgroundColor: selected ? `${accent}22` : 'transparent',
        borderRadius: 14
      })
    } as const;
  }, [colors]);

  if (!clientId) {
    return (
      <AppLayout>
        <div className="p-4" style={styles.page}>
          <div className="p-4" style={styles.headerCard}>
            <div className="text-lg font-semibold">Client introuvable</div>
            <div className="mt-2 opacity-80">
              L’identifiant client n’est pas valide.
            </div>
            <button
              className="mt-4 px-4 py-2"
              style={styles.btn}
              onClick={() => router.push('/clients')}
              type="button"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-3 sm:p-4" style={styles.page}>
        <div className="p-4 sm:p-5" style={styles.headerCard}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xl sm:text-2xl font-semibold">
                Fiche client
              </div>
              <div className="mt-1 opacity-80 text-sm">
                ID : {clientId}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-2 text-sm"
                style={styles.btn}
                onClick={() => router.push('/clients')}
                type="button"
              >
                ← Liste clients
              </button>

              <button
                className="px-3 py-2 text-sm"
                style={styles.btn}
                onClick={() => router.push(`/clients/${clientId}/nouveau-contact`)}
                type="button"
              >
                + Contact
              </button>

              <button
                className="px-3 py-2 text-sm"
                style={styles.btn}
                onClick={() => router.push(`/clients/${clientId}/nouvelle-note`)}
                type="button"
              >
                + Note
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className="px-3 py-2 text-sm whitespace-nowrap"
                style={styles.tabBtn(activeTab === t.key)}
                onClick={() => setActiveTab(t.key)}
              >
                <span className="mr-2">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          {activeTab === 'dashboard' && <ClientDashboard clientId={clientId} />}
          {activeTab === 'infos' && <ClientInfos clientId={clientId} />}
          {activeTab === 'contacts' && <ClientContacts clientId={clientId} />}
          {activeTab === 'projets' && <ClientProjets clientId={clientId} />}
          {activeTab === 'commandes' && <ClientCommandes clientId={clientId} />}
          {activeTab === 'finances' && <ClientFinances clientId={clientId} />}
          {activeTab === 'notes' && <ClientNotes clientId={clientId} />}
          {activeTab === 'satisfaction' && <ClientSatisfaction clientId={clientId} />}
          {activeTab === 'alertes' && <ClientAlertes clientId={clientId} />}
          {activeTab === 'timeline' && <ClientTimeline clientId={clientId} />}
        </div>
      </div>
    </AppLayout>
  );
}
