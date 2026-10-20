import { BATTERIES, HORIZON_COMPARATIF_ANS, type TypeBatterie } from '../data/solar-config'
import { entier, decimal1, fcfa } from '../lib/format'
import type { Comparatif } from '../lib/solar/calc'
import { Champ } from './ui'

export interface PrixTexte {
  panneau: string
  lithium: string
  plomb: string
  onduleur: string
  regulateur: string
  cyclesLithium: string
  cyclesPlomb: string
  co2: string
}

export const PRIX_TEXTE_VIDES: PrixTexte = {
  panneau: '',
  lithium: '',
  plomb: '',
  onduleur: '',
  regulateur: '',
  cyclesLithium: '',
  cyclesPlomb: '',
  co2: '',
}

interface Props {
  valeurs: PrixTexte
  onChange: (v: PrixTexte) => void
  erreurs: Record<string, string>
}

/** Formulaire des prix, durées de vie et facteur CO₂ (tous vides par défaut). */
export function PrixFormulaire({ valeurs, onChange, erreurs }: Props) {
  const set = (k: keyof PrixTexte) => (v: string) => onChange({ ...valeurs, [k]: v })
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Tous les champs sont vides : l’outil n’invente aucun prix. Saisissez des prix relevés auprès de vos fournisseurs
        (<em>estimation à confirmer</em>).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ id="prix-panneau" label="Panneau — estimation à confirmer" suffixe="FCFA/Wc" value={valeurs.panneau} onChange={set('panneau')} erreur={erreurs['prix.panneau']} />
        <Champ id="prix-lithium" label="Batterie lithium — estimation à confirmer" suffixe="FCFA/Wh" value={valeurs.lithium} onChange={set('lithium')} erreur={erreurs['prix.lithium']} />
        <Champ id="prix-plomb" label="Batterie plomb-acide — estimation à confirmer" suffixe="FCFA/Wh" value={valeurs.plomb} onChange={set('plomb')} erreur={erreurs['prix.plomb']} />
        <Champ id="prix-onduleur" label="Onduleur (taille recommandée) — estimation à confirmer" suffixe="FCFA" value={valeurs.onduleur} onChange={set('onduleur')} erreur={erreurs['prix.onduleur']} />
        <Champ id="prix-regulateur" label="Régulateur (taille recommandée) — estimation à confirmer" suffixe="FCFA" value={valeurs.regulateur} onChange={set('regulateur')} erreur={erreurs['prix.regulateur']} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-forest-800">Comparatif batteries sur {HORIZON_COMPARATIF_ANS} ans</h3>
        <p className="mb-2 text-xs text-muted">
          Durée de vie en cycles, à saisir d’après la fiche du fabricant (1 cycle par jour supposé). Rien n’est affiché tant que ce champ est vide.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ id="cycles-lithium" label="Durée de vie lithium" suffixe="cycles" value={valeurs.cyclesLithium} onChange={set('cyclesLithium')} erreur={erreurs['cycles.lithium']} />
          <Champ id="cycles-plomb" label="Durée de vie plomb-acide" suffixe="cycles" value={valeurs.cyclesPlomb} onChange={set('cyclesPlomb')} erreur={erreurs['cycles.plomb']} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-forest-800">CO₂ évité (facultatif)</h3>
        <div className="mt-2 sm:w-1/2">
          <Champ
            id="co2"
            label="Facteur d’émission remplacé — à sourcer"
            suffixe="kg CO₂/kWh"
            value={valeurs.co2}
            onChange={set('co2')}
            erreur={erreurs['co2']}
            aide="Source à citer (réseau, groupe électrogène…). Vide = rien n’est calculé."
          />
        </div>
      </div>
    </div>
  )
}

/** Résultats du comparatif ; ne rend rien tant qu'il n'y a pas de données. */
export function ComparatifResultat({ c }: { c: Comparatif | null }) {
  if (!c) return null
  const types = (Object.keys(c.lignes) as TypeBatterie[]).sort()
  return (
    <div className="break-inside-avoid rounded-xl bg-white p-4 shadow-card ring-1 ring-paper-dark">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Comparatif batteries sur {c.horizonAns} ans</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {types.map((t) => {
          const l = c.lignes[t]!
          return (
            <div key={t} className={`rounded-lg p-3 ring-1 ${c.moinsCher === t ? 'bg-energy/10 ring-energy' : 'bg-paper ring-paper-dark'}`}>
              <p className="font-semibold text-forest-800">{BATTERIES[t].nom}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-solar-600">{fcfa(l.coutHorizon)}</p>
              <p className="text-sm text-muted">
                {l.nbJeux} jeu{l.nbJeux > 1 ? 'x' : ''} de {fcfa(l.coutParJeu)} · durée de vie ≈ {decimal1(l.dureeVieAns)} an{l.dureeVieAns >= 2 ? 's' : ''}
              </p>
            </div>
          )
        })}
      </div>
      {c.moinsCher && (
        <p className="mt-2 text-sm text-forest-800">
          {c.moinsCher === 'egal' ? 'Coût équivalent sur la période.' : `Moins cher sur ${c.horizonAns} ans : ${BATTERIES[c.moinsCher].nom}.`}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">
        Batteries seules, remplacements inclus, sans actualisation, 1 cycle par jour. Estimation à confirmer avec vos prix et les fiches fabricant.
      </p>
    </div>
  )
}

export function Co2Resultat({ kgParAn }: { kgParAn: number | null }) {
  if (kgParAn === null) return null
  return (
    <div className="break-inside-avoid rounded-xl bg-white p-4 shadow-card ring-1 ring-paper-dark">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">CO₂ évité (à sourcer)</h3>
      <p className="mt-1">
        <span className="text-3xl font-bold tabular-nums text-solar-600">{entier(kgParAn)}</span>{' '}
        <span className="text-sm font-medium text-forest-700">kg CO₂/an</span>
      </p>
      <p className="mt-1 text-xs text-muted">Hypothèse : toute l’énergie consommée remplace une source émettant le facteur saisi.</p>
    </div>
  )
}
