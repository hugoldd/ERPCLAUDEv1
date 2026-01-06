'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NouveauClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type_structure: '',
    siret: '',
    code_postal: '',
    ville: '',
    contact_principal: '',
    email_contact: '',
    telephone_contact: '',
    statut: 'actif'
  });

  const creerClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      alert('Client créé avec succès ! Vous pouvez maintenant ajouter des notes dans la fiche client.');
      router.push(`/clients/${data.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F2836] p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/clients" 
          className="inline-flex items-center gap-2 text-[#2196F3] hover:text-[#FFFFFF] mb-6 transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="font-medium">Retour à la liste</span>
        </Link>

        <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6">
          <h1 className="text-2xl font-bold mb-6 text-[#FFFFFF]">Nouveau Client</h1>

          <form onSubmit={creerClient} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">
                  Nom du client <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                  placeholder="Ex: Mairie de Lyon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Type de structure</label>
                <select
                  value={formData.type_structure}
                  onChange={(e) => setFormData({ ...formData, type_structure: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Commune">Commune</option>
                  <option value="EPCI">EPCI</option>
                  <option value="Département">Département</option>
                  <option value="Région">Région</option>
                  <option value="Syndicat">Syndicat</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">SIRET</label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                  placeholder="123 456 789 00012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Code postal</label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                  placeholder="69000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Ville</label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                  placeholder="Lyon"
                />
              </div>
            </div>

            <div className="border-t border-[#FFFFFF26] pt-6">
              <h3 className="text-lg font-semibold mb-4 text-[#FFFFFF]">Contact principal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Nom du contact</label>
                  <input
                    type="text"
                    value={formData.contact_principal}
                    onChange={(e) => setFormData({ ...formData, contact_principal: e.target.value })}
                    className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Email</label>
                  <input
                    type="email"
                    value={formData.email_contact}
                    onChange={(e) => setFormData({ ...formData, email_contact: e.target.value })}
                    className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                    placeholder="contact@client.fr"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone_contact}
                    onChange={(e) => setFormData({ ...formData, telephone_contact: e.target.value })}
                    className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
              >
                <option value="actif">Actif</option>
                <option value="prospect">Prospect</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#FFFFFF26]">
              <Link href="/clients">
                <button
                  type="button"
                  className="bg-[#1F2836] border border-[#FFFFFF26] text-[#FFFFFF] px-6 py-3 rounded font-semibold hover:bg-[#2E3744] transition-colors"
                >
                  Annuler
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#2196F3] text-white px-6 py-3 rounded font-semibold hover:bg-[#1976D2] disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Création...' : 'Créer le client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}