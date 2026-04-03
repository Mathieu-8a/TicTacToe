Voici un cahier des charges complet et structuré pour ton agent AI :Voici un cahier des charges complet et structuré :

---

# 📋 Cahier des charges — Tic-Tac-Toe multijoueur en ligne

---

## 1. Vue d'ensemble

**Objectif** : Application web de Tic-Tac-Toe permettant à deux joueurs distants de s'affronter en temps réel via un système de code de session partagé.

**Modèle de connexion** : Pair-à-pair via serveur — pas de compte, pas d'inscription. Un joueur génère un code, le partage hors-bande (SMS, oral, etc.), l'autre le saisit pour rejoindre.

---

## 2. Architecture technique recommandée

**Stack suggérée** (libre adaptation) :

- **Frontend** : HTML/CSS/JS vanilla ou React
- **Backend** : Node.js + Express (ou équivalent)
- **Temps réel** : WebSocket (bibliothèque `ws`) ou Socket.io
- **Stockage de session** : En mémoire (Map côté serveur), pas de BDD requise

**Pourquoi WebSocket** : Le jeu nécessite une communication bidirectionnelle en temps réel entre deux clients. Une architecture polling HTTP serait trop lente et coûteuse.

---

## 3. Flux utilisateur détaillé---
- Voir le fichier ttt_user_flow.svg

## 4. Spécifications fonctionnelles

### 4.1 Page d'accueil (état initial)

Chaque visiteur voit **simultanément** :
- **Son code unique** : chaîne de 6 caractères alphanumériques (ex. `K7P2XR`), générée côté serveur à l'arrivée sur la page. Affichée de façon visible et copiable.
- **Un champ de saisie** + bouton "Rejoindre" pour entrer le code d'un autre joueur.
- Aucune ambiguïté : chacun peut être soit le créateur soit le rejoignant.

### 4.2 Génération et gestion des codes

- Code généré par le **serveur** à la connexion WebSocket (pas côté client).
- Format : 6 caractères `[A-Z0-9]`, sans caractères ambigus (`0/O`, `1/I`).
- Durée de validité : 10 minutes sans connexion, puis code supprimé.
- Un code ne peut associer que **exactement 2 joueurs**.
- Si un joueur saisit un code invalide ou expiré → message d'erreur clair.

### 4.3 Démarrage de la partie

- Quand le Joueur B valide un code valide, le serveur envoie un événement `game_start` aux **deux** connexions WebSocket.
- Attribution des rôles : Joueur A (créateur du code) = ✕, Joueur B = ○.
- Le Joueur A commence toujours (ou tirage aléatoire — au choix).
- Les deux clients reçoivent simultanément le plateau initial et l'état du tour.

### 4.4 Déroulement du jeu

**Événements WebSocket à implémenter :**

| Événement | Direction | Payload |
|---|---|---|
| `move` | Client → Serveur | `{ cell: 0-8 }` |
| `game_update` | Serveur → Clients | `{ board, currentTurn, winner, isDraw }` |
| `opponent_disconnected` | Serveur → Client | `{ message }` |
| `rematch_request` | Client → Serveur | — |
| `rematch_accepted` | Serveur → Clients | `{ newBoard }` |

**Règles de validation côté serveur (impérativement) :**
- Vérifier que c'est bien le tour du joueur qui envoie le coup.
- Vérifier que la case est libre.
- Ne jamais faire confiance au client pour la logique de victoire.

### 4.5 Détection de fin de partie

Le serveur calcule :
- **Victoire** : vérification des 8 combinaisons gagnantes après chaque coup.
- **Match nul** : plateau plein sans gagnant.
- En cas de victoire, les cases gagnantes sont indiquées dans le payload (`winningCells: [0,1,2]`).

### 4.6 Gestion des déconnexions

- Si un joueur se déconnecte en cours de partie → l'autre reçoit `opponent_disconnected`.
- La session est conservée 30 secondes pour permettre une reconnexion.
- Si pas de reconnexion → partie annulée, retour à l'état initial.

### 4.7 Rejouer

- Bouton "Rejouer" visible après chaque fin de partie.
- Les deux joueurs doivent cliquer (système de confirmation mutuelle).
- La même session WebSocket est réutilisée, les rôles ✕/○ restent identiques.

---

## 5. Spécifications de l'interface

### États de l'UI

| État | Ce qui s'affiche |
|---|---|
| **Lobby** | Code du joueur A + champ de saisie |
| **En attente** | Spinner animé, "En attente de l'adversaire…" |
| **En jeu — mon tour** | Plateau cliquable, indicateur "Votre tour" |
| **En jeu — tour adverse** | Plateau non-cliquable, indicateur "Tour de l'adversaire" |
| **Victoire** | Cases gagnantes surlignées, message "Vous avez gagné !" |
| **Défaite** | Cases gagnantes surlignées, message "Vous avez perdu" |
| **Match nul** | Message "Match nul !" |
| **Adversaire déconnecté** | Message + option retour au lobby |

### Contraintes UI

- Design **responsive** : fonctionnel sur mobile et desktop.
- Le plateau doit être **carré** et de taille fixe (ex. 300×300px minimum sur mobile).
- Feedback visuel immédiat au clic (avant la réponse serveur) — puis correction si refus.
- Indicateur visuel clair du joueur actif.

---

## 6. Contraintes techniques

- **Pas de base de données** : tout l'état est en mémoire serveur.
- **Pas d'authentification** : les joueurs sont identifiés uniquement par leur connexion WebSocket.
- **Une seule partie à la fois** par paire de joueurs.
- Le code de session est **à usage unique** par partie (expiration à la fin).
- Toute la **logique de jeu est côté serveur** — le client n'est qu'un afficheur.

---

## 7. Ce qui est hors périmètre (à ne pas implémenter)

- Système de compte / authentification
- Historique des parties
- Mode spectateur
- Chat entre joueurs
- Classement / score
- Mode solo contre IA
- Rooms multiples (une seule partie active par code)

---

## 8. Critères de succès

L'implémentation est considérée terminée si :
1. Deux utilisateurs sur deux navigateurs distincts peuvent jouer une partie complète.
2. Les coups invalides (hors-tour, case occupée) sont rejetés sans planter l'app.
3. La déconnexion d'un joueur est notifiée à l'autre.
4. La fonctionnalité "Rejouer" fonctionne sans rechargement de page.
5. L'interface est utilisable sur un écran de smartphone.

---

Ce cahier des charges est conçu pour être directement utilisable par un agent de codage. Veux-tu que j'approfondisse une section en particulier, ou que j'ajoute des maquettes de l'interface ?