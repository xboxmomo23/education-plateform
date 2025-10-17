# Documentation - Système de Gestion des Devoirs

## Vue d'ensemble

Le système de gestion des devoirs permet aux professeurs de créer, publier et gérer les devoirs pour leurs classes, tandis que les élèves peuvent consulter les devoirs qui leur sont assignés.

## Architecture

### Fichiers créés

1. **Types et interfaces** (`lib/devoirs/types.ts`)
   - `Devoir`: Interface principale pour un devoir
   - `DevoirStatus`: Type pour le statut (draft | published)
   - `DevoirHistory`: Interface pour l'historique des modifications
   - `Course` et `Class`: Interfaces pour les cours et classes

2. **Données mock** (`lib/devoirs/mockDevoirs.ts`)
   - 8 devoirs de démonstration avec différents statuts et dates
   - Cours et classes fictifs pour les tests

3. **API mock** (`lib/devoirs/api.ts`)
   - `getDevoirsByAuthor(email)`: Récupère les devoirs d'un professeur
   - `getDevoirsByClass(classId)`: Récupère les devoirs publiés pour une classe
   - `getDevoir(id)`: Récupère un devoir spécifique
   - `createDevoir(data)`: Crée un nouveau devoir
   - `updateDevoir(id, updates, by, role)`: Met à jour un devoir
   - `deleteDevoir(id)`: Supprime un devoir

4. **Composants réutilisables**
   - `DevoirCard`: Affiche un devoir (variantes teacher/student)
   - `DevoirFormModal`: Modal pour créer/éditer un devoir

5. **Pages**
   - `app/professeur/devoirs/page.tsx`: Interface professeur
   - `app/eleve/devoirs/page.tsx`: Interface élève (modifiée)

## Fonctionnalités

### Pour les professeurs

1. **Création de devoirs**
   - Formulaire complet avec validation
   - Champs: titre, description, cours, classes, date de remise, priorité, ressource externe
   - Statut: brouillon ou publié

2. **Édition et suppression**
   - Possible uniquement avant la date de remise
   - Historique automatique des modifications
   - Confirmation avant suppression

3. **Publication**
   - Les brouillons peuvent être publiés à tout moment
   - Notification mock aux élèves lors de la publication

4. **Filtres et recherche**
   - Par cours, classe, statut, date de remise
   - Recherche par titre

5. **Duplication**
   - Créer rapidement un devoir similaire

6. **Historique**
   - Voir toutes les modifications sur tous les devoirs

### Pour les élèves

1. **Consultation**
   - Voir uniquement les devoirs publiés de leur classe
   - Statistiques: total, urgents, cette semaine
   - Indicateurs visuels: urgent, à rendre bientôt, en retard

2. **Informations détaillées**
   - Titre, description, matière, date de remise
   - Lien vers ressource externe si disponible
   - Calcul automatique des jours restants

### Pour les responsables

- Accès à tous les devoirs (à implémenter)
- Modification sans restriction de date
- Vue globale sur toutes les classes

## Règles métier

1. **Visibilité**
   - Seuls les devoirs avec `status === "published"` sont visibles par les élèves
   - Les brouillons restent visibles uniquement au professeur auteur

2. **Édition/Suppression**
   - Professeur: possible uniquement avant la date de remise (`dueDate`)
   - Responsable/Admin: possible à tout moment

3. **Historique**
   - Chaque action (création, modification, publication) est enregistrée
   - Format: `{ by, role, when, changes }`

4. **Validation**
   - Titre requis
   - Au moins un cours et une classe
   - Date de remise requise
   - Si publié: date de remise doit être dans le futur

5. **Notifications (mock)**
   - Lors de la publication, une notification est simulée pour les élèves des classes concernées

## Tests

### Comptes de démonstration

- **Professeur**: `prof@example.com` / `prof123`
- **Élève**: `eleve@example.com` / `eleve123`
- **Responsable**: `responsable1@test.com` / `123456`

### Scénarios de test

#### 1. Créer un devoir (Professeur)
1. Se connecter avec le compte professeur
2. Aller sur "Devoirs"
3. Cliquer sur "Créer un devoir"
4. Remplir le formulaire:
   - Titre: "Test devoir"
   - Description: "Description du test"
   - Cours: Mathématiques
   - Classes: Terminale A
   - Date de remise: demain
   - Statut: Brouillon
5. Cliquer sur "Créer"
6. Vérifier que le devoir apparaît dans la liste avec le badge "Brouillon"

#### 2. Publier un devoir
1. Trouver le devoir créé en brouillon
2. Cliquer sur "Publier"
3. Vérifier le message de confirmation
4. Vérifier que le badge "Brouillon" a disparu

#### 3. Voir le devoir côté élève
1. Se déconnecter
2. Se connecter avec le compte élève
3. Aller sur "Devoirs"
4. Vérifier que le devoir publié apparaît
5. Vérifier que les brouillons n'apparaissent pas

#### 4. Éditer un devoir avant la date de remise
1. Se reconnecter en tant que professeur
2. Trouver un devoir avec date de remise future
3. Cliquer sur le bouton "Éditer"
4. Modifier le titre
5. Enregistrer
6. Vérifier que la modification est visible
7. Cliquer sur "Historique" pour voir l'entrée de modification

#### 5. Tenter d'éditer après la date de remise
1. Trouver le devoir "Devoir passé - Analyse de texte" (date passée)
2. Vérifier que le bouton "Éditer" est désactivé
3. Essayer de cliquer: voir le message d'erreur

#### 6. Dupliquer un devoir
1. Trouver n'importe quel devoir
2. Cliquer sur le bouton "Dupliquer"
3. Vérifier qu'un nouveau devoir "(copie)" apparaît en brouillon
4. Vérifier que tous les champs sont copiés sauf la date

#### 7. Supprimer un devoir
1. Trouver un devoir avec date future
2. Cliquer sur "Supprimer"
3. Confirmer la suppression
4. Vérifier que le devoir a disparu

#### 8. Filtrer les devoirs
1. Utiliser les filtres:
   - Par cours: sélectionner "Mathématiques"
   - Par classe: sélectionner "Terminale A"
   - Par statut: sélectionner "Publiés"
   - Par date: sélectionner "À venir"
2. Vérifier que seuls les devoirs correspondants s'affichent

#### 9. Rechercher un devoir
1. Taper "exercices" dans la barre de recherche
2. Vérifier que seuls les devoirs contenant "exercices" s'affichent

#### 10. Voir l'historique complet
1. Cliquer sur "Historique"
2. Vérifier que toutes les actions sont listées
3. Vérifier les informations: qui, quand, quoi

## Connexion au backend

Pour connecter ce système à un vrai backend:

### 1. Créer les routes API

\`\`\`typescript
// app/api/devoirs/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authorEmail = searchParams.get('authorEmail')
  const classId = searchParams.get('classId')
  
  // Fetch from database
  // Return devoirs
}

export async function POST(request: Request) {
  const data = await request.json()
  // Save to database
  // Return created devoir
}
\`\`\`

### 2. Modifier lib/devoirs/api.ts

Remplacer les fonctions mock par de vrais appels fetch:

\`\`\`typescript
export async function getDevoirsByAuthor(email: string): Promise<Devoir[]> {
  const response = await fetch(`/api/devoirs?authorEmail=${email}`)
  return response.json()
}
\`\`\`

### 3. Base de données

Créer une table `devoirs` avec les colonnes:
- id (UUID)
- title (TEXT)
- description (TEXT)
- course_id (UUID)
- class_ids (ARRAY)
- author_email (TEXT)
- created_at (TIMESTAMP)
- due_date (DATE)
- status (ENUM: draft, published)
- resource_url (TEXT, nullable)
- priority (ENUM: low, medium, high)

Créer une table `devoir_history` pour l'historique:
- id (UUID)
- devoir_id (UUID)
- modified_by (TEXT)
- modified_role (TEXT)
- modified_at (TIMESTAMP)
- changes (TEXT)

### 4. Notifications réelles

Implémenter un système de notifications:
- Créer une table `notifications`
- Envoyer des notifications lors de la publication
- Afficher les notifications dans l'interface élève

## Améliorations futures

1. **Upload de fichiers**
   - Permettre aux professeurs d'uploader des documents
   - Utiliser Vercel Blob ou un service similaire

2. **Rendu de devoirs**
   - Permettre aux élèves de rendre leurs devoirs
   - Système de correction en ligne

3. **Commentaires**
   - Permettre aux élèves de poser des questions
   - Permettre aux professeurs de répondre

4. **Rappels automatiques**
   - Envoyer des rappels par email avant la date de remise
   - Notifications push

5. **Statistiques avancées**
   - Taux de rendu par classe
   - Moyennes des notes par devoir
   - Graphiques d'évolution

6. **Export**
   - Export PDF de la liste des devoirs
   - Export CSV pour analyse

7. **Calendrier**
   - Vue calendrier des devoirs
   - Intégration avec l'emploi du temps

## Support

Pour toute question ou problème:
1. Vérifier que vous utilisez les bons comptes de test
2. Vérifier la console du navigateur pour les logs `[v0]`
3. Vérifier que les dates sont correctes (certains devoirs ont des dates passées pour tester le verrouillage)
