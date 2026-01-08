'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

export default function NouveauClient() {
  const router = useRouter();
  const { colors } = useTheme();
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
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/clients" 
          className="inline-flex items-center gap-2 mb-6 transition-colors font-medium"
          style={{ color: colors.accent }}
          onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
          onMouseLeave={(e) => e.currentTarget.style.color = colors.accent}
        >
          <span className="text-xl">←</span>
          <span>Retour à la liste</span>
        </Link>

        <div 
          className="rounded-lg p-6"
          style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
            Nouveau Client
          </h1>

          <form onSubmit={creerClient} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Nom du client <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  placeholder="Ex: Mairie de Lyon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Type de structure
                </label>
                <select
                  value={formData.type_structure}
                  onChange={(e) => setFormData({ ...formData, type_structure: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
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
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  SIRET
                </label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  placeholder="123 456 789 00012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  placeholder="69000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  placeholder="Lyon"
                />
              </div>
            </div>

            <div 
              className="border-t pt-6"
              style={{ borderColor: colors.border }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
                Contact principal
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Nom du contact
                  </label>
                  <input
                    type="text"
                    value={formData.contact_principal}
                    onChange={(e) => setFormData({ ...formData, contact_principal: e.target.value })}
                    className="w-full rounded px-3 py-2"
                    style={{ 
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email_contact}
                    onChange={(e) => setFormData({ ...formData, email_contact: e.target.value })}
                    className="w-full rounded px-3 py-2"
                    style={{ 
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                    placeholder="contact@client.fr"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone_contact}
                    onChange={(e) => setFormData({ ...formData, telephone_contact: e.target.value })}
                    className="w-full rounded px-3 py-2"
                    style={{ 
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Statut
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                className="w-full rounded px-3 py-2"
                style={{ 
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.text
                }}
              >
                <option value="actif">Actif</option>
                <option value="prospect">Prospect</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>

            <div 
              className="flex justify-end gap-3 pt-4"
              style={{ borderTop: `1px solid ${colors.border}` }}
            >
              <Link href="/clients">
                <button
                  type="button"
                  className="px-6 py-3 rounded font-semibold transition-colors"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.cardHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.background}
                >
                  Annuler
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded font-semibold transition-colors text-white disabled:opacity-50"
                style={{ backgroundColor: colors.success }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
              >
                {loading ? 'Création...' : 'Créer le client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}