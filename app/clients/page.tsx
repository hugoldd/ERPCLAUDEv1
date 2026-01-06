'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen bg-[#1F2836] flex items-center justify-center">
        <div className="text-xl text-[#FFFFFF]">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2836] p-8">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[#2196F3] hover:text-[#FFFFFF] mb-6 transition-colors"
        >
          <span className="text-xl">🏠</span>
          <span className="font-medium">Retour à l'accueil</span>
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#FFFFFF]">Gestion des Clients</h1>
          <Link href="/clients/nouveau">
            <button className="bg-[#2196F3] text-white px-6 py-3 rounded font-semibold hover:bg-[#1976D2] transition-colors">
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
            className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-4 py-3 text-[#FFFFFF] placeholder-gray-400"
          />
        </div>

        {clientsFiltres.length === 0 ? (
          <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-12 text-center">
            <p className="text-xl text-[#FFFFFF]">
              {recherche ? 'Aucun client trouvé' : 'Aucun client enregistré'}
            </p>
          </div>
        ) : (
          <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1F2836] border-b border-[#FFFFFF26]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FFFFFF]">Nom</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FFFFFF]">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FFFFFF]">Ville</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FFFFFF]">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FFFFFF]">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FFFFFF]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFFFFF26]">
                {clientsFiltres.map((client) => (
                  <tr key={client.id} className="hover:bg-[#1F2836] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#FFFFFF]">{client.nom}</div>
                    </td>
                    <td className="px-6 py-4 text-[#FFFFFF]">{client.type_structure || '-'}</td>
                    <td className="px-6 py-4 text-[#FFFFFF]">{client.ville || '-'}</td>
                    <td className="px-6 py-4 text-[#FFFFFF]">
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
                        <button className="text-[#2196F3] hover:text-[#FFFFFF] font-medium transition-colors">
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

        <div className="mt-6 text-center text-[#FFFFFF]">
          Total : {clientsFiltres.length} client{clientsFiltres.length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}