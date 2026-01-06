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