/**
 * Calcul de dimensionnement d'un kit solaire autonome.
 * Fonctions pures : aucune dépendance au DOM, aucun appel réseau.
 * Les formules sont documentées dans `FORMULES` pour être affichées telles quelles dans l'interface.
 */
import {
  CYCLES_PAR_AN,
  FACTEUR_DEMARRAGE_FROID,
  HORIZON_COMPARATIF_ANS,
  MARGE_SECURITE,
  SEUILS_TENSION,
  TAILLES_ONDULEUR_W,
  TAILLES_REGULATEUR_A,
  type TypeBatterie,
} from '../../data/solar-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppareilEntree {
  nom: string
  puissanceW: number
  quantite: number
  heuresParJour: number
  /** 0–1 : part du temps où l'appareil consomme sa puissance nominale. */
  tauxMarche: number
  /** Fonctionne en même temps que les autres appareils simultanés (dimensionne l'onduleur). */
  simultane: boolean
  /** Appareil de froid : ajoute un courant de démarrage à l'onduleur. */
  froid?: boolean
}

export interface EntreeDimensionnement {
  appareils: readonly AppareilEntree[]
  /** Heures de soleil pic équivalentes (h/j). */
  hsp: number
  batterie: TypeBatterie
  /** N : jours d'autonomie. */
  autonomieJours: number
  /** η : rendement global. */
  rendement: number
  puissanceModuleWc: number
  /** Profondeur de décharge utilisable, par technologie. */
  dod: Record<TypeBatterie, number>
}

export interface ResultatBatterie {
  type: TypeBatterie
  dod: number
  energieWh: number
  tensionV: number
  capaciteAh: number
}

export interface Resultat {
  /** Aucune consommation saisie : tous les dimensionnements sont à zéro. */
  vide: boolean
  energieWhJour: number
  energiePvWhJour: number
  puissanceCreteWc: number
  nbPanneaux: number
  puissanceInstalleeWc: number
  tensionBatterieV: number
  /** Batterie du type choisi. */
  batterie: ResultatBatterie
  /** Les deux technologies, pour le comparatif. */
  batteries: Record<TypeBatterie, ResultatBatterie>
  regulateur: { courantCalculeA: number; tailleA: number; horsGamme: boolean }
  onduleur: {
    sommeSimultaneeW: number
    demarrageFroidW: number
    puissanceCalculeeW: number
    tailleW: number
    horsGamme: boolean
  }
  avertissements: string[]
}

export interface ProblemeSaisie {
  /** Identifiant du champ : `hsp`, `rendement`, `appareil.2.quantite`… */
  cle: string
  message: string
}

export class ErreurSaisie extends Error {
  readonly problemes: readonly ProblemeSaisie[]
  constructor(problemes: readonly ProblemeSaisie[]) {
    super(problemes.map((p) => p.message).join(' '))
    this.name = 'ErreurSaisie'
    this.problemes = problemes
  }
}

// ---------------------------------------------------------------------------
// Formules (texte affiché dans le panneau « Comment c'est calculé »)
// ---------------------------------------------------------------------------

export const FORMULES: readonly { titre: string; formule: string; note?: string }[] = [
  {
    titre: 'Consommation journalière',
    formule: 'E (Wh/j) = Σ (P × quantité × heures par jour × taux de marche)',
    note: 'Réfrigérateur et congélateur : 24 h/j avec un taux de marche de 0,4 (le compresseur ne tourne pas en continu).',
  },
  { titre: 'Énergie à produire', formule: 'E_pv = E / η', note: 'η = rendement global (pertes câbles, régulateur, onduleur, batterie, poussière).' },
  {
    titre: 'Panneaux',
    formule: 'P_crête (Wc) = E_pv / HSP ; panneaux = arrondi supérieur (P_crête / P_module)',
    note: 'HSP = heures de soleil pic équivalentes du site. Puissance installée = panneaux × P_module.',
  },
  {
    titre: 'Batterie',
    formule: 'Capacité (Wh) = E × N / DoD ; Ah = Wh / V',
    note: 'N = jours d’autonomie, DoD = profondeur de décharge (lithium LiFePO4 0,8 ; plomb-acide 0,5).',
  },
  {
    titre: 'Tension batterie (indicative)',
    formule: '12 V si P_crête ≤ 300 Wc ; 24 V jusqu’à 1 500 Wc ; 48 V au-delà',
    note: 'À valider avec l’installateur selon le matériel retenu.',
  },
  {
    titre: 'Régulateur MPPT',
    formule: 'I (A) = puissance installée / V × 1,25, arrondi à la taille standard supérieure (20, 30, 40, 60, 80 A)',
  },
  {
    titre: 'Onduleur',
    formule:
      'P (W) = (Σ puissances des appareils simultanés + 2 × P_frigo) × 1,25, arrondi à la taille standard supérieure (300, 500, 800, 1 000, 1 500, 2 000, 3 000 W)',
    note: '2 × P_frigo couvre le démarrage du compresseur ; il n’est compté que pour les appareils de froid marqués simultanés.',
  },
]

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const HSP_MAX = 12

const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function validerEntree(entree: EntreeDimensionnement): ProblemeSaisie[] {
  const p: ProblemeSaisie[] = []
  const ajouter = (cle: string, message: string) => p.push({ cle, message })

  if (!estNombre(entree.hsp)) ajouter('hsp', 'HSP : saisissez un nombre (heures de soleil pic par jour).')
  else if (entree.hsp <= 0) ajouter('hsp', 'HSP doit être strictement positif (heures de soleil pic par jour).')
  else if (entree.hsp > HSP_MAX) ajouter('hsp', `HSP ne peut pas dépasser ${HSP_MAX} h/j.`)

  if (!estNombre(entree.rendement)) ajouter('rendement', 'Rendement η : saisissez un nombre entre 0 et 1.')
  else if (entree.rendement <= 0 || entree.rendement > 1) ajouter('rendement', 'Rendement η doit être supérieur à 0 et au plus 1.')

  if (!estNombre(entree.autonomieJours)) ajouter('autonomieJours', 'Jours d’autonomie : saisissez un nombre.')
  else if (entree.autonomieJours <= 0) ajouter('autonomieJours', 'Jours d’autonomie doit être strictement positif.')

  if (!estNombre(entree.puissanceModuleWc)) ajouter('puissanceModuleWc', 'Puissance du module : saisissez un nombre en Wc.')
  else if (entree.puissanceModuleWc <= 0) ajouter('puissanceModuleWc', 'Puissance du module doit être strictement positive.')

  for (const type of ['lithium', 'plomb'] as const) {
    const dod = entree.dod[type]
    const nom = type === 'lithium' ? 'lithium' : 'plomb-acide'
    if (!estNombre(dod)) ajouter(`dod.${type}`, `DoD ${nom} : saisissez un nombre entre 0 et 1.`)
    else if (dod <= 0 || dod > 1) ajouter(`dod.${type}`, `DoD ${nom} doit être supérieur à 0 et au plus 1.`)
  }

  entree.appareils.forEach((a, i) => {
    const etiquette = a.nom.trim() || `Appareil ${i + 1}`
    const k = (champ: string) => `appareil.${i}.${champ}`
    if (!estNombre(a.puissanceW)) ajouter(k('puissanceW'), `${etiquette} : saisissez une puissance en W.`)
    else if (a.puissanceW < 0) ajouter(k('puissanceW'), `${etiquette} : la puissance ne peut pas être négative.`)

    if (!estNombre(a.quantite)) ajouter(k('quantite'), `${etiquette} : saisissez une quantité.`)
    else if (a.quantite < 0) ajouter(k('quantite'), `${etiquette} : la quantité ne peut pas être négative.`)
    else if (!Number.isInteger(a.quantite)) ajouter(k('quantite'), `${etiquette} : la quantité doit être un nombre entier.`)

    if (!estNombre(a.heuresParJour)) ajouter(k('heuresParJour'), `${etiquette} : saisissez un nombre d’heures par jour.`)
    else if (a.heuresParJour < 0 || a.heuresParJour > 24)
      ajouter(k('heuresParJour'), `${etiquette} : les heures par jour doivent être comprises entre 0 et 24.`)

    if (!estNombre(a.tauxMarche)) ajouter(k('tauxMarche'), `${etiquette} : saisissez un taux de marche entre 0 et 1.`)
    else if (a.tauxMarche < 0 || a.tauxMarche > 1)
      ajouter(k('tauxMarche'), `${etiquette} : le taux de marche doit être compris entre 0 et 1.`)
  })

  return p
}

// ---------------------------------------------------------------------------
// Briques de calcul
// ---------------------------------------------------------------------------

const EPS = 1e-9

/** Arrondi supérieur tolérant aux erreurs de virgule flottante (2,0000000001 -> 2). */
const plafond = (x: number): number => Math.ceil(x - EPS)

/** Plus petite taille standard ≥ valeur ; au-delà de la gamme, valeur arrondie et `horsGamme`. */
function tailleStandard(valeur: number, tailles: readonly number[]): { taille: number; horsGamme: boolean } {
  const t = tailles.find((s) => s >= valeur - EPS)
  return t === undefined ? { taille: plafond(valeur), horsGamme: true } : { taille: t, horsGamme: false }
}

export function energieJournaliere(appareils: readonly AppareilEntree[]): number {
  return appareils.reduce((s, a) => s + a.puissanceW * a.quantite * a.heuresParJour * a.tauxMarche, 0)
}

export function tensionBatterie(puissanceCreteWc: number): number {
  return (SEUILS_TENSION.find((s) => puissanceCreteWc <= s.jusquA) ?? SEUILS_TENSION[SEUILS_TENSION.length - 1]).tensionV
}

function dimensionBatterie(
  type: TypeBatterie,
  energieWhJour: number,
  autonomieJours: number,
  dod: number,
  tensionV: number,
): ResultatBatterie {
  const energieWh = (energieWhJour * autonomieJours) / dod
  return { type, dod, energieWh, tensionV, capaciteAh: energieWh / tensionV }
}

// ---------------------------------------------------------------------------
// Dimensionnement
// ---------------------------------------------------------------------------

/** Dimensionne le kit. Lève `ErreurSaisie` si une entrée est invalide. */
export function dimensionner(entree: EntreeDimensionnement): Resultat {
  const problemes = validerEntree(entree)
  if (problemes.length > 0) throw new ErreurSaisie(problemes)

  const { appareils, hsp, rendement, puissanceModuleWc, autonomieJours } = entree
  const avertissements: string[] = []

  const energieWhJour = energieJournaliere(appareils)
  const vide = energieWhJour <= 0

  const energiePvWhJour = energieWhJour / rendement
  const puissanceCreteWc = energiePvWhJour / hsp
  const nbPanneaux = vide ? 0 : plafond(puissanceCreteWc / puissanceModuleWc)
  const puissanceInstalleeWc = nbPanneaux * puissanceModuleWc

  const tensionBatterieV = tensionBatterie(puissanceCreteWc)
  const batteries = {
    lithium: dimensionBatterie('lithium', energieWhJour, autonomieJours, entree.dod.lithium, tensionBatterieV),
    plomb: dimensionBatterie('plomb', energieWhJour, autonomieJours, entree.dod.plomb, tensionBatterieV),
  }

  // Régulateur MPPT
  const courantCalculeA = (puissanceInstalleeWc / tensionBatterieV) * MARGE_SECURITE
  const reg = vide ? { taille: 0, horsGamme: false } : tailleStandard(courantCalculeA, TAILLES_REGULATEUR_A)
  if (reg.horsGamme) {
    avertissements.push(
      `Le régulateur calculé (${courantCalculeA.toFixed(0)} A) dépasse 80 A : prévoir plusieurs régulateurs en parallèle ou une tension supérieure.`,
    )
  }

  // Onduleur
  const actifs = appareils.filter((a) => a.simultane)
  const sommeSimultaneeW = actifs.reduce((s, a) => s + a.puissanceW * a.quantite, 0)
  const pFroidW = actifs.filter((a) => a.froid).reduce((s, a) => s + a.puissanceW * a.quantite, 0)
  const demarrageFroidW = FACTEUR_DEMARRAGE_FROID * pFroidW
  const puissanceCalculeeW = (sommeSimultaneeW + demarrageFroidW) * MARGE_SECURITE
  const ond = vide ? { taille: 0, horsGamme: false } : tailleStandard(puissanceCalculeeW, TAILLES_ONDULEUR_W)
  if (ond.horsGamme) {
    avertissements.push(
      `L’onduleur calculé (${puissanceCalculeeW.toFixed(0)} W) dépasse 3 000 W : étudier un étalement des usages ou plusieurs onduleurs.`,
    )
  }

  if (!vide && sommeSimultaneeW === 0) {
    avertissements.push('Aucun appareil n’est marqué simultané : la puissance d’onduleur calculée est nulle.')
  }

  return {
    vide,
    energieWhJour,
    energiePvWhJour,
    puissanceCreteWc,
    nbPanneaux,
    puissanceInstalleeWc,
    tensionBatterieV,
    batterie: batteries[entree.batterie],
    batteries,
    regulateur: { courantCalculeA, tailleA: reg.taille, horsGamme: reg.horsGamme },
    onduleur: {
      sommeSimultaneeW,
      demarrageFroidW,
      puissanceCalculeeW,
      tailleW: ond.taille,
      horsGamme: ond.horsGamme,
    },
    avertissements,
  }
}

// ---------------------------------------------------------------------------
// Coûts (uniquement à partir de prix saisis ; aucun prix par défaut)
// ---------------------------------------------------------------------------

/** `null` = champ laissé vide. */
export interface Prix {
  panneauFcfaParWc: number | null
  batterieFcfaParWh: Record<TypeBatterie, number | null>
  /** Prix de l'onduleur de la taille recommandée. */
  onduleurFcfa: number | null
  /** Prix du régulateur de la taille recommandée. */
  regulateurFcfa: number | null
}

export const PRIX_VIDES: Prix = {
  panneauFcfaParWc: null,
  batterieFcfaParWh: { lithium: null, plomb: null },
  onduleurFcfa: null,
  regulateurFcfa: null,
}

export interface Cout {
  panneaux: number | null
  batterie: number | null
  onduleur: number | null
  regulateur: number | null
  /** Défini seulement si les quatre prix sont saisis. */
  total: number | null
}

const produit = (a: number | null, b: number): number | null => (a === null ? null : a * b)

export function validerPrix(prix: Prix): ProblemeSaisie[] {
  const p: ProblemeSaisie[] = []
  const verifier = (cle: string, libelle: string, v: number | null) => {
    if (v === null) return
    if (!estNombre(v)) p.push({ cle, message: `${libelle} : saisissez un nombre.` })
    else if (v < 0) p.push({ cle, message: `${libelle} : le prix ne peut pas être négatif.` })
  }
  verifier('prix.panneau', 'Prix du panneau', prix.panneauFcfaParWc)
  verifier('prix.lithium', 'Prix de la batterie lithium', prix.batterieFcfaParWh.lithium)
  verifier('prix.plomb', 'Prix de la batterie plomb-acide', prix.batterieFcfaParWh.plomb)
  verifier('prix.onduleur', 'Prix de l’onduleur', prix.onduleurFcfa)
  verifier('prix.regulateur', 'Prix du régulateur', prix.regulateurFcfa)
  return p
}

export function calculerCout(resultat: Resultat, prix: Prix): Cout {
  const panneaux = produit(prix.panneauFcfaParWc, resultat.puissanceInstalleeWc)
  const batterie = produit(prix.batterieFcfaParWh[resultat.batterie.type], resultat.batterie.energieWh)
  const onduleur = prix.onduleurFcfa
  const regulateur = prix.regulateurFcfa
  const complet = !resultat.vide && panneaux !== null && batterie !== null && onduleur !== null && regulateur !== null
  return {
    panneaux,
    batterie,
    onduleur,
    regulateur,
    total: complet ? panneaux + batterie + onduleur + regulateur : null,
  }
}

// ---------------------------------------------------------------------------
// Comparatif lithium / plomb-acide sur 10 ans
// ---------------------------------------------------------------------------

export interface LigneComparatif {
  type: TypeBatterie
  /** Prix d'un jeu de batteries. */
  coutParJeu: number
  dureeVieAns: number
  /** Jeux achetés sur l'horizon (achat initial compris). */
  nbJeux: number
  coutHorizon: number
}

export interface Comparatif {
  horizonAns: number
  lignes: Partial<Record<TypeBatterie, LigneComparatif>>
  /** Défini seulement quand les deux technologies sont complètes. */
  moinsCher: TypeBatterie | 'egal' | null
}

/**
 * Coût des seules batteries sur l'horizon, à raison d'un cycle par jour.
 * Renvoie `null` tant qu'aucune durée de vie (cycles) n'est saisie avec un prix correspondant.
 */
export function comparerBatteries(
  resultat: Resultat,
  prix: Prix,
  cycles: Record<TypeBatterie, number | null>,
): Comparatif | null {
  if (resultat.vide) return null
  const lignes: Comparatif['lignes'] = {}
  for (const type of ['lithium', 'plomb'] as const) {
    const c = cycles[type]
    const px = prix.batterieFcfaParWh[type]
    if (c === null || px === null || !(c > 0) || px < 0) continue
    const coutParJeu = px * resultat.batteries[type].energieWh
    const nbJeux = Math.max(1, plafond((HORIZON_COMPARATIF_ANS * CYCLES_PAR_AN) / c))
    lignes[type] = { type, coutParJeu, dureeVieAns: c / CYCLES_PAR_AN, nbJeux, coutHorizon: nbJeux * coutParJeu }
  }
  const { lithium, plomb } = lignes
  if (!lithium && !plomb) return null
  let moinsCher: Comparatif['moinsCher'] = null
  if (lithium && plomb) {
    moinsCher =
      Math.abs(lithium.coutHorizon - plomb.coutHorizon) < 0.5 ? 'egal' : lithium.coutHorizon < plomb.coutHorizon ? 'lithium' : 'plomb'
  }
  return { horizonAns: HORIZON_COMPARATIF_ANS, lignes, moinsCher }
}

// ---------------------------------------------------------------------------
// CO₂ évité (facteur d'émission saisi par l'utilisateur, à sourcer)
// ---------------------------------------------------------------------------

/** kg CO₂ évités par an si l'énergie consommée remplace une source émettrice de `facteurKgParKwh`. */
export function co2EviteKgParAn(energieWhJour: number, facteurKgParKwh: number | null): number | null {
  if (facteurKgParKwh === null || !Number.isFinite(facteurKgParKwh) || facteurKgParKwh < 0) return null
  return ((energieWhJour * 365) / 1000) * facteurKgParKwh
}
