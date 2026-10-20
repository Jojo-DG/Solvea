import { BATTERIES, type TypeBatterie } from '../data/solar-config'
import { decimal1, entier, fcfa } from '../lib/format'
import type { Cout, Resultat } from '../lib/solar/calc'

interface Props {
  r: Resultat
  cout: Cout
  batterie: TypeBatterie
  onBatterie: (b: TypeBatterie) => void
  puissanceModuleWc: number
}

function Carte({ titre, valeur, unite, children, className = '' }: { titre: string; valeur: string; unite: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`break-inside-avoid rounded-xl bg-white p-4 shadow-card ring-1 ring-paper-dark ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{titre}</h3>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums text-solar-600">{valeur}</span>
        <span className="text-sm font-medium text-forest-700">{unite}</span>
      </p>
      {children && <div className="mt-2 space-y-1 text-sm text-muted">{children}</div>}
    </div>
  )
}

export default function Resultats({ r, cout, batterie, onBatterie, puissanceModuleWc }: Props) {
  if (r.vide) {
    return (
      <p className="rounded-lg bg-paper px-3 py-4 text-sm text-muted">
        Aucune consommation pour l’instant : ajoutez des appareils (quantité et heures supérieures à 0) pour obtenir un dimensionnement.
      </p>
    )
  }
  const b = r.batterie
  const autre = r.batteries[b.type === 'lithium' ? 'plomb' : 'lithium']
  const lignesCout: [string, number | null][] = [
    ['Panneaux', cout.panneaux],
    ['Batterie', cout.batterie],
    ['Onduleur', cout.onduleur],
    ['Régulateur', cout.regulateur],
  ]
  const nbPrix = lignesCout.filter(([, v]) => v !== null).length

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Carte titre="Consommation" valeur={entier(r.energieWhJour)} unite="Wh/jour">
          <p>≈ {decimal1(r.energieWhJour / 1000)} kWh/jour</p>
          <p>À produire (avec pertes) : {entier(r.energiePvWhJour)} Wh/jour</p>
        </Carte>

        <Carte titre="Panneaux solaires" valeur={String(r.nbPanneaux)} unite={`× ${entier(puissanceModuleWc)} Wc`}>
          <p>
            Puissance installée : <strong className="text-carbon">{entier(r.puissanceInstalleeWc)} Wc</strong>
          </p>
          <p>Besoin calculé : {entier(r.puissanceCreteWc)} Wc</p>
        </Carte>

        <Carte titre="Batterie" valeur={entier(b.energieWh)} unite="Wh">
          <div className="no-print inline-flex rounded-lg bg-paper p-0.5" role="group" aria-label="Technologie de batterie">
            {(Object.keys(BATTERIES) as TypeBatterie[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={t === batterie}
                onClick={() => onBatterie(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${t === batterie ? 'bg-forest-800 text-white' : 'text-forest-700 hover:bg-paper-dark'}`}
              >
                {BATTERIES[t].nom}
              </button>
            ))}
          </div>
          <p className="hidden print:block">{BATTERIES[b.type].nom}</p>
          <p>
            <strong className="text-carbon">
              {entier(b.capaciteAh)} Ah à {b.tensionV} V
            </strong>{' '}
            (DoD {Math.round(b.dod * 100)} %)
          </p>
          <p>
            Pour comparaison, {BATTERIES[autre.type].nom} : {entier(autre.energieWh)} Wh, {entier(autre.capaciteAh)} Ah
          </p>
        </Carte>

        <Carte titre="Régulateur MPPT" valeur={entier(r.regulateur.tailleA)} unite="A">
          <p>Courant calculé : {decimal1(r.regulateur.courantCalculeA)} A (marge 25 %)</p>
          <p>Tension batterie : {b.tensionV} V (indicative, à valider)</p>
        </Carte>

        <Carte titre="Onduleur" valeur={entier(r.onduleur.tailleW)} unite="W">
          <p>Puissance calculée : {entier(r.onduleur.puissanceCalculeeW)} W (marge 25 %)</p>
          <p>
            Simultanés : {entier(r.onduleur.sommeSimultaneeW)} W + démarrage froid : {entier(r.onduleur.demarrageFroidW)} W
          </p>
        </Carte>

        <Carte titre="Coût estimé" valeur={cout.total !== null ? entier(cout.total) : '—'} unite={cout.total !== null ? 'FCFA' : ''} className="border-l-4 border-solar">
          {nbPrix === 0 ? (
            <p>Saisissez vos prix dans « Prix » pour obtenir un coût. Aucun prix n’est supposé par l’outil.</p>
          ) : (
            <>
              <ul>
                {lignesCout.map(([nom, v]) => (
                  <li key={nom} className="flex justify-between gap-2">
                    <span>{nom}</span>
                    <span className="tabular-nums">{v !== null ? fcfa(v) : 'prix manquant'}</span>
                  </li>
                ))}
              </ul>
              {cout.total === null && <p>Total disponible quand les 4 prix sont saisis.</p>}
            </>
          )}
          <p className="text-xs">Estimation à confirmer. Hors pose, câbles, protections et transport.</p>
        </Carte>
      </div>

      {r.avertissements.map((a) => (
        <p key={a} role="alert" className="rounded-lg bg-solar/15 px-3 py-2 text-sm text-forest-900 ring-1 ring-solar/40">
          {a}
        </p>
      ))}
    </div>
  )
}
