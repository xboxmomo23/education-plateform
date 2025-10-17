# Système d'édition de notes - Guide de test

Ce document explique comment tester le système d'édition de notes avec les règles de permissions temporelles.

## Vue d'ensemble

Le système permet aux professeurs et responsables de modifier les notes selon des règles temporelles strictes :

- **Professeur** : peut modifier une note pendant **48 heures** après sa création
- **Responsable** : peut modifier une note pendant **1 mois** (30 jours) après sa création
- **Admin** : peut modifier une note à tout moment (pas de limite)

## Fichiers créés

### Bibliothèques et utilitaires
- `lib/notes/types.ts` - Types TypeScript partagés (Note, HistoryEntry, ClassStats, etc.)
- `lib/notes/mockNotes.ts` - Données de test avec notes de différents âges
- `lib/notes/api.ts` - Fonctions API mock (getNote, updateNote, getClassAverages, etc.)

### Composants
- `components/notes/NoteForm.tsx` - Formulaire réutilisable pour créer/éditer une note
- `components/notes/EditNoteModal.tsx` - Modal d'édition de note avec statistiques et historique

### Pages
- `app/notes/edit/[noteId]/page.tsx` - Page dédiée pour éditer une note (alternative au modal)
- `app/professeur/notes/page.tsx` - Mise à jour avec intégration du modal d'édition
- `app/responsable/notes/page.tsx` - Mise à jour avec intégration du modal d'édition

## Comptes de test

Utilisez ces comptes pour tester les différents niveaux de permissions :

\`\`\`
Professeur:
  Email: prof@example.com
  Mot de passe: prof123
  Permissions: Modification < 48h

Responsable:
  Email: responsable1@test.com
  Mot de passe: 123456
  Permissions: Modification < 30 jours

Admin:
  Email: admin@example.com
  Mot de passe: admin123
  Permissions: Modification illimitée
\`\`\`

## Notes de test disponibles

Le fichier `lib/notes/mockNotes.ts` contient 6 notes avec différents âges :

1. **note-1** : Créée il y a 12 heures
   - ✅ Professeur peut modifier
   - ✅ Responsable peut modifier

2. **note-2** : Créée il y a 30 heures
   - ✅ Professeur peut modifier (< 48h)
   - ✅ Responsable peut modifier

3. **note-3** : Créée il y a 3 jours
   - ❌ Professeur ne peut PAS modifier (> 48h)
   - ✅ Responsable peut modifier (< 30 jours)

4. **note-4** : Créée il y a 20 jours
   - ❌ Professeur ne peut PAS modifier
   - ✅ Responsable peut modifier (< 30 jours)

5. **note-5** : Créée il y a 40 jours
   - ❌ Professeur ne peut PAS modifier
   - ❌ Responsable ne peut PAS modifier (> 30 jours)
   - ✅ Admin peut modifier

6. **note-6** : Créée il y a 6 heures
   - ✅ Professeur peut modifier
   - ✅ Responsable peut modifier

## Scénarios de test

### Test 1 : Professeur modifie une note récente (< 48h)

1. Connectez-vous avec `prof@example.com` / `prof123`
2. Allez sur la page "Gestion des notes"
3. Cliquez sur le bouton "Modifier" (icône crayon) pour **note-1** ou **note-2**
4. Le formulaire doit être **actif** et modifiable
5. Changez la valeur de la note (ex: 15 → 16)
6. Cliquez sur "Enregistrer"
7. ✅ La note doit être mise à jour avec succès
8. ✅ L'historique doit contenir une nouvelle entrée

### Test 2 : Professeur tente de modifier une note ancienne (> 48h)

1. Connectez-vous avec `prof@example.com` / `prof123`
2. Allez sur la page "Gestion des notes"
3. Cliquez sur "Modifier" pour **note-3** (3 jours)
4. ❌ Le formulaire doit être **désactivé** (read-only)
5. ✅ Un message doit s'afficher : "Modification dépassée (72h écoulées, limite 48h). Contactez le responsable..."
6. Le bouton "Enregistrer" doit être désactivé

### Test 3 : Responsable modifie une note de 3 jours

1. Connectez-vous avec `responsable1@test.com` / `123456`
2. Allez sur la page "Gestion des notes"
3. Cliquez sur "Modifier" pour **note-3** (3 jours)
4. ✅ Le formulaire doit être **actif** et modifiable
5. Changez la valeur de la note
6. Cliquez sur "Enregistrer"
7. ✅ La note doit être mise à jour avec succès

### Test 4 : Responsable modifie une note de 20 jours

1. Connectez-vous avec `responsable1@test.com` / `123456`
2. Cliquez sur "Modifier" pour **note-4** (20 jours)
3. ✅ Le formulaire doit être actif
4. Modifiez et enregistrez
5. ✅ Succès

### Test 5 : Responsable tente de modifier une note de 40 jours

1. Connectez-vous avec `responsable1@test.com` / `123456`
2. Cliquez sur "Modifier" pour **note-5** (40 jours)
3. ❌ Le formulaire doit être **désactivé**
4. ✅ Message : "Modification verrouillée (40 jours écoulés, limite 30 jours). Seul un administrateur..."

### Test 6 : Vérifier les statistiques en temps réel

1. Ouvrez une note en modification
2. Dans le panneau de droite, vérifiez :
   - ✅ Moyenne de la classe pour ce type d'évaluation
   - ✅ Note minimale et maximale
   - ✅ Meilleure et pire note dans la matière
3. Modifiez la valeur de la note
4. Après enregistrement, les statistiques doivent se mettre à jour

### Test 7 : Vérifier l'historique des modifications

1. Modifiez **note-3** (qui a déjà un historique)
2. Après enregistrement, ouvrez à nouveau la note
3. Dans le panneau "Historique", vérifiez :
   - ✅ L'ancienne modification est visible
   - ✅ La nouvelle modification apparaît avec :
     - Email de l'utilisateur
     - Rôle (teacher/responsable)
     - Date et heure
     - Détails des changements (valeur: 8 → 9)

### Test 8 : Validation des champs

1. Ouvrez une note en modification
2. Testez les validations :
   - Entrez une note < 0 ou > 20 → ❌ Erreur
   - Entrez un coefficient < 1 → ❌ Erreur
   - Laissez un champ requis vide → ❌ Erreur
3. ✅ Les messages d'erreur doivent s'afficher sous chaque champ

### Test 9 : Navigation entre pages

1. Testez les deux méthodes d'édition :
   - **Modal** : Cliquez sur "Modifier" depuis la liste des notes
   - **Page dédiée** : Allez sur `/notes/edit/note-1`
2. Les deux doivent fonctionner de manière identique

### Test 10 : Accès non autorisé

1. Connectez-vous avec `eleve@example.com` / `eleve123`
2. Essayez d'accéder à `/notes/edit/note-1`
3. ✅ Vous devez être redirigé ou voir "Accès refusé"

## Fonctionnalités à vérifier

### Interface utilisateur
- [ ] Formulaire pré-rempli avec les données de la note
- [ ] Champs désactivés quand modification non autorisée
- [ ] Message clair expliquant pourquoi la modification est bloquée
- [ ] Badge "Verrouillée" visible sur les notes non modifiables
- [ ] Statistiques affichées en temps réel
- [ ] Historique des modifications visible
- [ ] Design responsive (mobile et desktop)

### Logique métier
- [ ] Calcul correct du temps écoulé depuis création
- [ ] Règle 48h appliquée pour les professeurs
- [ ] Règle 30 jours appliquée pour les responsables
- [ ] Admin peut tout modifier
- [ ] Historique enregistré à chaque modification
- [ ] Statistiques recalculées après modification
- [ ] Validation des champs (0-20, coefficient positif)

### Expérience utilisateur
- [ ] Messages d'erreur clairs et utiles
- [ ] Confirmation de succès après modification
- [ ] Retour à la liste après enregistrement
- [ ] Annulation possible à tout moment
- [ ] Chargement visible pendant les opérations

## Intégration backend (TODO)

Actuellement, le système utilise des données mock. Pour brancher un vrai backend :

1. Ouvrez `lib/notes/api.ts`
2. Remplacez les fonctions mock par de vraies requêtes :

\`\`\`typescript
// Exemple pour getNote
export async function getNote(noteId: string): Promise<Note | null> {
  const response = await fetch(`/api/notes/${noteId}`)
  if (!response.ok) return null
  return response.json()
}

// Exemple pour updateNote
export async function updateNote(
  noteId: string,
  updates: Partial<Note>,
  updatedBy: string,
  updatedByRole: string
): Promise<Note> {
  const response = await fetch(`/api/notes/${noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, updatedBy, updatedByRole })
  })
  if (!response.ok) throw new Error('Update failed')
  return response.json()
}
\`\`\`

3. Créez les routes API correspondantes dans `app/api/notes/`
4. Implémentez la validation côté serveur des permissions temporelles
5. Connectez à votre base de données (Supabase, Neon, etc.)

## Support

Si vous rencontrez des problèmes :

1. Vérifiez la console du navigateur pour les logs `[v0]`
2. Vérifiez que vous êtes connecté avec le bon compte
3. Vérifiez que les dates des notes mock correspondent aux tests
4. Consultez les types dans `lib/notes/types.ts` pour la structure des données

## Prochaines étapes

- [ ] Intégrer avec une vraie base de données
- [ ] Ajouter des notifications par email lors des modifications
- [ ] Implémenter l'export PDF/CSV des notes
- [ ] Ajouter des tests unitaires et d'intégration
- [ ] Ajouter la possibilité de demander une modification au responsable
- [ ] Implémenter un système d'approbation pour les modifications tardives
