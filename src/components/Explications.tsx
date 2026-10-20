import { VILLES, type Ville } from '../data/solar-config'
import { decimal1, decimal2, entier } from '../lib/format'
import { FORMULES, type Resultat } from '../lib/solar/calc'

interface Props {
  r: Resultat | null
  ville: Ville | undefined
  hsp: number
  rendement: number
  autonomieJours: number
  puissanceModuleWc: number
}

export default function Explications({ r, ville, hsp, rendement, autonomieJours, puissanceModuleWc }: Props) {
  const ligneVille = ville ?? VILLES[0]
  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-lg bg-solar/15 px-3 py-2 font-medium text-forest-900 ring-1 ring-solar/40" role="note">
        Estimation indicative, à valider avec un installateur.
      </p>

      <ol className="space-y-3">
        {FORMULES.map((f) => (
          <li key={f.titre}>
            <p className="font-semibold text-forest-800">{f.titre}</p>
            <p className="mt-0.5 rounded bg-paper px-2 py-1 font-mono text-[13px] leading-snug text-carbon">{f.formule}</p>
            {f.note && <p className="mt-0.5 text-xs text-muted">{f.note}</p>}
          </li>
        ))}
      </ol>

      {r && !r.vide && (
        <div>
          <p className="font-semibold text-forest-800">Avec vos données</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
            <li>
              E = {entier(r.energieWhJour)} Wh/j → E_pv = {entier(r.energieWhJour)} / {decimal2(rendement)} = {entier(r.energiePvWhJour)} Wh/j
            </li>
            <li>
              P_crête = {entier(r.energiePvWhJour)} / {decimal1(hsp)} = {entier(r.puissanceCreteWc)} Wc → {r.nbPanneaux} × {entier(puissanceModuleWc)} Wc ={' '}
              {entier(r.puissanceInstalleeWc)} Wc
            </li>
            <li>
              Batterie {entier(r.batterie.energieWh)} Wh = {entier(r.energieWhJour)} × {decimal1(autonomieJours)} / {decimal2(r.batterie.dod)} → {entier(r.batterie.capaciteAh)} Ah à {r.tensionBatterieV} V
            </li>
            <li>
              Régulateur : {entier(r.puissanceInstalleeWc)} / {r.tensionBatterieV} × 1,25 = {decimal1(r.regulateur.courantCalculeA)} A → {entier(r.regulateur.tailleA)} A
            </li>
            <li>
              Onduleur : ({entier(r.onduleur.sommeSimultaneeW)} + {entier(r.onduleur.demarrageFroidW)}) × 1,25 = {entier(r.onduleur.puissanceCalculeeW)} W → {entier(r.onduleur.tailleW)} W
            </li>
          </ul>
        </div>
      )}

      <div>
        <p className="font-semibold text-forest-800">Hypothèses et limites</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
          <li>
            HSP {decimal1(hsp)} h/j pour {ligneVille.nom} — statut : {ligneVille.statut}.
          </li>
          <li>Rendement global η = {decimal2(rendement)} ; autonomie N = {decimal1(autonomieJours)} jour(s) ; module {entier(puissanceModuleWc)} Wc.</li>
          <li>Puissances et durées des appareils : ordre de grandeur à vérifier sur les étiquettes réelles.</li>
          <li>Tension batterie, marge de 25 % et tailles standard : valeurs indicatives, à valider avec le matériel retenu.</li>
          <li>Pas de prise en compte de l’ombrage, de l’inclinaison, de la température ni du vieillissement des modules.</li>
          <li>Les prix et le CO₂ évité ne sont calculés que si vous les saisissez ; l’outil n’en suppose aucun.</li>
        </ul>
      </div>
    </div>
  )
}
