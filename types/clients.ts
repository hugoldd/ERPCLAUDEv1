/* =========================================================
   ./types/clients.ts
   Contrats TypeScript partagés – Module Fiches Clients
   Aligné sur VOS tables Supabase réelles (schéma fourni)
   ========================================================= */

export type ISODateString = string;

/* =========================
   Table: clients
   ========================= */

export type ClientStatut = 'actif' | 'inactif' | 'prospect';

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
  updated_at: ISODateString;
}

/* =========================
   Table: contacts_clients
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
  notes?: string | null;
  created_at: ISODateString;
}

/* =========================
   Table: commandes
   ========================= */

export type CommandeStatut = 'recue' | 'transformee' | 'annulee';

export interface Commande {
  id: string;
  client_id?: string | null;
  numero_commande: string;
  date_commande: ISODateString; // date => string côté JS
  montant_total?: number | null;
  statut: CommandeStatut;
  source?: string | null;
  data_salesforce?: Record<string, unknown> | null;
  created_at: ISODateString;
}

/* =========================
   Table: prestations
   (liées aux commandes)
   ========================= */

export type PrestationType =
  | 'logiciel'
  | 'maintenance'
  | 'licence'
  | 'formation'
  | 'assistance';

export interface Prestation {
  id: string;
  commande_id?: string | null;
  code_prestation: string;
  type_prestation?: PrestationType | null;
  libelle: string;
  quantite?: number | null;
  prix_unitaire?: number | null;
  montant_total?: number | null;
  couleur_code?: string | null;
  notes?: string | null;
  created_at: ISODateString;
}

/* =========================
   Table: projets
   ========================= */

export type ProjetStatut =
  | 'bannette'
  | 'affecte'
  | 'en_cours'
  | 'termine'
  | 'cloture';

export type ProjetPriorite = 'basse' | 'normale' | 'haute' | 'urgente';

export interface Projet {
  id: string;
  numero_projet: string;
  commande_id?: string | null;
  client_id?: string | null;
  titre: string;
  description?: string | null;
  dp_affecte_id?: string | null;

  statut: ProjetStatut;
  date_creation?: ISODateString | null;
  date_affectation?: ISODateString | null;
  date_debut_prevue?: ISODateString | null;
  date_fin_prevue?: ISODateString | null;
  date_cloture?: ISODateString | null;

  priorite?: ProjetPriorite | null;
  budget_total?: number | null;
  notes_affectation?: string | null;

  created_at: ISODateString;
  updated_at: ISODateString;

  // champs additionnels présents dans votre table projets
  charge_totale_estimee_jours?: number | null;
  complexite?: string | null;
  type_intervention?: string | null;
  ratio_hybride?: Record<string, unknown> | null;
  consultant_impose_id?: string | null;
  consultant_prefere_id?: string | null;
  periodes_interdites?: Record<string, unknown> | null;
  periodes_forte_activite?: Record<string, unknown> | null;
  necessite_connaissance_org?: boolean | null;
  domaine_metier?: string | null;
  continuite_requise?: boolean | null;
  delai_demarrage?: string | null;
}

/* =========================
   Table: notes_clients
   ========================= */

export interface ClientNote {
  id: string;
  client_id?: string | null;
  contenu: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* =========================
   Table: client_documents
   ========================= */

export type ClientDocumentStatut =
  | 'simule'
  | 'upload_en_cours'
  | 'upload_ok'
  | 'upload_ko';

export interface ClientDocument {
  id: string;
  client_id: string;
  nom: string;
  type_mime?: string | null;
  taille_octets?: number | null;
  url?: string | null;
  statut: ClientDocumentStatut;
  tags: string[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* =========================
   Table: client_alertes
   ========================= */

export type ClientAlerteNiveau = 'info' | 'warning' | 'danger';

export interface ClientAlerte {
  id: string;
  client_id: string;
  niveau: ClientAlerteNiveau;
  titre: string;
  message?: string | null;
  actif: boolean;
  date_echeance?: ISODateString | null;
  resolved_at?: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* =========================
   Table: client_satisfaction_evaluations
   ========================= */

export type SatisfactionScore = 1 | 2 | 3 | 4 | 5;

export interface ClientSatisfactionEvaluation {
  id: string;
  client_id: string;
  date_evaluation: ISODateString;
  score: SatisfactionScore;
  categorie?: string | null;
  commentaire?: string | null;
  source?: string | null;
  created_at: ISODateString;
}

/* =========================
   Tables: client_finance_invoices / client_finance_payments
   ========================= */

export type InvoiceStatut =
  | 'brouillon'
  | 'emise'
  | 'payee'
  | 'en_retard'
  | 'annulee';

export interface ClientInvoice {
  id: string;
  client_id: string;
  numero: string;
  date_emission: ISODateString;
  date_echeance?: ISODateString | null;
  montant_ht?: number | null;
  montant_ttc?: number | null;
  devise?: string | null;
  statut: InvoiceStatut;
  notes?: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ClientPayment {
  id: string;
  client_id: string;
  invoice_id?: string | null;
  date_paiement: ISODateString;
  montant: number;
  mode?: string | null;
  reference?: string | null;
  created_at: ISODateString;
}

/* =========================
   Table: client_kpi_snapshots
   ========================= */

export interface ClientKpiSnapshot {
  id: string;
  client_id: string;
  periode_mois: ISODateString;
  ca_ttc?: number | null;
  marge?: number | null;
  nps?: number | null;
  satisfaction_moyenne?: number | null;
  nb_projets_actifs?: number | null;
  nb_commandes?: number | null;
  created_at: ISODateString;
}

/* =========================
   Table: client_activity_events
   ========================= */

export type ClientActivityEventType =
  | 'note'
  | 'contact'
  | 'commande'
  | 'projet'
  | 'finance'
  | 'alerte'
  | 'document'
  | 'system';

export interface ClientActivityEvent {
  id: string;
  client_id: string;
  type_event: ClientActivityEventType;
  titre: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: ISODateString;
  created_by?: string | null;
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
