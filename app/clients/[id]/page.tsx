'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Composant pour afficher une note
function NoteItem({ note, onModifier, onSupprimer }: { 
  note: { id: string, contenu: string, created_at: string, updated_at: string },
  onModifier: (id: string, contenu: string) => void,
  onSupprimer: (id: string) => void
}) {
  const [edition, setEdition] = useState(false);
  const [contenu, setContenu] = useState(note.contenu);

  const dateCreation = new Date(note.created_at).toLocaleDateString('fr-FR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  const dateModification = new Date(note.updated_at).toLocaleDateString('fr-FR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  const estModifiee = note.created_at !== note.updated_at;

  return (
    <div className="bg-[#1F2836] border border-[#FFFFFF26] rounded p-3 mb-3">
      <div className="grid grid-cols-12 gap-3 text-xs text-gray-400 mb-2">
        <div className="col-span-4">
          <strong className="text-[#FFFFFF]">Créée le:</strong><br/>
          {dateCreation}
        </div>
        <div className="col-span-4">
          <strong className="text-[#FFFFFF]">Modifiée le:</strong><br/>
          {estModifiee ? dateModification : '-'}
        </div>
        <div className="col-span-4 flex justify-end gap-2">
          {!edition ? (
            <>
              <button
                onClick={() => setEdition(true)}
                className="text-[#2196F3] hover:text-[#FFFFFF]"
              >
                ✏️
              </button>
              <button
                onClick={() => onSupprimer(note.id)}
                className="text-red-400 hover:text-red-300"
              >
                🗑️
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEdition(false);
                  setContenu(note.contenu);
                }}
                className="text-gray-400 hover:text-[#FFFFFF]"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onModifier(note.id, contenu);
                  setEdition(false);
                }}
                className="text-[#2196F3] hover:text-[#FFFFFF]"
              >
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>
      {edition ? (
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          rows={4}
          className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
        />
      ) : (
        <div className="text-[#FFFFFF] whitespace-pre-wrap">{note.contenu}</div>
      )}
    </div>
  );
}

interface Client {
  id: string;
  nom: string;
  type_structure?: string;
  siret?: string;
  code_postal?: string;
  ville?: string;
  contact_principal?: string;
  email_contact?: string;
  telephone_contact?: string;
  statut: string;
  historique_notes?: string;
  created_at: string;
}

interface Contact {
  id: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  principal: boolean;
  notes?: string;
}

interface Note {
  id: string;
  contenu: string;
  created_at: string;
  updated_at: string;
}

interface Projet {
  id: string;
  numero_projet: string;
  titre: string;
  statut: string;
  budget_total: number;
  date_creation: string;
}

export default function FicheClient() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeEdition, setModeEdition] = useState(false);
  const [formData, setFormData] = useState<Client | null>(null);
  const [contactsDeplie, setContactsDeplie] = useState(true);
  const [notesDeplie, setNotesDeplie] = useState(true);
  const [nouveauContact, setNouveauContact] = useState(false);
  const [nouvelleNote, setNouvelleNote] = useState(false);
  const [confirmationSuppression, setConfirmationSuppression] = useState(0);

  useEffect(() => {
    chargerDonnees();
  }, [clientId]);

  const chargerDonnees = async () => {
    setLoading(true);

    const { data: clientData, error: erreurClient } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (erreurClient) {
      console.error('Erreur chargement client:', erreurClient);
      alert('Client non trouvé');
      router.push('/clients');
      return;
    }

    setClient(clientData);
    setFormData(clientData);

    const { data: contactsData } = await supabase
      .from('contacts_clients')
      .select('*')
      .eq('client_id', clientId)
      .order('principal', { ascending: false });

    setContacts(contactsData || []);

    const { data: notesData } = await supabase
      .from('notes_clients')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    setNotes(notesData || []);

    const { data: projetsData } = await supabase
      .from('projets')
      .select('*')
      .eq('client_id', clientId)
      .order('date_creation', { ascending: false });

    setProjets(projetsData || []);
    setLoading(false);
  };

  const sauvegarderModifications = async () => {
    if (!formData) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update(formData)
        .eq('id', clientId);

      if (error) throw error;

      setClient(formData);
      setModeEdition(false);
      alert('Client mis à jour avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const supprimerClient = async () => {
    if (confirmationSuppression < 2) {
      setConfirmationSuppression(confirmationSuppression + 1);
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      alert('Client supprimé avec succès');
      router.push('/clients');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression. Vérifiez qu\'il n\'y a pas de projets liés.');
    }
  };

  const ajouterContact = async (contactData: Partial<Contact>) => {
    try {
      const { error } = await supabase
        .from('contacts_clients')
        .insert({ ...contactData, client_id: clientId });

      if (error) throw error;

      chargerDonnees();
      setNouveauContact(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout du contact');
    }
  };

  const supprimerContact = async (contactId: string) => {
    if (!confirm('Supprimer ce contact ?')) return;

    try {
      const { error } = await supabase
        .from('contacts_clients')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      chargerDonnees();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const ajouterNote = async (contenu: string) => {
    try {
      const { error } = await supabase
        .from('notes_clients')
        .insert({ client_id: clientId, contenu });

      if (error) throw error;

      chargerDonnees();
      setNouvelleNote(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout de la note');
    }
  };

  const modifierNote = async (noteId: string, contenu: string) => {
    try {
      const { error } = await supabase
        .from('notes_clients')
        .update({ contenu, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
      chargerDonnees();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification');
    }
  };

  const supprimerNote = async (noteId: string) => {
    if (!confirm('Supprimer cette note ?')) return;

    try {
      const { error } = await supabase
        .from('notes_clients')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      chargerDonnees();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-500/20 text-green-300 border-green-500';
      case 'prospect': return 'bg-blue-500/20 text-blue-300 border-blue-500';
      case 'inactif': return 'bg-gray-500/20 text-gray-300 border-gray-500';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500';
    }
  };

  const getProjetStatutColor = (statut: string) => {
    switch (statut) {
      case 'bannette': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
      case 'affecte': return 'bg-blue-500/20 text-blue-300 border-blue-500';
      case 'en_cours': return 'bg-[#2196F3]/20 text-[#2196F3] border-[#2196F3]';
      case 'termine': return 'bg-green-500/20 text-green-300 border-green-500';
      case 'cloture': return 'bg-gray-500/20 text-gray-300 border-gray-500';
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

  if (!client) return null;

  return (
    <div className="min-h-screen bg-[#1F2836] p-8">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/clients" 
          className="inline-flex items-center gap-2 text-[#2196F3] hover:text-[#FFFFFF] mb-6 transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="font-medium">Retour à la liste</span>
        </Link>

        <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#FFFFFF] mb-2">{client.nom}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatutColor(client.statut)}`}>
                {client.statut}
              </span>
            </div>
            <div className="flex gap-2">
              {!modeEdition ? (
                <>
                  <button
                    onClick={() => setModeEdition(true)}
                    className="bg-[#2196F3] text-white px-4 py-2 rounded font-semibold hover:bg-[#1976D2] transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={supprimerClient}
                    className={`${
                      confirmationSuppression === 0 ? 'bg-red-600' :
                      confirmationSuppression === 1 ? 'bg-red-700' : 'bg-red-900'
                    } text-white px-4 py-2 rounded font-semibold hover:bg-red-800 transition-colors`}
                  >
                    {confirmationSuppression === 0 ? '🗑️ Supprimer' :
                     confirmationSuppression === 1 ? '⚠️ Confirmer ?' : '❌ SUPPRIMER DÉFINITIVEMENT'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setFormData(client);
                      setModeEdition(false);
                    }}
                    className="bg-[#1F2836] border border-[#FFFFFF26] text-[#FFFFFF] px-4 py-2 rounded hover:bg-[#2E3744] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={sauvegarderModifications}
                    className="bg-[#2196F3] text-white px-4 py-2 rounded font-semibold hover:bg-[#1976D2] transition-colors"
                  >
                    💾 Sauvegarder
                  </button>
                </>
              )}
              <Link href={`/commandes/nouvelle?client=${clientId}`}>
                <button className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition-colors">
                  + Nouvelle commande
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Informations générales */}
            <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6">
              <h2 className="text-xl font-bold text-[#FFFFFF] mb-4">Informations générales</h2>
              
              {modeEdition && formData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Nom</label>
                      <input
                        type="text"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Type</label>
                      <select
                        value={formData.type_structure || ''}
                        onChange={(e) => setFormData({ ...formData, type_structure: e.target.value })}
                        className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                      >
                        <option value="">-</option>
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
                        value={formData.siret || ''}
                        onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                        className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Code postal</label>
                      <input
                        type="text"
                        value={formData.code_postal || ''}
                        onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                        className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 text-[#FFFFFF]">Ville</label>
                      <input
                        type="text"
                        value={formData.ville || ''}
                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                        className="w-full bg-[#1F2836] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF]"
                      />
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
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-[#FFFFFF]">
                  <div><strong>Type :</strong> {client.type_structure || '-'}</div>
                  <div><strong>SIRET :</strong> {client.siret || '-'}</div>
                  <div><strong>Code postal :</strong> {client.code_postal || '-'}</div>
                  <div><strong>Ville :</strong> {client.ville || '-'}</div>
                  <div className="col-span-2"><strong>Créé le :</strong> {new Date(client.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              )}
            </div>

            {/* Contacts multiples */}
            <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#FFFFFF]">Contacts ({contacts.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setContactsDeplie(!contactsDeplie)}
                    className="text-[#2196F3] hover:text-[#FFFFFF] text-sm"
                  >
                    {contactsDeplie ? '▼ Réduire tout' : '▶ Déplier tout'}
                  </button>
                  <button
                    onClick={() => setNouveauContact(true)}
                    className="bg-[#2196F3] text-white px-3 py-1 rounded text-sm hover:bg-[#1976D2]"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              {nouveauContact && (
                <div className="bg-[#1F2836] border border-[#FFFFFF26] rounded p-4 mb-4">
                  <h3 className="font-semibold text-[#FFFFFF] mb-3">Nouveau contact</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    ajouterContact({
                      nom: form.contact_nom.value,
                      prenom: form.contact_prenom.value,
                      fonction: form.contact_fonction.value,
                      email: form.contact_email.value,
                      telephone: form.contact_tel.value,
                      principal: false
                    });
                  }}>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input name="contact_nom" placeholder="Nom *" required className="bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]" />
                      <input name="contact_prenom" placeholder="Prénom" className="bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]" />
                      <input name="contact_fonction" placeholder="Fonction" className="bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]" />
                      <input name="contact_email" type="email" placeholder="Email" className="bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]" />
                      <input name="contact_tel" type="tel" placeholder="Téléphone" className="bg-[#2E3744] border border-[#FFFFFF26] rounded px-2 py-1 text-[#FFFFFF]" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setNouveauContact(false)} className="bg-[#2E3744] text-[#FFFFFF] px-3 py-1 rounded text-sm">Annuler</button>
                      <button type="submit" className="bg-[#2196F3] text-white px-3 py-1 rounded text-sm">Ajouter</button>
                    </div>
                  </form>
                </div>
              )}

              {contactsDeplie && contacts.length === 0 && (
                <p className="text-[#FFFFFF] text-center py-4">Aucun contact enregistré</p>
              )}

              {contactsDeplie && contacts.map((contact) => (
                <div key={contact.id} className="bg-[#1F2836] border border-[#FFFFFF26] rounded p-3 mb-2">
                  <div className="flex justify-between">
                    <div className="text-[#FFFFFF]">
                      <div className="font-semibold">{contact.prenom} {contact.nom} {contact.principal && '⭐'}</div>
                      {contact.fonction && <div className="text-sm text-gray-300">{contact.fonction}</div>}
                      {contact.email && <div className="text-sm">{contact.email}</div>}
                      {contact.telephone && <div className="text-sm">{contact.telephone}</div>}
                    </div>
                    <button
                      onClick={() => supprimerContact(contact.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes libres avec historique */}
            <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#FFFFFF]">Notes ({notes.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotesDeplie(!notesDeplie)}
                    className="text-[#2196F3] hover:text-[#FFFFFF] text-sm"
                  >
                    {notesDeplie ? '▼ Réduire tout' : '▶ Déplier tout'}
                  </button>
                  <button
                    onClick={() => setNouvelleNote(true)}
                    className="bg-[#2196F3] text-white px-3 py-1 rounded text-sm hover:bg-[#1976D2]"
                  >
                    + Ajouter une note
                  </button>
                </div>
              </div>

              {nouvelleNote && (
                <div className="bg-[#1F2836] border border-[#FFFFFF26] rounded p-4 mb-4">
                  <h3 className="font-semibold text-[#FFFFFF] mb-3">Nouvelle note</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    ajouterNote(form.note_contenu.value);
                    form.reset();
                  }}>
                    <textarea
                      name="note_contenu"
                      required
                      rows={4}
                      placeholder="Contenu de la note..."
                      className="w-full bg-[#2E3744] border border-[#FFFFFF26] rounded px-3 py-2 text-[#FFFFFF] mb-3"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setNouvelleNote(false)} className="bg-[#2E3744] text-[#FFFFFF] px-3 py-1 rounded text-sm">Annuler</button>
                      <button type="submit" className="bg-[#2196F3] text-white px-3 py-1 rounded text-sm">Ajouter</button>
                    </div>
                  </form>
                </div>
              )}

              {notesDeplie && notes.length === 0 && (
                <p className="text-[#FFFFFF] text-center py-4">Aucune note enregistrée</p>
              )}

              {notesDeplie && notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  onModifier={modifierNote}
                  onSupprimer={supprimerNote}
                />
              ))}
            </div>
          </div>

          {/* Historique projets */}
          <div className="bg-[#2E3744] rounded-lg border border-[#FFFFFF26] p-6 h-fit">
            <h2 className="text-xl font-bold text-[#FFFFFF] mb-4">Projets ({projets.length})</h2>
            
            {projets.length === 0 ? (
              <p className="text-[#FFFFFF] text-center py-8">Aucun projet</p>
            ) : (
              <div className="space-y-3">
                {projets.map((projet) => (
                  <div key={projet.id} className="bg-[#1F2836] border border-[#FFFFFF26] rounded p-3 hover:border-[#2196F3] transition-colors cursor-pointer">
                    <div className="text-sm font-semibold text-[#FFFFFF] mb-1">{projet.numero_projet}</div>
                    <div className="text-xs text-[#FFFFFF] mb-2">{projet.titre}</div>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs border ${getProjetStatutColor(projet.statut)}`}>
                        {projet.statut}
                      </span>
                      <span className="text-xs text-[#FFFFFF]">{projet.budget_total.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}