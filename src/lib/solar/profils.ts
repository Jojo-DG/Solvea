import { APPAREILS, type ProfilType } from '../../data/solar-config'
import type { AppareilEntree } from './calc'

/** Convertit un profil type en lignes d'appareils pour le calcul. */
export function appareilsDepuisProfil(profil: ProfilType): AppareilEntree[] {
  return profil.lignes.map((l) => {
    const cat = APPAREILS.find((a) => a.id === l.appareilId)
    if (!cat) throw new Error(`Appareil inconnu dans le profil « ${profil.nom} » : ${l.appareilId}`)
    return {
      nom: cat.nom,
      puissanceW: cat.puissanceW,
      quantite: l.quantite,
      heuresParJour: cat.heuresParJour,
      tauxMarche: cat.tauxMarche,
      simultane: l.simultane,
      froid: cat.froid,
    }
  })
}
