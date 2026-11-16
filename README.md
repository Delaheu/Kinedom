# KinéDom 🏥

Application de géolocalisation des patients à domicile pour **KINÉ OSTÉO PÔLE SPORT** (Blagnac).

## Fonctionnalités

- 🗺️ **Carte interactive** OpenStreetMap avec Leaflet
- 📍 **Géolocalisation GPS** — bouton "Ma position"
- 👥 **9 praticiens** avec couleurs distinctes
- ✋ **Prise en charge patients** — marqueurs colorés par praticien
- 🔔 **Notifications temps réel** — alertes à toute l'équipe
- 📋 **Liste patients** avec fiche complète (nom, adresse, téléphone)
- 🗺️ **Itinéraire Google Maps** depuis chaque fiche

---

## 🚀 Déploiement sur Vercel (recommandé)

### Étape 1 — Préparer GitHub

1. Créer un compte sur [github.com](https://github.com)
2. Créer un nouveau dépôt (bouton vert **"New"**), nommer le `kinedom`
3. Décompresser ce ZIP
4. Ouvrir un terminal dans le dossier extrait, puis :

```bash
git init
git add .
git commit -m "KinéDom initial"
git branch -M main
git remote add origin https://github.com/VOTRE_NOM/kinedom.git
git push -u origin main
```

### Étape 2 — Déployer sur Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Cliquer **"New Project"**
4. Sélectionner le dépôt `kinedom`
5. Laisser tous les paramètres par défaut (Vercel détecte Vite automatiquement)
6. Cliquer **"Deploy"**

✅ En 2 minutes, l'app est disponible sur `https://kinedom-xxx.vercel.app`

### Étape 3 — Partager l'URL à l'équipe

Chaque praticien ouvre l'URL sur son téléphone.

**Sur Android** : Chrome → menu ⋮ → "Ajouter à l'écran d'accueil"
**Sur iPhone** : Safari → bouton partage → "Sur l'écran d'accueil"

---

## 💻 Développement local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

---

## ⚠️ Note sur le stockage

En l'état, les données sont stockées en `localStorage` (par navigateur/appareil).
Pour un **vrai partage temps réel** entre praticiens sur des appareils différents,
il faudra connecter une base de données (Firebase, Supabase — gratuits).
Je peux vous aider à faire cette intégration si besoin.

---

## Technologies

- [React 18](https://react.dev)
- [Vite](https://vitejs.dev)
- [Leaflet](https://leafletjs.com) + [React-Leaflet](https://react-leaflet.js.org)
- [OpenStreetMap](https://www.openstreetmap.org) (tuiles gratuites)
- [Nominatim](https://nominatim.openstreetmap.org) (géocodage gratuit)

---

## 🏢 Agent immobilier — recherche du futur local

Un agent Claude Code cherche et suit les locaux à louer pour le cabinet : environ 200 m², 3 500 €/mois maximum tout inclus, à Blagnac, Seilh ou Beauzelle.

- `immobilier/criteres.md` — cahier des charges et grille de notation (à modifier selon vos besoins)
- `immobilier/annonces.md` — suivi des annonces trouvées, notées et commentées
- `.claude/agents/agent-immobilier.md` — définition de l'agent

Utilisation dans Claude Code : « Utilise l'agent-immobilier pour chercher de nouvelles annonces »,
« Analyse cette annonce : <lien> » ou « Prépare un mail pour l'agence de la piste n°1 ».

**Tableau de bord hebdomadaire** : https://claude.ai/artifact/LG9cuX3S9StbP1QwPx9u6c. Chaque lundi à 7 h 38, une recherche automatique y ajoute les nouvelles annonces, classées de la plus ancienne à la plus récente, avec coût TTC tout compris, résumé et photo quand elle est récupérable.
