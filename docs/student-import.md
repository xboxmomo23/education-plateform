# Import CSV Élèves

## Format du fichier

- Encodage UTF-8, séparateur `;` ou `,`
- Lignes maximales : 500 (hors ligne d’en-tête)
- Colonnes supportées :
  - `full_name` (obligatoire)
  - `contact_email` (obligatoire)
  - `date_of_birth` (optionnel, `YYYY-MM-DD`)
  - `student_number` (optionnel)
  - `login_email` (optionnel)
  - `class_code` ou `class_label` (optionnel) – sinon choisissez une classe par défaut dans l’UI
- `existing_parent_email` (optionnel) – doit correspondre à un parent existant de l’établissement, sinon la ligne est en erreur
- `parent_first_name`, `parent_last_name` (optionnels) – permettent la création d’un parent (login généré automatiquement) uniquement si aucun `existing_parent_email` n’est fourni

Exemple minimal :

```
full_name;contact_email;class_code;login_email;parent_first_name;parent_last_name
Alice Martin;alice.parent@example.com;3A;alice.martin@ecole.fr;Parent;Martin
Bruno Durant;bruno.contact@example.com;3A;;
```

## Comportement

- `dryRun` (preview) : `strict=false`, `sendInvites=false`, aucune écriture persistée
- Import réel : transaction par ligne via `createStudentAccount`, `strict=false`, `sendInvites` contrôlé par la case à cocher (OFF par défaut)
- Si `login_email` existe déjà dans l’établissement → ligne ignorée avec warning
- Si `existing_parent_email` est introuvable → erreur bloquante (aucune création pour la ligne)
- Invitations + audit sont déclenchés uniquement après le commit effectif (jamais en dry-run)

## Endpoints

- `POST /api/admin/students/import/preview`
- `POST /api/admin/students/import/commit`

Payload commun :

```json
{
  "csvData": "<contenu CSV>",
  "defaultClassId": "uuid (optionnel)",
  "sendInvites": false // uniquement pour /commit
}
```

Réponse :

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 12,
      "ok": 9,
      "warnings": 2,
      "errors": 1,
      "createdCount": 9
    },
    "rows": [
      {
        "rowNumber": 2,
        "status": "OK",
        "created": true,
        "warnings": [],
        "generatedLoginEmail": "alice.martin@ecole.fr",
        "input": {
          "full_name": "Alice Martin",
          "contact_email": "alice.parent@example.com",
          "class_code": "3A"
        }
      }
    ]
  }
}
```

> ⚠️ Les fichiers dépassant 500 lignes ou ~1.5 MB sont rejetés.
