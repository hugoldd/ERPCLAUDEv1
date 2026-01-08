'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';

export default function NouvelleCommande() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Array<{id: string, nom: string}>>([]);
  const [rechercheClient, setRechercheClient] = useState('');
  const [formData, setFormData] = useState({
    numero_commande: '',
    client_id: '',
    date_commande: new Date().toISOString().split('T')[0],
    prestations: [
      { type: 'logiciel', libelle: '', quantite: 1, prix_unitaire: 0 }
    ]
  });

  useEffect(() => {
    chargerClients();
    const urlParams = new URLSearchParams(window.location.search);
    const clientIdUrl = urlParams.get('client');
    if (clientIdUrl) {
      setFormData(prev => ({ ...prev, client_id: clientIdUrl }));
    }
  }, []);

  const chargerClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, nom')
      .order('nom');
    if (data) {
      setClients(data);
      const urlParams = new URLSearchParams(window.location.search);
      const clientIdUrl = urlParams.get('client');
      if (clientIdUrl) {
        const client = data.find(c => c.id === clientIdUrl);
        if (client) setRechercheClient(client.nom);
      }
    }
  };

  const ajouterPrestation = () => {
    setFormData({
      ...formData,
      prestations: [...formData.prestations, { type: 'logiciel', libelle: '', quantite: 1, prix_unitaire: 0 }]
    });
  };

  const supprimerPrestation = (index: number) => {
    if (formData.prestations.length === 1) {
      alert('Vous devez avoir au moins une prestation');
      return;
    }
    const newPrestations = formData.prestations.filter((_, i) => i !== index);
    setFormData({ ...formData, prestations: newPrestations });
  };

  const modifierPrestation = (index: number, field: string, value: any) => {
    const newPrestations = [...formData.prestations];
    newPrestations[index] = { ...newPrestations[index], [field]: value };
    setFormData({ ...formData, prestations: newPrestations });
  };

  const creerCommande = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientId = formData.client_id;
      
      if (!clientId) {
        alert('Veuillez sélectionner un client');
        return;
      }

      const montantTotal = formData.prestations.reduce(
        (sum, p) => sum + (p.quantite * p.prix_unitaire), 0
      );

      const { data: commande, error: erreurCommande } = await supabase
        .from('commandes')
        .insert({
          numero_commande: formData.numero_commande,
          client_id: clientId,
          date_commande: formData.date_commande,
          montant_total: montantTotal,
          statut: 'recue'
        })
        .select()
        .single();

      if (erreurCommande) throw erreurCommande;

      const prestationsAvecCommande = formData.prestations.map(p => ({
        commande_id: commande.id,
        code_prestation: p.type.toUpperCase(),
        type_prestation: p.type,
        libelle: p.libelle,
        quantite: p.quantite,
        prix_unitaire: p.prix_unitaire,
        montant_total: p.quantite * p.prix_unitaire
      }));

      const { error: erreurPrestations } = await supabase
        .from('prestations')
        .insert(prestationsAvecCommande);

      if (erreurPrestations) throw erreurPrestations;

      const { data: projet, error: erreurProjet } = await supabase
        .from('projets')
        .insert({
          numero_projet: `PRJ-${formData.numero_commande}`,
          commande_id: commande.id,
          client_id: clientId,
          titre: `Projet ${clients.find(c => c.id === clientId)?.nom} - ${formData.numero_commande}`,
          statut: 'bannette',
          budget_total: montantTotal,
          priorite: 'normale'
        })
        .select()
        .single();

      if (erreurProjet) throw erreurProjet;

      const { data: prestationsCrees } = await supabase
        .from('prestations')
        .select('id')
        .eq('commande_id', commande.id)
        .order('created_at');

      if (prestationsCrees) {
        const liaisonsPrestations = prestationsCrees.map(p => ({
          projet_id: projet.id,
          prestation_id: p.id
        }));

        await supabase.from('projet_prestations').insert(liaisonsPrestations);
      }

      alert('Commande créée et transformée en projet avec succès !');
      router.push('/bannette');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div 
          className="rounded-lg p-6"
          style={{ 
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`
          }}
        >
          <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>Nouvelle Commande</h1>

          <form onSubmit={creerCommande} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  N° Commande <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.numero_commande}
                  onChange={(e) => setFormData({ ...formData, numero_commande: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  placeholder="CMD-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>Date</label>
                <input
                  type="date"
                  required
                  value={formData.date_commande}
                  onChange={(e) => setFormData({ ...formData, date_commande: e.target.value })}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Client <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={rechercheClient}
                  onChange={(e) => setRechercheClient(e.target.value)}
                  className="w-full rounded px-3 py-2 mb-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => {
                    setFormData({ ...formData, client_id: e.target.value });
                    const clientSelectionne = clients.find(c => c.id === e.target.value);
                    if (clientSelectionne) setRechercheClient(clientSelectionne.nom);
                  }}
                  className="w-full rounded px-3 py-2"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                >
                  <option value="">Sélectionner un client...</option>
                  {clients
                    .filter(client => client.nom.toLowerCase().includes(rechercheClient.toLowerCase()))
                    .map(client => (
                      <option key={client.id} value={client.id}>{client.nom}</option>
                    ))}
                </select>
              </div>
              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                Le client doit être créé au préalable dans <Link href="/clients" className="hover:underline" style={{ color: colors.accent }}>Gestion des clients</Link>
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Prestations</h3>
                <button
                  type="button"
                  onClick={ajouterPrestation}
                  className="px-4 py-2 rounded transition-colors text-white"
                  style={{ backgroundColor: colors.accent }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accentHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
                >
                  + Ajouter prestation
                </button>
              </div>

              {formData.prestations.map((prestation, index) => (
                <div 
                  key={index} 
                  className="rounded p-4 mb-3 relative"
                  style={{ 
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  {formData.prestations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => supprimerPrestation(index)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-300 font-bold"
                      title="Supprimer cette prestation"
                    >
                      ✕
                    </button>
                  )}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm mb-1" style={{ color: colors.text }}>Type</label>
                      <select
                        value={prestation.type}
                        onChange={(e) => modifierPrestation(index, 'type', e.target.value)}
                        className="w-full rounded px-2 py-1"
                        style={{ 
                          backgroundColor: colors.card,
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                      >
                        <option value="logiciel">Logiciel</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="licence">Licence</option>
                        <option value="formation">Formation</option>
                        <option value="assistance">Assistance</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm mb-1" style={{ color: colors.text }}>Libellé</label>
                      <input
                        type="text"
                        required
                        value={prestation.libelle}
                        onChange={(e) => modifierPrestation(index, 'libelle', e.target.value)}
                        className="w-full rounded px-2 py-1"
                        style={{ 
                          backgroundColor: colors.card,
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1" style={{ color: colors.text }}>Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={prestation.quantite}
                        onChange={(e) => modifierPrestation(index, 'quantite', parseInt(e.target.value) || 1)}
                        className="w-full rounded px-2 py-1"
                        style={{ 
                          backgroundColor: colors.card,
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-sm mb-1" style={{ color: colors.text }}>Prix unitaire (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prestation.prix_unitaire}
                      onChange={(e) => modifierPrestation(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                      className="w-full rounded px-2 py-1"
                      style={{ 
                        backgroundColor: colors.card,
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    />
                  </div>

                  <div className="mt-2 text-right font-semibold" style={{ color: colors.accent }}>
                    Total: {(prestation.quantite * prestation.prix_unitaire).toFixed(2)} €
                  </div>
                </div>
              ))}
            </div>

            <div 
              className="flex justify-between items-center pt-4"
              style={{ borderTop: `1px solid ${colors.border}` }}
            >
              <div className="text-xl font-bold" style={{ color: colors.text }}>
                Montant total: {formData.prestations.reduce((sum, p) => sum + (p.quantite * p.prix_unitaire), 0).toFixed(2)} €
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded font-semibold transition-colors text-white disabled:opacity-50"
                style={{ backgroundColor: colors.success }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
              >
                {loading ? 'Création...' : 'Créer la commande'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}