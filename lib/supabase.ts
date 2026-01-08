// Fichier : lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// TYPES EXISTANTS
// ============================================
export interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'dp' | 'chef_service' | 'admin';
  actif: boolean;
}

export interface Client {
  id: string;
  nom: string;
  type_structure?: string;
  code_postal?: string;
  ville?: string;
  contact_principal?: string;
  email_contact?: string;
}

export interface Commande {
  id: string;
  numero_commande: string;
  client_id: string;
  date_commande: string;
  montant_total: number;
  statut: 'recue' | 'transformee' | 'annulee';
  source: string;
}

export interface Prestation {
  id: string;
  commande_id: string;
  code_prestation: string;
  type_prestation: 'logiciel' | 'maintenance' | 'licence' | 'formation' | 'assistance';
  libelle: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

export interface Projet {
  id: string;
  numero_projet: string;
  commande_id: string;
  client_id: string;
  titre: string;
  description?: string;
  dp_affecte_id?: string;
  statut: 'bannette' | 'affecte' | 'en_cours' | 'termine' | 'cloture';
  date_creation: string;
  date_affectation?: string;
  date_debut_prevue?: string;
  date_fin_prevue?: string;
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  budget_total: number;
  notes_affectation?: string;
}

// ============================================
// NOUVEAUX TYPES - COMPÉTENCES
// ============================================
export interface Competence {
  id: string;
  code: string;
  nom: string;
  description?: string;
  categorie: 'technique' | 'fonctionnel' | 'metier' | 'soft_skills';
  niveau_requis: 'debutant' | 'intermediaire' | 'expert';
  actif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Consultant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  statut: 'actif' | 'disponible' | 'en_mission' | 'inactif';
  type_contrat?: 'interne' | 'freelance' | 'sous_traitant';
  date_entree?: string;
  date_sortie?: string;
  tjm?: number;
  disponibilite_pct: number;
  photo_url?: string;
  cv_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConsultantCompetence {
  id: string;
  consultant_id: string;
  competence_id: string;
  niveau_maitrise: 'debutant' | 'intermediaire' | 'expert';
  annees_experience?: number;
  date_acquisition?: string;
  derniere_utilisation?: string;
  certification: boolean;
  nom_certification?: string;
  date_certification?: string;
  organisme_certification?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PrestationCompetence {
  id: string;
  prestation_id: string;
  competence_id: string;
  niveau_requis: 'debutant' | 'intermediaire' | 'expert';
  priorite: 'essentielle' | 'importante' | 'souhaitee';
  obligatoire: boolean;
  created_at?: string;
}

export interface ProjetCompetence {
  id: string;
  projet_id: string;
  competence_id: string;
  niveau_requis: 'debutant' | 'intermediaire' | 'expert';
  priorite: 'essentielle' | 'importante' | 'souhaitee';
  obligatoire: boolean;
  created_at?: string;
}

export interface ProjetConsultant {
  id: string;
  projet_id: string;
  consultant_id: string;
  date_debut: string;
  date_fin?: string;
  charge_pct: number;
  role?: string;
  tjm_facture?: number;
  statut: 'actif' | 'termine' | 'suspendu';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// TYPES POUR LES VUES
// ============================================
export interface ConsultantAvecCompetences extends Consultant {
  competences?: Array<{
    competence: Competence;
    niveau_maitrise: string;
    annees_experience?: number;
    certification: boolean;
  }>;
}

export interface ProjetAvecCompetences extends Projet {
  competences_requises?: Array<{
    competence: Competence;
    niveau_requis: string;
    priorite: string;
    obligatoire: boolean;
  }>;
}

export interface MatchingConsultant {
  projet_id: string;
  consultant_id: string;
  nom: string;
  prenom: string;
  statut: string;
  disponibilite_pct: number;
  competences_requises: number;
  competences_matchees: number;
  taux_matching: number;
}