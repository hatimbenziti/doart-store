# DoArt Store 🇲🇦

Boutique e-commerce moderne, minimaliste et raffinée conçue pour la marque de vêtements marocaine **DoArt Store**.
Le site utilise exclusivement le **Paiement à la Livraison (Cash on Delivery - COD)** avec **confirmation de commande directe sur WhatsApp**, connecté à **Supabase** pour la persistance des données, la gestion des stocks par variante (taille et couleur) et l'espace administrateur.

---

## 🎨 Identité Visuelle & Palette DoArt Store

- **Terracotta Principale :** `#CF7644`
- **Beige Doux :** `#F1D7C5`
- **Blanc Épuré :** `#FFFFFF`
- **Anthracite Profond :** `#181818`

---

## 🚀 Fonctionnalités Clés

### 1. Vitrine Client (Storefront)
- **Page d'accueil :** Bannière éditoriale, slogan de marque, collections signatures, nouveautés, best-sellers, et galerie Instagram.
- **Catalogue & Boutique :** Grille responsive (2 colonnes mobile, 4 colonnes desktop), recherche instantanée, filtres dynamiques par catégorie, taille (S, M, L, XL, etc.) et couleur, tri par prix et nouveauté.
- **Fiche Produit Détaillée :** Galerie multi-photos, sélection visuelle des teintes avec nuancier, sélecteur de taille intelligent (désactivation en direct des variantes en rupture), indicateur de stock en temps réel, guide des tailles marocaines et modalités de livraison.
- **Panier d'Achats :** Tiroir latéral avec ajustement des quantités sous contrainte de stock disponible, calcul des frais de livraison offerts dès 600 DH, et récapitulatif COD clair.

### 2. Tunnel de Commande WhatsApp COD
- **Paiement en espèces à la livraison (COD) :** Aucun paiement bancaire en ligne n'est demandé.
- **Formulaire de livraison marocain simplifié :** Nom complet, Téléphone WhatsApp, Ville de destination (Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir, etc.), Adresse complète et Remarques.
- **Génération automatique de la référence :** Format unique `#DOA-2026-XXXX`.
- **Enregistrement Supabase :** Création de la commande avec statut initial `Pending WhatsApp Confirmation`.
- **Message WhatsApp structuré :** Message pré-rempli et formaté avec émoticônes, détail des articles, tailles, couleurs, prix unitaires, total en MAD et rappel du paiement en espèces.
- **Ouverture instantanée de WhatsApp :** Redirection via l'API officielle `https://wa.me/[NUMERO_WHATSAPP]?text=[MESSAGE_ENCODE]`.

### 3. Tableau de Bord Administrateur (`/admin`)
- **Aperçu & KPI :** Total des commandes, commandes en attente WhatsApp, confirmées, livrées, chiffre d'affaires total (MAD) et total de produits actifs.
- **Gestion des Produits :** Ajout, modification, désactivation et suppression avec photos multiples.
- **Gestion Avancée des Variantes & Stocks :**
  - Ajout/suppression dynamique des tailles.
  - Ajout/suppression des couleurs avec sélecteur chromatique HEX.
  - Matrice complète des stocks : saisie indépendante de la quantité disponible pour chaque combinaison Taille × Couleur.
- **Gestion des Commandes :**
  - Consultation des coordonnées client et bouton WhatsApp direct pour discuter avec l'acheteur.
  - Changement de statut (`Pending WhatsApp Confirmation`, `Confirmed`, `Preparing`, `Shipped`, `Delivered`, `Cancelled`).
  - **Réintégration automatique du stock en cas d'annulation de commande**.
- **Paramètres de la Boutique :** Modification du numéro WhatsApp de réception des commandes, frais de port, et lien Instagram.
- **Guide Supabase & SQL :** Visualisation et copie en 1 clic du script SQL complet pour PostgreSQL.

---

## 🗄️ Structure de la Base de Données Supabase

Le schéma complet est disponible dans le fichier [`/src/lib/database.sql`](./src/lib/database.sql).

### Tables principales :
- `categories` : Lignes et collections (nom, slug, image).
- `products` : Produits principaux (nom, description, prix, discount, images, statuts).
- `product_variants` : Variantes avec stock individuel (`product_id`, `size`, `color_name`, `color_hex`, `stock_quantity`, `sku`).
- `orders` : Commandes COD avec référence, client, téléphone, ville, adresse, montants et statut.
- `order_items` : Lignes de commande détaillant la variante, la taille et la couleur choisie.
- `store_settings` : Numéro WhatsApp officiel, coordonnées et paramètres de livraison.

---

## ⚙️ Installation & Démarrage Local

```bash
# 1. Cloner le projet
git clone https://github.com/votre-compte/doart-store.git
cd doart-store

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env

# Renseignez dans .env :
# VITE_SUPABASE_URL="https://votre-projet.supabase.co"
# VITE_SUPABASE_ANON_KEY="votre-cle-publique-anon"

# 4. Lancer le serveur de développement
npm run dev
```

L'application démarre sur `http://localhost:3000`.

---

## ☁️ Déploiement sur Vercel & GitHub

1. Poussez le code sur votre dépôt **GitHub**.
2. Sur **Vercel** (`https://vercel.com`), cliquez sur **Add New... → Project** et sélectionnez votre dépôt.
3. Dans la section **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` : L'URL de votre projet Supabase.
   - `VITE_SUPABASE_ANON_KEY` : La clé anon publique de votre projet Supabase.
4. Cliquez sur **Deploy**.
5. Chaque mise à jour sur votre branche principale déclenchera un déploiement automatique sur Vercel.

---

## 📦 Configuration du Stockage Supabase (Images)

1. Dans le tableau de bord Supabase, rendez-vous dans l'onglet **Storage**.
2. Créez un bucket public nommé `products`.
3. Les politiques de sécurité (RLS) définies dans [`src/lib/database.sql`](./src/lib/database.sql) permettent la lecture publique des images et restreignent l'upload aux utilisateurs authentifiés.

---

Conçu avec passion pour la mode marocaine contemporaine. 🇲🇦
