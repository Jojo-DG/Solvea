/**
 * Données et hypothèses de SOLVÉA Dimensionneur.
 * Toutes les valeurs ci-dessous sont PROVISOIRES : chaque entrée porte une `source`
 * et un `statut` pour que ce qui reste à vérifier soit visible.
 * Aucun prix n'est défini ici : ils sont saisis par l'utilisateur dans l'interface.
 */

export type TypeBatterie = 'lithium' | 'plomb'

export interface Tracable {
  /** D'où vient la valeur. */
  source: string
  /** Niveau de confiance / travail restant. */
  statut: string
}

// ---------------------------------------------------------------------------
// Appareils
// ---------------------------------------------------------------------------

export interface AppareilCatalogue extends Tracable {
  id: string
  nom: string
  /** Puissance électrique en W. */
  puissanceW: number
  /** Heures d'utilisation par jour. */
  heuresParJour: number
  /** Part du temps où l'appareil consomme réellement sa puissance (0–1). */
  tauxMarche: number
  /** Appareil de froid (cycle de compresseur, courant de démarrage). */
  froid: boolean
}

const SOURCE_APPAREIL = "Ordre de grandeur courant de fiches d'appareils, non sourcé précisément"
const STATUT_APPAREIL = 'ordre de grandeur à vérifier'

const appareil = (
  id: string,
  nom: string,
  puissanceW: number,
  heuresParJour: number,
  tauxMarche = 1,
  froid = false,
): AppareilCatalogue => ({
  id,
  nom,
  puissanceW,
  heuresParJour,
  tauxMarche,
  froid,
  source: SOURCE_APPAREIL,
  statut: STATUT_APPAREIL,
})

export const APPAREILS: readonly AppareilCatalogue[] = [
  appareil('ampoule-led', 'Ampoule LED', 9, 6),
  appareil('ventilateur', 'Ventilateur', 50, 6),
  appareil('tv-led', 'TV LED', 60, 5),
  appareil('decodeur', 'Décodeur TV', 15, 5),
  appareil('chargeur-telephone', 'Chargeur de téléphone', 10, 3),
  appareil('pc-portable', 'PC portable', 60, 6),
  appareil('routeur', 'Routeur Wi-Fi', 10, 24),
  appareil('refrigerateur', 'Réfrigérateur compact', 100, 24, 0.4, true),
  appareil('congelateur', 'Congélateur coffre', 150, 24, 0.4, true),
  appareil('machine-coudre', 'Machine à coudre', 100, 4),
]

// ---------------------------------------------------------------------------
// Villes (HSP = heures de soleil pic équivalentes, kWh/m²/j)
// ---------------------------------------------------------------------------

export interface Ville extends Tracable {
  id: string
  nom: string
  /** null = saisie manuelle. */
  hsp: number | null
}

export const VILLE_AUTRE = 'autre'

const STATUT_HSP = 'à vérifier (PVGIS / Global Solar Atlas)'
const SOURCE_HSP = 'Valeur provisoire du hackathon, à remplacer par une lecture PVGIS ou Global Solar Atlas'

export const VILLES: readonly Ville[] = [
  { id: 'lome', nom: 'Lomé', hsp: 5.0, source: SOURCE_HSP, statut: STATUT_HSP },
  { id: 'cotonou', nom: 'Cotonou', hsp: 5.0, source: SOURCE_HSP, statut: STATUT_HSP },
  {
    id: VILLE_AUTRE,
    nom: 'Autre ville',
    hsp: null,
    source: 'Saisie par l’utilisateur',
    statut: 'à renseigner (PVGIS / Global Solar Atlas)',
  },
]

// ---------------------------------------------------------------------------
// Batteries
// ---------------------------------------------------------------------------

export interface TechnologieBatterie extends Tracable {
  id: TypeBatterie
  nom: string
  /** Profondeur de décharge utilisable (0–1]. */
  dod: number
}

export const BATTERIES: Record<TypeBatterie, TechnologieBatterie> = {
  lithium: {
    id: 'lithium',
    nom: 'Lithium LiFePO4',
    dod: 0.8,
    source: 'Hypothèse de dimensionnement courante (cahier des charges SOLVÉA)',
    statut: 'à confirmer avec la fiche du fabricant',
  },
  plomb: {
    id: 'plomb',
    nom: 'Plomb-acide',
    dod: 0.5,
    source: 'Hypothèse de dimensionnement courante (cahier des charges SOLVÉA)',
    statut: 'à confirmer avec la fiche du fabricant',
  },
}

// ---------------------------------------------------------------------------
// Hypothèses de calcul
// ---------------------------------------------------------------------------

export const HYPOTHESES_DEFAUT = {
  /** Rendement global de l'installation η (câbles, régulateur, onduleur, batterie, poussière…). */
  rendement: 0.7,
  /** Jours d'autonomie N. */
  autonomieJours: 1,
  /** Puissance d'un module en Wc. */
  puissanceModuleWc: 300,
  batterie: 'lithium' as TypeBatterie,
}

export const HYPOTHESES_SOURCE: Tracable = {
  source: 'Valeurs de départ du cahier des charges SOLVÉA',
  statut: 'hypothèses modifiables, à valider avec un installateur',
}

/** Tension batterie indicative selon la puissance crête (Wc). */
export const SEUILS_TENSION: readonly { jusquA: number; tensionV: number }[] = [
  { jusquA: 300, tensionV: 12 },
  { jusquA: 1500, tensionV: 24 },
  { jusquA: Infinity, tensionV: 48 },
]

/** Coefficient de sécurité appliqué au régulateur et à l'onduleur. */
export const MARGE_SECURITE = 1.25
/** Multiple de la puissance du frigo ajouté pour tenir compte du démarrage du compresseur. */
export const FACTEUR_DEMARRAGE_FROID = 2

export const TAILLES_REGULATEUR_A: readonly number[] = [20, 30, 40, 60, 80]
export const TAILLES_ONDULEUR_W: readonly number[] = [300, 500, 800, 1000, 1500, 2000, 3000]

/** Comparatif batteries : horizon et rythme de cyclage supposés. */
export const HORIZON_COMPARATIF_ANS = 10
export const CYCLES_PAR_AN = 365

// ---------------------------------------------------------------------------
// Profils types
// ---------------------------------------------------------------------------

export interface LigneProfil {
  appareilId: string
  quantite: number
  simultane: boolean
}

export interface ProfilType extends Tracable {
  id: string
  nom: string
  description: string
  lignes: readonly LigneProfil[]
}

const SOURCE_PROFIL = 'Composition illustrative définie pour la démonstration SOLVÉA'
const STATUT_PROFIL = 'exemple ajustable, à adapter au client réel'

export const PROFILS: readonly ProfilType[] = [
  {
    id: 'menage-modeste',
    nom: 'Ménage modeste',
    description: 'Éclairage, ventilateur, TV avec décodeur, recharge de téléphones.',
    lignes: [
      { appareilId: 'ampoule-led', quantite: 3, simultane: true },
      { appareilId: 'ventilateur', quantite: 1, simultane: true },
      { appareilId: 'tv-led', quantite: 1, simultane: true },
      { appareilId: 'decodeur', quantite: 1, simultane: true },
      { appareilId: 'chargeur-telephone', quantite: 2, simultane: false },
    ],
    source: SOURCE_PROFIL,
    statut: STATUT_PROFIL,
  },
  {
    // Reproduit exactement le test d'étalonnage (src/lib/solar/calc.test.ts).
    id: 'boutique',
    nom: 'Boutique',
    description: 'Éclairage, réfrigérateur, ventilateur, TV, recharge de téléphones.',
    lignes: [
      { appareilId: 'ampoule-led', quantite: 4, simultane: true },
      { appareilId: 'refrigerateur', quantite: 1, simultane: true },
      { appareilId: 'ventilateur', quantite: 1, simultane: true },
      { appareilId: 'tv-led', quantite: 1, simultane: true },
      { appareilId: 'chargeur-telephone', quantite: 3, simultane: true },
    ],
    source: SOURCE_PROFIL,
    statut: STATUT_PROFIL,
  },
  {
    id: 'atelier-couture',
    nom: 'Atelier de couture',
    description: 'Machines à coudre, éclairage, ventilateur, recharge de téléphones.',
    lignes: [
      { appareilId: 'machine-coudre', quantite: 2, simultane: true },
      { appareilId: 'ampoule-led', quantite: 4, simultane: true },
      { appareilId: 'ventilateur', quantite: 2, simultane: true },
      { appareilId: 'chargeur-telephone', quantite: 2, simultane: false },
    ],
    source: SOURCE_PROFIL,
    statut: STATUT_PROFIL,
  },
]
