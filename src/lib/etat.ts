import { APPAREILS, type AppareilCatalogue, type ProfilType } from '../data/solar-config'
import type { AppareilEntree } from './solar/calc'
import { lireNombre } from './saisie'

/** Ligne du tableau : les nombres restent du texte tant que l'utilisateur tape. */
export interface LigneUI {
  uid: number
  nom: string
  puissanceW: string
  quantite: string
  heuresParJour: string
  tauxMarche: string
  simultane: boolean
  froid: boolean
}

let compteur = 0
const prochainUid = () => ++compteur

export function ligneDepuisCatalogue(cat: AppareilCatalogue, quantite = 1, simultane = true): LigneUI {
  return {
    uid: prochainUid(),
    nom: cat.nom,
    puissanceW: String(cat.puissanceW),
    quantite: String(quantite),
    heuresParJour: String(cat.heuresParJour),
    tauxMarche: String(cat.tauxMarche),
    simultane,
    froid: cat.froid,
  }
}

export function ligneVide(): LigneUI {
  return { uid: prochainUid(), nom: '', puissanceW: '', quantite: '1', heuresParJour: '', tauxMarche: '1', simultane: true, froid: false }
}

export function lignesDepuisProfil(profil: ProfilType): LigneUI[] {
  return profil.lignes.map((l) => {
    const cat = APPAREILS.find((a) => a.id === l.appareilId)
    if (!cat) throw new Error(`Appareil inconnu : ${l.appareilId}`)
    return ligneDepuisCatalogue(cat, l.quantite, l.simultane)
  })
}

export function appareilDepuisLigne(l: LigneUI): AppareilEntree {
  return {
    nom: l.nom,
    puissanceW: lireNombre(l.puissanceW),
    quantite: lireNombre(l.quantite),
    heuresParJour: lireNombre(l.heuresParJour),
    tauxMarche: lireNombre(l.tauxMarche),
    simultane: l.simultane,
    froid: l.froid,
  }
}
