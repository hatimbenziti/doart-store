# Dossier des Images Locales - DoArt Store

Ce dossier vous permet de déposer toutes vos propres photos pour les utiliser directement sur le site et dans le tableau de bord administrateur.

---

## 📁 Organisation Recommandée

- `/public/images/products/` : Photos de vos vêtements, survêtements, djellabas, etc.
- `/public/images/categories/` : Photos de couverture pour les collections.
- `/public/images/banners/` : Images pour les bannières publicitaires et promotions.

---

## 💡 Comment les utiliser dans le site ?

Dans Vite et React, tout fichier placé dans `/public/images/` est directement accessible depuis la racine du site via `/images/...`.

### Exemples :
1. Si vous déposez une image nommée `tracksuit-noir.jpg` dans `/public/images/products/tracksuit-noir.jpg` :
   - Son chemin sur le site est : `/images/products/tracksuit-noir.jpg`
   - Vous pouvez coller ce chemin directement dans le formulaire d'ajout de produit dans l'Admin !
2. Si vous déposez `banner-ete.jpg` dans `/public/images/banners/banner-ete.jpg` :
   - Son chemin sur le site est : `/images/banners/banner-ete.jpg`

---

## 📸 Formats recommandés
- Formats : `.jpg`, `.jpeg`, `.png`, `.webp`
- Poids conseillé : Moins de 500 Ko par photo pour un chargement ultra-rapide sur mobile au Maroc.
- Ratio conseillé pour les vêtements : Portrait (3:4 ou 4:5).
