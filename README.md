# SOLVÉA Dimensionneur

Outil de dimensionnement de kit solaire pour ménages et petits commerces (Bénin / Togo).
Une page : appareils → panneaux, batterie, régulateur MPPT, onduleur, coût (si prix saisis).
Hackathon FIA 2026, Lomé.

- 100 % côté navigateur : aucun appel réseau, polices système, fonctionne hors ligne.
- Estimation indicative, à valider avec un installateur.

## Lancer

```bash
npm install
npm run dev        # développement
npm run build      # vérification TypeScript + build dans dist/
npm run preview    # sert dist/ (fonctionne hors ligne)
```

## Tester

```bash
npm test
```

Le test d'étalonnage « boutique » (`src/lib/solar/calc.test.ts`) fixe les résultats attendus :
E = 1 866 Wh/j, 2 panneaux (600 Wc), lithium 2 333 Wh ≈ 97 Ah à 24 V, plomb-acide 3 732 Wh ≈ 156 Ah,
MPPT 40 A, onduleur 800 W. En cas d'écart, corriger le code, pas le test.

## Où modifier quoi

| Quoi | Où |
| --- | --- |
| Appareils (puissance, heures, taux de marche), villes et HSP, profils types | `src/data/solar-config.ts` |
| η, N, module, DoD, tailles standard, marge 1,25, seuils de tension, horizon du comparatif | `src/data/solar-config.ts` |
| Formules | `src/lib/solar/calc.ts` (texte affiché : `FORMULES`) |
| Prix, durées de vie en cycles, facteur CO₂ | saisis dans l'interface (bloc « Prix, comparatif batteries et CO₂ ») ; **aucun prix par défaut** |

Chaque donnée du fichier de configuration porte une `source` et un `statut` (« à vérifier »).
η, N, module et DoD sont aussi modifiables dans l'interface (« Hypothèses avancées »).

## Structure

```
src/data/solar-config.ts   données et hypothèses
src/lib/solar/calc.ts      calcul (fonctions pures) + tests
src/lib/solar/profils.ts   profils types -> appareils
src/components/            interface
```
