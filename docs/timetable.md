# Système d'Emploi du Temps - Documentation

## Vue d'ensemble

Le système d'emploi du temps est une solution complète pour gérer les plannings des élèves, professeurs et responsables. Il utilise une architecture modulaire avec des composants réutilisables et des API mock prêtes pour l'intégration backend.

## Architecture

### Composants principaux

1. **TimetableGrid** (`components/timetable/TimetableGrid.tsx`)
   - Composant réutilisable pour afficher l'emploi du temps
   - Supporte 3 modes: student, teacher, responsable
   - Vue desktop (tableau) et mobile (liste)
   - Gestion des conflits et statuts

2. **Pages**
   - `/eleve/timetable` - Vue élève (lecture seule)
   - `/professeur/timetable` - Vue professeur (lecture + propositions)
   - `/responsable/emplois-du-temps` - Vue responsable (édition complète)

3. **API Mock** (`lib/timetable/api.ts`)
   - Fonctions CRUD pour les entrées d'emploi du temps
   - Système de propositions de modifications
   - Détection automatique des conflits
   - Système de souscription pour mises à jour temps réel (mock)

### Types TypeScript

Tous les types sont définis dans `lib/timetable/types.ts`:
- `TimetableEntry` - Entrée d'emploi du temps
- `TimetableModification` - Historique des modifications
- `ChangeProposal` - Proposition de modification (professeurs)
- `TimetableConflict` - Conflit détecté
- `WeekType` - Type de semaine (A/B/both)

## Fonctionnalités

### Pour les élèves
- ✅ Visualisation du planning hebdomadaire
- ✅ Navigation entre semaines A/B
- ✅ Vue détaillée de chaque cours
- ✅ Mises à jour en temps réel (mock)
- ✅ Responsive (desktop/mobile)

### Pour les professeurs
- ✅ Visualisation de leur planning personnel
- ✅ Filtrage par classe
- ✅ Proposition de modifications
- ✅ Suivi des propositions (pending/approved/rejected)
- ✅ Statistiques (nombre de cours, classes)
- ✅ Mises à jour en temps réel (mock)

### Pour les responsables
- ✅ Vue complète de tous les emplois du temps
- ✅ Création/modification/suppression de cours
- ✅ Drag & drop pour réorganiser
- ✅ Détection automatique des conflits
- ✅ Historique des modifications
- ✅ Gestion des propositions des professeurs
- ✅ Vue condensée/détaillée

## Intégration Backend

### Points d'intégration à remplacer

Tous les appels API mock dans `lib/timetable/api.ts` doivent être remplacés par de vrais appels backend:

\`\`\`typescript
// TODO: Replace with real API calls

// GET /api/timetable/teacher?email={email}&weekStart={weekStart}&weekType={weekType}
export async function getTimetableForTeacher(...)

// GET /api/timetable/class?classId={classId}&weekStart={weekStart}&weekType={weekType}
export async function getTimetableForClass(...)

// GET /api/timetable?weekStart={weekStart}&weekType={weekType}
export async function getAllTimetableEntries(...)

// POST /api/timetable
export async function createTimetableEntry(...)

// PUT /api/timetable/{id}
export async function updateTimetableEntry(...)

// DELETE /api/timetable/{id}
export async function deleteTimetableEntry(...)

// POST /api/timetable/proposals
export async function proposeChange(...)

// GET /api/timetable/proposals
export async function getChangeProposals(...)

// PUT /api/timetable/proposals/{id}
export async function reviewChangeProposal(...)

// GET /api/timetable/modifications?entryId={entryId}
export async function getModifications(...)
\`\`\`

### Synchronisation temps réel

Le système utilise actuellement un mock de souscription. Pour l'intégration réelle:

**Option 1: WebSocket**
\`\`\`typescript
export function subscribeToTimetableChanges(callback: SubscriberCallback): () => void {
  const ws = new WebSocket('ws://your-api.com/timetable/subscribe')
  
  ws.onmessage = (event) => {
    const updatedEntries = JSON.parse(event.data)
    callback(updatedEntries)
  }
  
  return () => ws.close()
}
\`\`\`

**Option 2: Supabase Realtime**
\`\`\`typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(...)

export function subscribeToTimetableChanges(callback: SubscriberCallback): () => void {
  const subscription = supabase
    .channel('timetable_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'timetable_entries' },
      (payload) => {
        // Reload and callback
        getAllTimetableEntries(...).then(callback)
      }
    )
    .subscribe()
  
  return () => subscription.unsubscribe()
}
\`\`\`

**Option 3: Polling**
\`\`\`typescript
export function subscribeToTimetableChanges(callback: SubscriberCallback): () => void {
  const interval = setInterval(async () => {
    const entries = await getAllTimetableEntries(...)
    callback(entries)
  }, 30000) // Poll every 30 seconds
  
  return () => clearInterval(interval)
}
\`\`\`

## Scénarios de test

### Test 1: Élève consulte son emploi du temps
1. Se connecter avec `eleve@example.com` / `eleve123`
2. Aller sur "Emploi du temps"
3. Vérifier que les cours de Terminale A s'affichent
4. Naviguer entre semaines A et B
5. Cliquer sur un cours pour voir les détails

### Test 2: Professeur propose une modification
1. Se connecter avec `prof@example.com` / `prof123`
2. Aller sur "Emploi du temps"
3. Vérifier que seuls les cours de M. Dupont s'affichent
4. Cliquer sur le bouton "Proposer modification" sur un cours
5. Remplir le formulaire et envoyer
6. Vérifier que la proposition apparaît dans "Mes propositions"

### Test 3: Responsable gère les emplois du temps
1. Se connecter avec `responsable1@test.com` / `123456`
2. Aller sur "Emplois du temps"
3. Vérifier la détection de conflits (entry-conflict-1)
4. Créer un nouveau cours
5. Modifier un cours existant
6. Vérifier l'historique des modifications

### Test 4: Synchronisation temps réel (mock)
1. Ouvrir deux onglets
2. Onglet 1: Connexion responsable
3. Onglet 2: Connexion professeur
4. Onglet 1: Modifier un cours du professeur
5. Onglet 2: Vérifier que le changement apparaît (mock)

### Test 5: Responsive mobile
1. Ouvrir sur mobile ou réduire la fenêtre
2. Vérifier que la vue passe en mode liste
3. Vérifier que tous les cours sont accessibles
4. Tester la navigation entre jours

### Test 6: Semaines A/B
1. Basculer entre semaine A et B
2. Vérifier que le cours de Philosophie n'apparaît qu'en semaine A
3. Vérifier que le cours de SVT n'apparaît qu'en semaine B

### Test 7: Détection de conflits
1. Connexion responsable
2. Observer le conflit entre entry-2 et entry-conflict-1 (même salle, même horaire)
3. Vérifier l'alerte en haut de page
4. Vérifier le marquage visuel sur les cours en conflit

### Test 8: Filtrage par classe (professeur)
1. Connexion professeur
2. Observer les cours de différentes classes
3. Vérifier que le filtre fonctionne (à implémenter si nécessaire)

### Test 9: Drag & drop (responsable)
1. Connexion responsable
2. Glisser-déposer un cours vers un autre créneau
3. Vérifier que le cours est déplacé
4. Vérifier l'ajout dans l'historique

### Test 10: Propositions - Workflow complet
1. Professeur propose une modification
2. Responsable voit la proposition
3. Responsable approuve la proposition
4. Vérifier que le cours est modifié
5. Professeur voit le statut "Approuvée"

## Données de test

Le fichier `lib/timetable/mockTimetable.ts` contient:
- 15 entrées d'emploi du temps
- 6 professeurs différents
- 6 classes différentes
- Semaines A et B
- 1 conflit intentionnel pour les tests
- 3 modifications historiques
- 2 propositions de changement

## Extensibilité

Le système est conçu pour être facilement étendu:

1. **Ajout de nouveaux rôles**: Modifier `TimetableViewMode` dans types.ts
2. **Nouveaux types de cours**: Ajouter dans `SUBJECT_COLORS`
3. **Nouvelles règles de conflit**: Modifier `detectConflicts()` dans api.ts
4. **Export PDF/Excel**: Ajouter des fonctions dans les pages
5. **Notifications**: Intégrer avec un système de notifications existant

## Notes importantes

- Les modifications sont journalisées automatiquement
- Les conflits sont détectés en temps réel
- Le système supporte les semaines A/B
- Tous les composants sont responsive
- Le code est TypeScript strict
- Prêt pour l'intégration Supabase ou API REST
