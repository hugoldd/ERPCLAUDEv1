/* =========================================================
   types/clients.ts
   Contrats TypeScript partagés – Module Fiches Clients
   (Aligné sur les imports/champs attendus par vos composants)
   ========================================================= */

/* =========================
   Utilitaires
   ========================= */

export type ISODateString = string;

/* =========================
   Enums / Unions
   ========================= */

export type ClientStatut = 'actif' | 'prospect' | 'inactif';

export type ClientAlerteNiveau = 'info' | 'success' | 'warning' | 'danger' | 'critique';

export type ClientActivityEventType =
  | 'creation'
  | 'mise_a_jour'
  | 'contact'
  | 'projet'
  | 'commande'
  | 'note'
  | 'document'
  | 'finance'
  | 'alerte';

/* =========================
   Table: clients
   ========================= */

export interface Client {
  id: string;
  nom: string;
  type_structure?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  contact_principal?: string | null;
  email_contact?: string | null;
  telephone_contact?: string | null;
  historique_notes?: string | null;
  siret?: string | null;
  notes_libres?: string | null;
  statut: ClientStatut;
  created_at: ISODateString;
  updated_at?: ISODateString | null;
}

/* =========================
   Contacts
   ========================= */

export interface ClientContact {
  id: string;
  client_id: string;
  nom: string;
  prenom?: string | null;
  fonction?: string | null;
  email?: string | null;
  telephone?: string | null;
  principal: boolean;

  /* Vos composants utilisent "notes" */
  notes?: string | null;

  created_at: ISODateString;
}

/* =========================
   Projets (alias attendu: Projet)
   ========================= */

export type ProjetStatut = 'brouillon' | 'en_cours' | 'termine' | 'annule';

export interface Projet {
  id: string;
  client_id: string;
  nom: string;
  description?: string | null;
  statut: ProjetStatut | string;
  date_debut?: ISODateString | null;
  date_fin?: ISODateString | null;
  created_at: ISODateString;
}

/* =========================
   Commandes (alias attendu: Commande)
   ========================= */

export type CommandeStatut = 'brouillon' | 'validee' | 'en_cours' | 'terminee' | 'annulee';

export interface Commande {
  id: string;
  client_id: string;
  reference?: string | null;
  statut: CommandeStatut | string;
  montant_total?: number | null;
  created_at: ISODateString;
}

/* =========================
   Notes & Documents
   - vos composants demandent aussi "ClientDocument"
   ========================= */

export type ClientNoteType = 'note' | 'document';

export interface ClientNote {
  id: string;
  client_id: string;
  titre?: string | null;
  contenu: string;
  type?: ClientNoteType | null;
  fichier_url?: string | null;
  created_at: ISODateString;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  nom: string;
  url?: string | null;
  mime_type?: string | null;
  taille?: number | null;
  created_at: ISODateString;
}

/* =========================
   Alertes
   - vos composants utilisent: actif, niveau, date_echeance
   ========================= */

export interface ClientAlerte {
  id: string;
  client_id: string;
  titre: string;
  message: string;

  /* Champs attendus par vos composants */
  actif: boolean;
  niveau: ClientAlerteNiveau;
  date_echeance?: ISODateString | null;

  created_at: ISODateString;
  resolved_at?: ISODateString | null;
}

/* =========================
   Satisfaction
   - vos composants importent "ClientSatisfactionEvaluation"
   ========================= */

export type SatisfactionScore = 1 | 2 | 3 | 4 | 5;

export interface ClientSatisfactionEvaluation {
  id: string;
  client_id: string;
  score: SatisfactionScore;
  commentaire?: string | null;
  created_at: ISODateString;
}

/* =========================
   Finance
   - vos composants importent: ClientInvoice, ClientPayment
   ========================= */

export type InvoiceStatut = 'brouillon' | 'emise' | 'payee' | 'en_retard' | 'annulee';
export type PaymentMode = 'virement' | 'cb' | 'cheque' | 'especes' | 'autre';

export interface ClientInvoice {
  id: string;
  client_id: string;
  reference?: string | null;
  statut: InvoiceStatut | string;
  montant_ht?: number | null;
  montant_ttc?: number | null;
  date_emission?: ISODateString | null;
  date_echeance?: ISODateString | null;
  created_at: ISODateString;
}

export interface ClientPayment {
  id: string;
  client_id: string;
  invoice_id?: string | null;
  montant: number;
  mode?: PaymentMode | string | null;
  date_paiement?: ISODateString | null;
  created_at: ISODateString;
}

/* =========================
   Timeline / Activité
   - vos composants importent: ClientActivityEvent(+Type)
   ========================= */

export interface ClientActivityEvent {
  id: string;
  client_id: string;
  type: ClientActivityEventType;
  label: string;
  description?: string | null;
  created_at: ISODateString;
}

/* =========================
   Agrégats Dashboard (optionnel)
   ========================= */

export interface ClientDashboardStats {
  projets_actifs: number;
  commandes_total: number;
  chiffre_affaires?: number | null;
  satisfaction_moyenne?: number | null;
  alertes_actives: number;
}
