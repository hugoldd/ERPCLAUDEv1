'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  DollarSign,
  FileText,
  FolderOpen,
  Info,
  ShoppingCart,
  Star,
  Users,
  ArrowLeft
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useClientUi, formatCurrencyEUR } from '@/app/clients/_ui';
import type { Client, ClientKpiSnapshot } from '@/types/clients';

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
  icon: ComponentType<{ size?: number }>;
};

export default function ClientFichePage() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme();
  const ui = useClientUi();

  const clientId = useMemo(() => {
    const raw = (params as unknown as { id?: string })?.id;
    return typeof raw === 'string' ? raw : '';
  }, [params]);

  const tabs: Tab[] = useMemo(
    () => [
      { key: 'dashboard', label: "Vue d'ensemble", icon: BarChart3 },
      { key: 'infos', label: 'Informations', icon: Info },
      { key: 'contacts', label: 'Contacts', icon: Users },
      { key: 'projets', label: 'Projets', icon: FolderOpen },
      { key: 'commandes', label: 'Commandes', icon: ShoppingCart },
      { key: 'finances', label: 'Finances', icon: DollarSign },
      { key: 'notes', label: 'Notes & Docs', icon: FileText },
      { key: 'satisfaction', label: 'Satisfaction', icon: Star },
      { key: 'alertes', label: 'Alertes', icon: AlertTriangle },
      { key: 'timeline', label: 'Timeline', icon: Activity }
    ],
    []
  );

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [client, setClient] = useState<Client | null>(null);
  const [kpi, setKpi] = useState<ClientKpiSnapshot | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const loadHeader = async () => {
      setHeaderError(null);
      setHeaderLoading(true);
      try {
        const { data: c, error: e1 } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .maybeSingle();
        if (e1) throw e1;
        setClient((c ?? null) as Client | null);

        const { data: k, error: e2 } = await supabase
          .from('client_kpi_snapshots')
          .select('*')
          .eq('client_id', clientId)
          .order('periode_mois', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (e2) throw e2;
        setKpi((k ?? null) as ClientKpiSnapshot | null);
      } catch (e: unknown) {
        setHeaderError(e instanceof Error ? e.message : 'Erreur inconnue.');
      } finally {
        setHeaderLoading(false);
      }
    };

    void loadHeader();
  }, [clientId]);

  const statusStyle = useMemo(() => {
    const statut = client?.statut ?? 'inactif';
    if (statut === 'actif') {
      return { backgroundColor: `${colors.success}22`, color: colors.success, border: `1px solid ${colors.success}` };
    }
    if (statut === 'prospect') {
      return { backgroundColor: `${colors.accent}22`, color: colors.accent, border: `1px solid ${colors.accent}` };
    }
    return { backgroundColor: `${colors.textSecondary}22`, color: colors.textSecondary, border: `1px solid ${colors.textSecondary}` };
  }, [client?.statut, colors.accent, colors.success, colors.textSecondary]);

  const kpis = useMemo(() => {
    return [
      {
        label: 'CA total',
        value: kpi?.ca_ttc != null ? formatCurrencyEUR(kpi.ca_ttc) : '-',
        icon: DollarSign,
        color: colors.accent
      },
      {
        label: 'Projets actifs',
        value: kpi?.nb_projets_actifs != null ? String(kpi.nb_projets_actifs) : '-',
        icon: FolderOpen,
        color: colors.success
      },
      {
        label: 'Satisfaction',
        value:
          typeof kpi?.satisfaction_moyenne === 'number'
            ? `${kpi.satisfaction_moyenne.toFixed(2)} / 5`
            : '-',
        icon: Star,
        color: colors.warning
      },
      {
        label: 'Commandes',
        value: kpi?.nb_commandes != null ? String(kpi.nb_commandes) : '-',
        icon: ShoppingCart,
        color: colors.textSecondary
      }
    ];
  }, [kpi, colors.accent, colors.success, colors.warning, colors.textSecondary]);

  if (!clientId) {
    return (
      <AppLayout>
        <div className="p-4" style={{ color: colors.text }}>
          <div className="p-4" style={ui.cardStyle}>
            <div className="text-lg font-semibold">Client introuvable</div>
            <div className="mt-2 opacity-80">Identifiant client invalide.</div>
            <button
              className="mt-4 px-4 py-2"
              style={ui.btnStyle}
              onClick={() => router.push('/clients')}
              type="button"
            >
              Retour a la liste
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const initials = client?.nom
    ? client.nom
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'CL';

  return (
    <AppLayout>
      <div className="p-3 sm:p-4" style={{ color: colors.text }}>
        <div className="p-4 sm:p-6" style={ui.cardStyle}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                className="p-2 rounded-lg transition-colors"
                style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                onClick={() => router.push('/clients')}
              >
                <ArrowLeft size={18} />
              </button>

              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center text-lg font-semibold"
                style={{ backgroundColor: colors.background, border: `2px solid ${colors.border}` }}
              >
                {initials}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-semibold">
                    {client?.nom ?? 'Client'}
                  </h1>
                  {client?.type_structure ? (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${colors.accent}22`, color: colors.accent }}
                    >
                      {client.type_structure}
                    </span>
                  ) : null}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase" style={statusStyle}>
                    {client?.statut ?? 'inactif'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-2 text-sm"
                style={ui.btnStyle}
                onClick={() => router.push('/clients')}
                type="button"
              >
                Liste clients
              </button>

              <button
                className="px-3 py-2 text-sm"
                style={ui.btnStyle}
                onClick={() => router.push(`/clients/${clientId}/nouveau-contact`)}
                type="button"
              >
                + Contact
              </button>

              <button
                className="px-3 py-2 text-sm"
                style={ui.btnStyle}
                onClick={() => router.push(`/clients/${clientId}/nouvelle-note`)}
                type="button"
              >
                + Note
              </button>
            </div>
          </div>

          {headerError ? (
            <div className="mt-3 text-sm" style={{ color: colors.danger }}>
              {headerError}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpiItem) => {
            const Icon = kpiItem.icon;
            return (
              <div
                key={kpiItem.label}
                className="rounded-xl p-4 transition-colors"
                style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${kpiItem.color}22` }}
                  >
                    <Icon size={18} style={{ color: kpiItem.color }} />
                  </div>
                </div>
                <div className="mt-3 text-xl font-semibold">{kpiItem.value}</div>
                <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  {kpiItem.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5" style={{ borderBottom: `2px solid ${colors.border}` }}>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap relative"
                  style={{ color: isActive ? colors.accent : colors.textSecondary }}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={16} />
                  {tab.label}
                  {isActive ? (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: colors.accent }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          {activeTab === 'dashboard' && (
            <ClientDashboard
              clientId={clientId}
              onOpenAlertes={() => setActiveTab('alertes')}
            />
          )}
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

        {headerLoading ? (
          <div className="mt-4 text-sm" style={{ color: colors.textSecondary }}>
            Chargement des informations client...
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
