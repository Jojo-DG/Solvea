import { describe, expect, it } from 'vitest'
import { BATTERIES, HYPOTHESES_DEFAUT, PROFILS } from '../../data/solar-config'
import {
  calculerCout,
  co2EviteKgParAn,
  comparerBatteries,
  dimensionner,
  ErreurSaisie,
  PRIX_VIDES,
  validerEntree,
  type AppareilEntree,
  type EntreeDimensionnement,
  type Prix,
} from './calc'
import { appareilsDepuisProfil } from './profils'

const ligne = (o: Partial<AppareilEntree> & Pick<AppareilEntree, 'nom' | 'puissanceW' | 'heuresParJour'>): AppareilEntree => ({
  quantite: 1,
  tauxMarche: 1,
  simultane: true,
  ...o,
})

/** Boutique du test d'étalonnage, écrite à la main (indépendante du catalogue). */
const boutique: AppareilEntree[] = [
  ligne({ nom: 'Ampoule LED', puissanceW: 9, quantite: 4, heuresParJour: 6 }),
  ligne({ nom: 'Réfrigérateur', puissanceW: 100, heuresParJour: 24, tauxMarche: 0.4, froid: true }),
  ligne({ nom: 'Ventilateur', puissanceW: 50, heuresParJour: 6 }),
  ligne({ nom: 'TV LED', puissanceW: 60, heuresParJour: 5 }),
  ligne({ nom: 'Chargeur', puissanceW: 10, quantite: 3, heuresParJour: 3 }),
]

const entree = (appareils: AppareilEntree[], surcharge: Partial<EntreeDimensionnement> = {}): EntreeDimensionnement => ({
  appareils,
  hsp: 5.0,
  batterie: 'lithium',
  autonomieJours: HYPOTHESES_DEFAUT.autonomieJours,
  rendement: HYPOTHESES_DEFAUT.rendement,
  puissanceModuleWc: HYPOTHESES_DEFAUT.puissanceModuleWc,
  dod: { lithium: BATTERIES.lithium.dod, plomb: BATTERIES.plomb.dod },
  ...surcharge,
})

describe('test d’étalonnage : boutique', () => {
  const r = dimensionner(entree(boutique))

  it('consommation E = 1 866 Wh/j', () => {
    expect(r.energieWhJour).toBeCloseTo(1866, 6)
  })
  it('P_crête ≈ 533 Wc -> 2 panneaux, 600 Wc installés', () => {
    expect(r.puissanceCreteWc).toBeCloseTo(533.14, 1)
    expect(r.nbPanneaux).toBe(2)
    expect(r.puissanceInstalleeWc).toBe(600)
  })
  it('tension 24 V', () => {
    expect(r.tensionBatterieV).toBe(24)
  })
  it('lithium : 2 333 Wh ≈ 97 Ah à 24 V', () => {
    expect(r.batteries.lithium.energieWh).toBeCloseTo(2332.5, 1)
    expect(Math.round(r.batteries.lithium.energieWh)).toBe(2333)
    expect(Math.round(r.batteries.lithium.capaciteAh)).toBe(97)
  })
  it('plomb-acide : 3 732 Wh ≈ 156 Ah', () => {
    expect(r.batteries.plomb.energieWh).toBeCloseTo(3732, 6)
    expect(Math.round(r.batteries.plomb.capaciteAh)).toBe(156)
  })
  it('régulateur ≈ 31 A -> MPPT 40 A', () => {
    expect(r.regulateur.courantCalculeA).toBeCloseTo(31.25, 2)
    expect(r.regulateur.tailleA).toBe(40)
  })
  it('onduleur ((36+100+50+60+30) + 200) × 1,25 ≈ 595 W -> 800 W', () => {
    expect(r.onduleur.sommeSimultaneeW).toBe(276)
    expect(r.onduleur.demarrageFroidW).toBe(200)
    expect(r.onduleur.puissanceCalculeeW).toBeCloseTo(595, 6)
    expect(r.onduleur.tailleW).toBe(800)
  })
  it('le batterie choisie suit le type sélectionné', () => {
    expect(r.batterie.type).toBe('lithium')
    expect(dimensionner(entree(boutique, { batterie: 'plomb' })).batterie.type).toBe('plomb')
  })
  it('le profil « Boutique » donne exactement le même résultat', () => {
    const profil = PROFILS.find((p) => p.id === 'boutique')!
    const rp = dimensionner(entree(appareilsDepuisProfil(profil)))
    expect(rp.energieWhJour).toBeCloseTo(1866, 6)
    expect(rp.nbPanneaux).toBe(2)
    expect(rp.regulateur.tailleA).toBe(40)
    expect(rp.onduleur.puissanceCalculeeW).toBeCloseTo(595, 6)
    expect(rp.onduleur.tailleW).toBe(800)
  })
})

describe('profils types', () => {
  it('tous les profils sont valides et dimensionnables', () => {
    for (const p of PROFILS) {
      const r = dimensionner(entree(appareilsDepuisProfil(p)))
      expect(r.vide).toBe(false)
      expect(r.nbPanneaux).toBeGreaterThan(0)
    }
  })
})

describe('arrondis et seuils', () => {
  it('ne sur-arrondit pas un nombre exact de panneaux', () => {
    // 1050 Wh/j / 0,7 / 5 = 300 Wc pile -> 1 panneau de 300 Wc
    const r = dimensionner(entree([ligne({ nom: 'X', puissanceW: 175, heuresParJour: 6 })]))
    expect(r.puissanceCreteWc).toBeCloseTo(300, 6)
    expect(r.nbPanneaux).toBe(1)
    expect(r.tensionBatterieV).toBe(12)
  })
  it('tension 48 V au-delà de 1 500 Wc', () => {
    const r = dimensionner(entree([ligne({ nom: 'Gros', puissanceW: 600, heuresParJour: 10 })]))
    expect(r.puissanceCreteWc).toBeGreaterThan(1500)
    expect(r.tensionBatterieV).toBe(48)
  })
  it('signale un onduleur hors gamme', () => {
    const r = dimensionner(entree([ligne({ nom: 'Atelier', puissanceW: 3000, heuresParJour: 1 })]))
    expect(r.onduleur.horsGamme).toBe(true)
    expect(r.onduleur.tailleW).toBeGreaterThanOrEqual(3750)
    expect(r.avertissements.length).toBeGreaterThan(0)
  })
  it('signale un régulateur hors gamme', () => {
    // 12 000 Wh/j -> 3 429 Wc -> 12 panneaux (3 600 Wc) à 48 V -> 93,75 A > 80 A
    const r = dimensionner(entree([ligne({ nom: 'Gros', puissanceW: 1000, heuresParJour: 12 })]))
    expect(r.tensionBatterieV).toBe(48)
    expect(r.regulateur.courantCalculeA).toBeCloseTo(93.75, 2)
    expect(r.regulateur.horsGamme).toBe(true)
    expect(r.regulateur.tailleA).toBe(94)
  })
  it('le démarrage du froid n’est compté que si le frigo est simultané', () => {
    const f = ligne({ nom: 'Frigo', puissanceW: 100, heuresParJour: 24, tauxMarche: 0.4, froid: true, simultane: false })
    const r = dimensionner(entree([f]))
    expect(r.onduleur.sommeSimultaneeW).toBe(0)
    expect(r.onduleur.demarrageFroidW).toBe(0)
  })
  it('hypothèses modifiables : η, N, module, DoD', () => {
    const r = dimensionner(
      entree(boutique, { rendement: 0.8, autonomieJours: 2, puissanceModuleWc: 400, dod: { lithium: 0.9, plomb: 0.6 } }),
    )
    expect(r.energiePvWhJour).toBeCloseTo(1866 / 0.8, 6)
    expect(r.nbPanneaux).toBe(Math.ceil(1866 / 0.8 / 5 / 400))
    expect(r.batteries.lithium.energieWh).toBeCloseTo((1866 * 2) / 0.9, 6)
    expect(r.batteries.plomb.energieWh).toBeCloseTo((1866 * 2) / 0.6, 6)
  })
})

describe('cas limites', () => {
  it('liste vide : tout à zéro, sans erreur', () => {
    const r = dimensionner(entree([]))
    expect(r.vide).toBe(true)
    expect(r.energieWhJour).toBe(0)
    expect(r.nbPanneaux).toBe(0)
    expect(r.puissanceInstalleeWc).toBe(0)
    expect(r.regulateur.tailleA).toBe(0)
    expect(r.onduleur.tailleW).toBe(0)
    expect(r.batterie.capaciteAh).toBe(0)
  })
  it('quantité 0 : la ligne ne consomme rien', () => {
    expect(dimensionner(entree([ligne({ nom: 'TV', puissanceW: 60, heuresParJour: 5, quantite: 0 })])).vide).toBe(true)
    const r = dimensionner(entree([...boutique, ligne({ nom: 'Fer', puissanceW: 1000, heuresParJour: 1, quantite: 0 })]))
    expect(r.energieWhJour).toBeCloseTo(1866, 6)
    expect(r.onduleur.tailleW).toBe(800)
  })
  it.each([0, -1, -5.5])('HSP = %s : erreur claire', (hsp) => {
    expect(() => dimensionner(entree(boutique, { hsp }))).toThrow(ErreurSaisie)
    expect(() => dimensionner(entree(boutique, { hsp }))).toThrow(/HSP/)
  })
  it('HSP NaN ou infini : erreur', () => {
    expect(() => dimensionner(entree(boutique, { hsp: NaN }))).toThrow(/HSP/)
    expect(() => dimensionner(entree(boutique, { hsp: Infinity }))).toThrow(/HSP/)
  })
  it('valeurs négatives : erreur nommant l’appareil', () => {
    const neg = [ligne({ nom: 'Lampe', puissanceW: -9, heuresParJour: 6 })]
    expect(() => dimensionner(entree(neg))).toThrow(/Lampe.*négative/)
    expect(() => dimensionner(entree([ligne({ nom: 'Lampe', puissanceW: 9, heuresParJour: 6, quantite: -2 })]))).toThrow(/quantité/)
    expect(() => dimensionner(entree([ligne({ nom: 'Lampe', puissanceW: 9, heuresParJour: -1 })]))).toThrow(/heures/)
  })
  it('heures > 24, taux hors [0,1], quantité non entière, NaN : erreurs', () => {
    const cles = (a: AppareilEntree) => validerEntree(entree([a])).map((p) => p.cle)
    expect(cles(ligne({ nom: 'A', puissanceW: 9, heuresParJour: 25 }))).toEqual(['appareil.0.heuresParJour'])
    expect(cles(ligne({ nom: 'A', puissanceW: 9, heuresParJour: 5, tauxMarche: 1.2 }))).toEqual(['appareil.0.tauxMarche'])
    expect(cles(ligne({ nom: 'A', puissanceW: 9, heuresParJour: 5, quantite: 1.5 }))).toEqual(['appareil.0.quantite'])
    expect(cles(ligne({ nom: 'A', puissanceW: NaN, heuresParJour: 5 }))).toEqual(['appareil.0.puissanceW'])
  })
  it('hypothèses invalides : η, N, module, DoD', () => {
    expect(() => dimensionner(entree(boutique, { rendement: 0 }))).toThrow(/η/)
    expect(() => dimensionner(entree(boutique, { rendement: 1.5 }))).toThrow(/η/)
    expect(() => dimensionner(entree(boutique, { autonomieJours: 0 }))).toThrow(/autonomie/)
    expect(() => dimensionner(entree(boutique, { puissanceModuleWc: -300 }))).toThrow(/module/)
    expect(() => dimensionner(entree(boutique, { dod: { lithium: 0, plomb: 0.5 } }))).toThrow(/DoD/)
  })
  it('ErreurSaisie expose la liste des problèmes', () => {
    try {
      dimensionner(entree(boutique, { hsp: 0, rendement: 0 }))
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(ErreurSaisie)
      expect((e as ErreurSaisie).problemes.map((p) => p.cle)).toEqual(['hsp', 'rendement'])
    }
  })
})

describe('coûts : uniquement sur prix saisis', () => {
  const r = dimensionner(entree(boutique))

  it('aucun prix -> aucun coût', () => {
    expect(calculerCout(r, PRIX_VIDES)).toEqual({ panneaux: null, batterie: null, onduleur: null, regulateur: null, total: null })
  })
  it('prix partiels -> lignes partielles, pas de total', () => {
    const c = calculerCout(r, { ...PRIX_VIDES, panneauFcfaParWc: 2 })
    expect(c.panneaux).toBe(1200)
    expect(c.total).toBeNull()
  })
  it('tous les prix -> total (valeurs fictives de test)', () => {
    const prix: Prix = {
      panneauFcfaParWc: 2,
      batterieFcfaParWh: { lithium: 3, plomb: 1 },
      onduleurFcfa: 1000,
      regulateurFcfa: 500,
    }
    const c = calculerCout(r, prix)
    expect(c.panneaux).toBe(1200)
    expect(c.batterie).toBeCloseTo(3 * 2332.5, 6)
    expect(c.total).toBeCloseTo(1200 + 3 * 2332.5 + 1000 + 500, 6)
  })
  it('le prix de la batterie suit la technologie choisie', () => {
    const rp = dimensionner(entree(boutique, { batterie: 'plomb' }))
    const c = calculerCout(rp, { ...PRIX_VIDES, batterieFcfaParWh: { lithium: 3, plomb: 1 } })
    expect(c.batterie).toBeCloseTo(3732, 6)
  })
})

describe('comparatif lithium / plomb-acide', () => {
  const r = dimensionner(entree(boutique))
  const prix: Prix = { ...PRIX_VIDES, batterieFcfaParWh: { lithium: 4, plomb: 1 } }

  it('n’affiche rien tant que la durée de vie est vide', () => {
    expect(comparerBatteries(r, prix, { lithium: null, plomb: null })).toBeNull()
  })
  it('n’affiche rien sans prix', () => {
    expect(comparerBatteries(r, PRIX_VIDES, { lithium: 3000, plomb: 500 })).toBeNull()
  })
  it('compte les remplacements sur 10 ans (valeurs fictives de test)', () => {
    const c = comparerBatteries(r, prix, { lithium: 3650, plomb: 1000 })!
    expect(c.lignes.lithium!.nbJeux).toBe(1)
    expect(c.lignes.plomb!.nbJeux).toBe(4) // ceil(3650 / 1000)
    expect(c.lignes.plomb!.coutHorizon).toBeCloseTo(4 * 3732, 6)
    expect(c.moinsCher).toBe('lithium') // 4 × 2332,5 = 9330 < 4 × 3732 = 14928
  })
  it('une seule technologie renseignée : pas de verdict', () => {
    const c = comparerBatteries(r, prix, { lithium: 3650, plomb: null })!
    expect(c.lignes.plomb).toBeUndefined()
    expect(c.moinsCher).toBeNull()
  })
  it('durée de vie nulle ou négative ignorée', () => {
    expect(comparerBatteries(r, prix, { lithium: 0, plomb: -5 })).toBeNull()
  })
})

describe('CO₂ évité', () => {
  it('vide tant que le facteur n’est pas saisi', () => {
    expect(co2EviteKgParAn(1866, null)).toBeNull()
  })
  it('E × 365 / 1000 × facteur', () => {
    expect(co2EviteKgParAn(1000, 0.5)).toBeCloseTo(182.5, 6)
  })
  it('facteur négatif ou NaN ignoré', () => {
    expect(co2EviteKgParAn(1000, -1)).toBeNull()
    expect(co2EviteKgParAn(1000, NaN)).toBeNull()
  })
})
