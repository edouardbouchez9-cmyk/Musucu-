# Muscu

Carnet de musculation Push / Pull qui calcule ton objectif à chaque série, à partir de tes séances passées. L'app
fonctionne hors ligne et garde tes données sur ton téléphone.

## Ce que fait la version 1

- Tu crées tes exercices : type, zone, muscles directs et indirects, fourchette de reps, RIR cible et plus petit
  incrément.
- Tu ranges tes exercices dans Push et Pull, avec un nombre de séries pour chacun.
- Pendant la séance, chaque série est pré-remplie avec l'objectif. Tu valides d'un appui, ou tu corriges la charge,
  les reps et le RIR avant de valider.
- À la fin de la séance, l'app affiche tes objectifs pour la prochaine fois, avec une phrase qui explique chaque
  décision.
- L'onglet Progrès affiche la courbe du 1RM estimé et l'historique des décisions de l'app.
- L'onglet Réglages permet de modifier les seuils des règles et d'exporter tes données.

Au premier lancement, l'app charge ton programme Hevy (7 exercices Push, 7 exercices Pull) avec tes dernières charges
comme point de départ. Le fichier `src/db/mon-programme.ts` contient ces données ; **Réglages > Recharger mon
programme** les remet en place.

Règles en place : R1 (double progression) et R5 (1RM estimé). Les règles R2 à R10 viendront une par une.

## Installer l'app sur ton iPhone

L'app est en ligne sur GitHub Pages : <https://edouardbouchez9-cmyk.github.io/Musucu-/>

1. Ouvre cette adresse dans Safari sur ton iPhone.
2. Touche le bouton Partager, puis **Sur l'écran d'accueil**.

L'app fonctionne ensuite hors ligne. Elle télécharge les nouvelles versions à son ouverture, quand tu as du réseau.

### Publier une nouvelle version

La branche `gh-pages` contient l'app construite ; GitHub Pages la sert. Pour publier une nouvelle version depuis ton
Mac, dans le dossier du projet :

```sh
npm install
npm run deploy
```

La commande lance les tests, construit l'app et met à jour la branche `gh-pages`. À chaque envoi sur `main`, GitHub
Actions relance aussi les tests.

### Sauvegarder tes données

Tes séances restent dans le stockage de l'app sur ton iPhone. Elles disparaissent si tu supprimes l'app de l'écran
d'accueil. Exporte-les de temps en temps depuis **Réglages > Exporter mes données**, puis garde le fichier dans
Fichiers ou iCloud Drive.

### Tester une modification sur ton iPhone

Tu peux tester une version en cours sur ton iPhone depuis ton Mac, sur le même Wi-Fi :

```sh
npm install
npm run dev -- --host
```

Ouvre dans Safari l'adresse `Network` affichée par la commande (par exemple `http://192.168.1.20:5173`). Ce mode
sert seulement à tester : l'app ne fonctionne pas hors ligne et ne s'installe pas correctement sur l'écran d'accueil.

## Développer

Il te faut Node.js 22 ou plus récent.

```sh
npm install
npm run dev        # serveur de développement
npm test           # tests unitaires (Vitest)
npm run typecheck  # vérification des types
npm run build      # version de production dans dist/
```

## Organisation du code

- `src/engine/` : le moteur de règles. Il ne dépend ni de l'interface ni du stockage. Chaque règle a son fichier et
  ses tests.
  - `parametres.ts` : tous les seuils, avec les valeurs par défaut du cahier des charges.
  - `r1-double-progression.ts` : R1.
  - `r5-e1rm.ts` : R5.
  - `prescrire.ts` : choisit la règle à appliquer pour un exercice.
- `src/db/` : le stockage local (IndexedDB via Dexie) et l'historique des décisions.
- `src/ui/` : les écrans.

## Choix faits dans la version 1

Le cahier des charges laisse quelques cas ouverts. Voici les choix retenus :

- **RIR non saisi.** R1 vérifie seulement les reps. R5 suppose que tu as respecté le RIR cible de l'exercice.
- **R1 ou R5.** R1 décide la charge et les reps. R5 fixe la charge seulement quand la fourchette de l'exercice a
  changé depuis la dernière séance.
- **Charge de référence.** R1 part de la série la plus lourde de la dernière séance. Une série allégée ne compte pas
  comme réussie.
- **Hausse de charge.** La hausse par défaut (+2,5 kg en haut, +5 kg en bas, un incrément en isolation) est bornée
  entre 2 et 5 % de la charge, puis arrondie à l'incrément disponible.
- **Fourchette élargie.** Quand le plus petit incrément dépasse 10 % de la charge, R_max augmente de 3 reps
  (10–12 devient 10–15).
- **Série manquante.** Une série prévue mais non faite bloque la hausse. Son objectif suivant reprend les reps de la
  série la plus faible, et au moins R_min.
- **e1RM d'une séance.** C'est celui de la meilleure série. La charge calculée par R5 est arrondie à l'incrément
  inférieur.
- **Décisions.** L'app enregistre une décision par exercice au démarrage de chaque séance : règle appliquée, données
  d'entrée, objectif et explication.

## Licence

Code personnel. Il ne reprend aucun code de Hevy ni de LiftLog.
