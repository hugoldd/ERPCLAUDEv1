# ERP Gestion de Projet v1.0

Solution de gestion de projet pour la fonction publique territoriale française.

## 🚀 Fonctionnalités v1.0

### Axe 1 : Transformation commande et affectation projet
- ✅ Gestion des clients (CRUD complet)
- ✅ Contacts multiples par client
- ✅ Notes clients avec historique
- ✅ Création de commandes avec prestations
- ✅ Transformation automatique commande → projet
- ✅ Bannette d'affectation pour chef de service
- ✅ Affectation projet → Directeur de Projet

## 🛠️ Stack Technique

- **Frontend/Backend**: Next.js 14 (TypeScript)
- **Base de données**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Hébergement**: Vercel (gratuit)

## 📦 Installation

### Prérequis
- Node.js (v18+)
- Compte Supabase
- Compte GitHub (pour le versionning)

### Étapes

1. **Cloner le projet**
```bash
git clone https://github.com/votre-username/ERPCLAUDEv1.git
cd ERPCLAUDEv1
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer Supabase**

Créez un fichier `.env.local` à la racine :
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

4. **Initialiser la base de données**

Dans Supabase SQL Editor, exécutez :
```bash
database/migrations/001_initial_setup.sql
```

5. **Lancer le projet**
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
erp-gestion-projet/
├── app/                      # Pages Next.js
│   ├── page.tsx             # Accueil
│   ├── clients/             # Gestion clients
│   ├── commandes/           # Création commandes
│   └── bannette/            # Affectation projets
├── lib/
│   └── supabase.ts          # Client Supabase
├── database/
│   ├── migrations/          # Scripts SQL versionnés
│   └── backups/             # Sauvegardes
└── .env.local              # Configuration (non versionné)
```

## 🗄️ Schéma de base de données

### Tables principales
- `utilisateurs` : Directeurs de projet et chefs de service
- `clients` : Clients (collectivités territoriales)
- `contacts_clients` : Contacts multiples par client
- `notes_clients` : Notes avec historique
- `commandes` : Commandes depuis Salesforce
- `prestations` : Lignes de commande (logiciel, maintenance, etc.)
- `projets` : Projets générés depuis commandes
- `projet_prestations` : Liaison projets-prestations

## 🎨 Interface

- **Mode dark** (couleurs personnalisées)
- Navigation fluide entre modules
- Recherche et filtres
- Responsive design

## 📝 Prochaines versions

### v1.1 - Catalogues (en cours)
- Catalogue de prestations
- Packs de prestations
- Compétences requises

### v1.2 - Dashboard DP
- Vue projets affectés
- Suivi avancement

### v1.3 - Planification
- Gestion des tâches
- Timeline/Gantt

## 🤝 Contribution

1. Créez une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
2. Committez vos changements (`git commit -m 'Ajout fonctionnalité X'`)
3. Poussez la branche (`git push origin feature/nouvelle-fonctionnalite`)
4. Ouvrez une Pull Request

## 📄 Licence

Projet privé - Tous droits réservés

## 📧 Contact

Pour toute question : [votre-email]

---

**Version actuelle** : v1.0  
**Dernière mise à jour** : 06/01/2026


# 📚 Module Catalogue de Compétences

## Vue d'ensemble

Le module Catalogue de Compétences permet de gérer un référentiel centralisé des compétences de l'organisation et de les lier aux prestations, projets et consultants.

## 🗄️ Structure de la base de données

### Tables principales

#### `competences`
Catalogue central des compétences
- `id` : UUID (PK)
- `code` : Code unique (ex: TECH_SQL)
- `nom` : Nom de la compétence
- `description` : Description détaillée
- `categorie` : technique | fonctionnel | metier | soft_skills
- `niveau_requis` : debutant | intermediaire | expert
- `actif` : Compétence active ou archivée

#### `consultants`
Référentiel des consultants/ressources
- `id` : UUID (PK)
- `nom`, `prenom`, `email`
- `statut` : actif | disponible | en_mission | inactif
- `type_contrat` : interne | freelance | sous_traitant
- `tjm` : Taux journalier moyen
- `disponibilite_pct` : Pourcentage de disponibilité

#### `consultant_competences`
Compétences détenues par les consultants
- Lien consultant ↔ compétence
- `niveau_maitrise` : Niveau de maîtrise
- `annees_experience` : Années d'expérience
- `certification` : Certifié ou non

#### `prestation_competences`
Compétences requises par prestation
- Lien prestation ↔ compétence
- `niveau_requis` : Niveau minimum requis
- `priorite` : essentielle | importante | souhaitee
- `obligatoire` : Compétence obligatoire ou non

#### `projet_competences`
Compétences requises par projet
- Lien projet ↔ compétence
- `niveau_requis` : Niveau minimum requis
- `priorite` : essentielle | importante | souhaitee

#### `projet_consultants`
Affectation consultants sur projets
- Lien projet ↔ consultant
- Dates début/fin
- Charge (%)
- Rôle sur le projet

## 🎯 Fonctionnalités

### 1. Gestion du Catalogue
- ✅ Création/modification/suppression de compétences
- ✅ Catégorisation (Technique, Fonctionnel, Métier, Soft Skills)
- ✅ Définition de niveaux par défaut
- ✅ Activation/désactivation
- ✅ Recherche et filtrage

### 2. Liaison avec les Prestations (À venir)
- Définir les compétences requises par prestation
- Spécifier le niveau requis et la priorité
- Marquer les compétences obligatoires

### 3. Gestion des Consultants (À venir)
- Fiche consultant avec profil complet
- Gestion des compétences par consultant
- Suivi des certifications
- Gestion de la disponibilité

### 4. Matching Projet-Consultant (À venir)
- Algorithme de matching basé sur les compétences
- Calcul du taux de correspondance
- Recommandations d'affectation

## 📊 Vues SQL

### `v_consultant_competences`
Vue consolidée des compétences par consultant (actifs uniquement)

### `v_projet_matching_consultants`
Vue de matching entre projets et consultants avec taux de correspondance calculé

## 🔄 Workflow

```
1. CRÉATION CATALOGUE
   ↓
2. AJOUT CONSULTANTS
   ↓
3. ATTRIBUTION COMPÉTENCES AUX CONSULTANTS
   ↓
4. DÉFINITION COMPÉTENCES REQUISES PAR PRESTATION
   ↓
5. CRÉATION COMMANDE → PROJET
   ↓
6. HÉRITAGE COMPÉTENCES PRESTATIONS → PROJET
   ↓
7. MATCHING AUTOMATIQUE CONSULTANTS
   ↓
8. AFFECTATION CONSULTANT AU PROJET
```

## 🎨 Catégories de Compétences

### 💻 Techniques
Technologies, langages, outils
- Ex: SQL, Python, React, Docker

### ⚙️ Fonctionnelles
Méthodes, processus
- Ex: Analyse fonctionnelle, Tests, UX/UI

### 🏢 Métier
Domaines spécialisés
- Ex: Comptabilité publique, Marchés publics, RH

### 🤝 Soft Skills
Compétences transversales
- Ex: Communication, Leadership, Négociation

## 📈 Niveaux de Compétence

- 🌱 **Débutant** : Notions de base, accompagnement requis
- 🌿 **Intermédiaire** : Autonomie sur tâches courantes
- 🌳 **Expert** : Maîtrise complète, capacité à former

## 🔗 Intégrations

### Avec les Prestations
Les compétences requises sont définies au niveau des prestations du catalogue. Lors de la transformation d'une commande en projet, ces compétences sont automatiquement héritées.

### Avec les Projets
Les projets héritent des compétences de leurs prestations. Il est possible d'ajuster/compléter manuellement.

### Avec les Consultants
Chaque consultant dispose d'un profil de compétences détaillé avec niveaux, expérience et certifications.

## 🚀 Prochaines Étapes

1. ✅ Structure base de données
2. ✅ Page catalogue de compétences
3. ⏳ Module Consultants
4. ⏳ Page Gestion Prestations avec compétences
5. ⏳ Page Projet avec compétences requises
6. ⏳ Algorithme de matching
7. ⏳ Dashboard de disponibilité des ressources
8. ⏳ Rapports et analytics

## 💡 Utilisation

### Créer une compétence
```typescript
await supabase.from('competences').insert({
  code: 'TECH_SQL',
  nom: 'SQL / Bases de données',
  description: 'Maîtrise des requêtes SQL...',
  categorie: 'technique',
  niveau_requis: 'intermediaire',
  actif: true
});
```

### Lier une compétence à un consultant
```typescript
await supabase.from('consultant_competences').insert({
  consultant_id: 'uuid',
  competence_id: 'uuid',
  niveau_maitrise: 'expert',
  annees_experience: 5,
  certification: true
});
```

### Rechercher des consultants avec une compétence
```sql
SELECT * FROM v_consultant_competences
WHERE competence_code = 'TECH_SQL'
  AND niveau_maitrise = 'expert';
```

## 📝 Notes de développement

- Les codes de compétences doivent être uniques et en majuscules
- Préfixer par catégorie recommandé (TECH_, FUNC_, MET_, SOFT_)
- Les compétences inactives restent en base (soft delete)
- Les niveaux sont standardisés (3 niveaux uniquement)
- La vue de matching se met à jour automatiquement

## 🔒 Sécurité

- Seuls les admins peuvent gérer le catalogue
- Les DPs peuvent voir toutes les compétences
- Les consultants peuvent voir leur propre profil
- RLS (Row Level Security) à configurer selon les besoins