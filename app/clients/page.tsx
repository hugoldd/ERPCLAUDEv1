'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { Client, ClientStatut } from '@/types/clients';
import { useClientUi } from '@/app/clients/_ui';

export default function ListeClients() {
  const { colors } = useTheme();
  const ui = useClientUi();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    void chargerClients();
  }, []);

  const chargerClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom');

    if (error) {
      console.error('Erreur chargement clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const clientsFiltres = useMemo(() => {
    const needle = recherche.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) => {
      const fields = [
        client.nom,
        client.ville ?? '',
        client.type_structure ?? '',
      ];
      return fields.some((field) => field.toLowerCase().includes(needle));
    });
  }, [clients, recherche]);

  const statutStyle = (statut: ClientStatut) => {
    if (statut === 'actif') {
      return {
        backgroundColor: `${colors.success}22`,
        color: colors.success,
        border: `1px solid ${colors.success}`,
      };
    }
    if (statut === 'prospect') {
      return {
        backgroundColor: `${colors.accent}22`,
        color: colors.accent,
        border: `1px solid ${colors.accent}`,
      };
    }
    return {
      backgroundColor: `${colors.textSecondary}22`,
      color: colors.textSecondary,
      border: `1px solid ${colors.textSecondary}`,
    };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl" style={{ color: colors.text }}>Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: colors.text }}>
                Comptes clients
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                Pilotage du portefeuille, statut et contacts principaux.
              </p>
            </div>
            <Link href="/clients/nouveau">
              <button
                className="px-5 py-3 rounded-lg font-semibold transition-colors"
                style={{ backgroundColor: colors.accent, color: 'white' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accentHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.accent;
                }}
              >
                + Nouveau client
              </button>
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="text"
              placeholder="Rechercher un client (nom, ville, type)"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full rounded-lg px-4 py-3 placeholder-gray-400"
              style={{
                ...ui.inputStyle,
                backgroundColor: colors.background,
                color: colors.text,
              }}
            />
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Total: {clientsFiltres.length} client{clientsFiltres.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {clientsFiltres.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          >
            <p className="text-lg" style={{ color: colors.text }}>
              {recherche ? 'Aucun client trouve' : 'Aucun client enregistre'}
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
          >
            <div
              className="hidden md:grid md:grid-cols-12 px-6 py-4 text-xs uppercase tracking-wide"
              style={{ backgroundColor: colors.background, color: colors.textSecondary }}
            >
              <div className="md:col-span-3">Client</div>
              <div className="md:col-span-2">Type</div>
              <div className="md:col-span-2">Ville</div>
              <div className="md:col-span-3">Contact</div>
              <div className="md:col-span-1">Statut</div>
              <div className="md:col-span-1 text-right">Action</div>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}` }}>
              {clientsFiltres.map((client) => (
                <div
                  key={client.id}
                  className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-12 md:items-center transition-colors"
                  style={{ borderBottom: `1px solid ${colors.border}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.cardHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="md:col-span-3">
                    <div className="font-semibold" style={{ color: colors.text }}>{client.nom}</div>
                    {client.code_postal || client.ville ? (
                      <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        {(client.code_postal ?? '') + (client.code_postal && client.ville ? ' ' : '') + (client.ville ?? '')}
                      </div>
                    ) : null}
                  </div>
                  <div className="md:col-span-2" style={{ color: colors.text }}>
                    {client.type_structure || '-'}
                  </div>
                  <div className="md:col-span-2" style={{ color: colors.text }}>
                    {client.ville || '-'}
                  </div>
                  <div className="md:col-span-3 text-sm" style={{ color: colors.text }}>
                    {client.email_contact && <div>{client.email_contact}</div>}
                    {client.telephone_contact && <div>{client.telephone_contact}</div>}
                    {!client.email_contact && !client.telephone_contact && '-'}
                  </div>
                  <div className="md:col-span-1">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold uppercase"
                      style={statutStyle(client.statut)}
                    >
                      {client.statut}
                    </span>
                  </div>
                  <div className="md:col-span-1 md:text-right">
                    <Link href={`/clients/${client.id}`}>
                      <button
                        className="font-medium transition-colors"
                        style={{ color: colors.accent }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.text;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = colors.accent;
                        }}
                      >
                        Voir fiche
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
