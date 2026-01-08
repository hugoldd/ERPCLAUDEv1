'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

interface Client {
  id: string;
  nom: string;
  type_structure?: string;
  ville?: string;
  email_contact?: string;
  telephone_contact?: string;
  statut: string;
  created_at: string;
}

export default function ListeClients() {
  const router = useRouter();
  const { colors } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    chargerClients();
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

  const clientsFiltres = clients.filter(client =>
    client.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    client.ville?.toLowerCase().includes(recherche.toLowerCase()) ||
    client.type_structure?.toLowerCase().includes(recherche.toLowerCase())
  );

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-500/20 text-green-300 border-green-500';
      case 'prospect': return 'bg-blue-500/20 text-blue-300 border-blue-500';
      case 'inactif': return 'bg-gray-500/20 text-gray-300 border-gray-500';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500';
    }
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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Gestion des Clients</h1>
          <Link href="/clients/nouveau">
            <button 
              className="px-6 py-3 rounded font-semibold transition-colors text-white"
              style={{ backgroundColor: colors.accent }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accentHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
            >
              + Nouveau client
            </button>
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un client (nom, ville, type...)"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded px-4 py-3 placeholder-gray-400"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              color: colors.text
            }}
          />
        </div>

        {clientsFiltres.length === 0 ? (
          <div 
            className="rounded-lg p-12 text-center"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <p className="text-xl" style={{ color: colors.text }}>
              {recherche ? 'Aucun client trouvé' : 'Aucun client enregistré'}
            </p>
          </div>
        ) : (
          <div 
            className="rounded-lg overflow-hidden"
            style={{ 
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`
            }}
          >
            <table className="w-full">
              <thead style={{ backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}` }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.text }}>Nom</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.text }}>Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.text }}>Ville</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.text }}>Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.text }}>Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.text }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientsFiltres.map((client) => (
                  <tr 
                    key={client.id} 
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${colors.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.cardHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold" style={{ color: colors.text }}>{client.nom}</div>
                    </td>
                    <td className="px-6 py-4" style={{ color: colors.text }}>{client.type_structure || '-'}</td>
                    <td className="px-6 py-4" style={{ color: colors.text }}>{client.ville || '-'}</td>
                    <td className="px-6 py-4" style={{ color: colors.text }}>
                      <div className="text-sm">
                        {client.email_contact && <div>{client.email_contact}</div>}
                        {client.telephone_contact && <div>{client.telephone_contact}</div>}
                        {!client.email_contact && !client.telephone_contact && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatutColor(client.statut)}`}>
                        {client.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/clients/${client.id}`}>
                        <button 
                          className="font-medium transition-colors"
                          style={{ color: colors.accent }}
                          onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                          onMouseLeave={(e) => e.currentTarget.style.color = colors.accent}
                        >
                          Voir fiche →
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center" style={{ color: colors.text }}>
          Total : {clientsFiltres.length} client{clientsFiltres.length > 1 ? 's' : ''}
        </div>
      </div>
    </AppLayout>
  );
}