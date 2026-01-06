// Fichier : lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types TypeScript pour nos tables
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