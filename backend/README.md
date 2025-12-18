# EduPilot Backend

## Variables d'environnement

1. Copiez le fichier `.env.example` vers `.env` puis adaptez les valeurs (aucune clé réelle ne doit être commitée).
2. Le backend supporte désormais la configuration SMTP Brevo via les variables `SMTP_*`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `APP_NAME` et `APP_URL`.

> **Important :** Toute modification du fichier `.env` nécessite un redémarrage du serveur backend. Même avec `nodemon`, relancez la commande (`npm run dev`) afin que les nouvelles variables soient rechargées.

## Scripts utiles

- `npm run dev` : démarre le serveur en mode développement avec `nodemon --exec ts-node src/server.ts`.
- `npm run build` : compile TypeScript vers `dist/`.
- `npm start` : lance la version compilée (`dist/server.js`).

Pour redémarrer le serveur après une mise à jour de `.env`, stoppez le processus en cours (`Ctrl+C`) puis relancez `npm run dev`.
