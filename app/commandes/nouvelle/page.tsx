'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NouvelleCommande() {
  const router = useRouter();
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
    
    // Pré-remplir si client dans URL
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
      // Mettre à jour le nom de recherche si client pré-sélectionné
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
      // 1. Récupérer le client
      const clientId = formData.client_id;
      
      if (!clientId) {
        alert('Veuillez sélectionner un client');
        return;
      }

      // 2. Créer la commande
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

      // 3. Créer les prestations
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

      // 4. Transformer en projet automatiquement
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

      // 5. Récupérer les IDs des prestations créées
      const { data: prestationsCrees } = await supabase
        .from('prestations')
        .select('id')
        .eq('commande_id', commande.id)
        .order('created_at');

      // 6. Lier prestations au projet
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
    <div className="min-h-screen bg-[#1F2836] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Bouton retour */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[#2196F3] hover:text-[#FFFFFF] mb-6 transition-colors"
        >
          <span className="text-xl">🏠</span>
          <span className="font-medium">Retour à l'accueil</span>
        </Link>

        <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6">
          <h1 className="text-2xl font-bold mb-6 text-[#FFFFFF]">Nouvelle Commande</h1>

          <form onSubmit={creerCommande} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">N° Commande</label>
                <input
                  type="text"
                  required
                  value={formData.numero_commande}
                  onChange={(e) => setFormData({ ...formData, numero_commande: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                  placeholder="CMD-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date_commande}
                  onChange={(e) => setFormData({ ...formData, date_commande: e.target.value })}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">
                Client <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={rechercheClient}
                  onChange={(e) => setRechercheClient(e.target.value)}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF] mb-2"
                />
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => {
                    setFormData({ ...formData, client_id: e.target.value });
                    const clientSelectionne = clients.find(c => c.id === e.target.value);
                    if (clientSelectionne) setRechercheClient(clientSelectionne.nom);
                  }}
                  className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                >
                  <option value="">Sélectionner un client...</option>
                  {clients
                    .filter(client => client.nom.toLowerCase().includes(rechercheClient.toLowerCase()))
                    .map(client => (
                      <option key={client.id} value={client.id}>{client.nom}</option>
                    ))}
                </select>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Le client doit être créé au préalable dans <Link href="/clients" className="text-[#2196F3] hover:underline">Gestion des clients</Link>
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-[#FFFFFF]">Prestations</h3>
                <button
                  type="button"
                  onClick={ajouterPrestation}
                  className="bg-[#2196F3] text-white px-4 py-2 rounded hover:bg-[#1976D2] transition-colors"
                >
                  + Ajouter prestation
                </button>
              </div>

              {formData.prestations.map((prestation, index) => (
                <div key={index} className="border border-[#FFFFFF26] rounded p-4 mb-3 bg-[#1F2836] relative">
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
                      <label className="block text-sm mb-1 text-[#FFFFFF]">Type</label>
                      <select
                        value={prestation.type}
                        onChange={(e) => modifierPrestation(index, 'type', e.target.value)}
                        className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]"
                      >
                        <option value="logiciel">Logiciel</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="licence">Licence</option>
                        <option value="formation">Formation</option>
                        <option value="assistance">Assistance</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm mb-1 text-[#FFFFFF]">Libellé</label>
                      <input
                        type="text"
                        required
                        value={prestation.libelle}
                        onChange={(e) => modifierPrestation(index, 'libelle', e.target.value)}
                        className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1 text-[#FFFFFF]">Quantité</label>
                      <input
                        type="number"
                        min="1"
                        value={prestation.quantite}
                        onChange={(e) => modifierPrestation(index, 'quantite', parseInt(e.target.value) || 1)}
                        className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-sm mb-1 text-[#FFFFFF]">Prix unitaire (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prestation.prix_unitaire}
                      onChange={(e) => modifierPrestation(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]"
                    />
                  </div>

                  <div className="mt-2 text-right font-semibold text-[#2196F3]">
                    Total: {(prestation.quantite * prestation.prix_unitaire).toFixed(2)} €
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#FFFFFF26]">
              <div className="text-xl font-bold text-[#FFFFFF]">
                Montant total: {formData.prestations.reduce((sum, p) => sum + (p.quantite * p.prix_unitaire), 0).toFixed(2)} €
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#2196F3] text-white px-6 py-3 rounded font-semibold hover:bg-[#1976D2] disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Création...' : 'Créer la commande'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}