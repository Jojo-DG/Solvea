import { useState } from 'react'
import Appareils from './components/Appareils'
import Explications from './components/Explications'
import { Co2Resultat, ComparatifResultat, PRIX_TEXTE_VIDES, PrixFormulaire, type PrixTexte } from './components/Prix'
import Resultats from './components/Resultats'
import { Card, Champ } from './components/ui'
import { BATTERIES, HYPOTHESES_DEFAUT, PROFILS, VILLE_AUTRE, VILLES, type TypeBatterie } from './data/solar-config'
import { appareilDepuisLigne, lignesDepuisProfil, type LigneUI } from './lib/etat'
import { decimal1, decimal2, entier } from './lib/format'
import { lireNombre, lireNombreOptionnel } from './lib/saisie'
import {
  calculerCout,
  co2EviteKgParAn,
  comparerBatteries,
  dimensionner,
  validerEntree,
  validerPrix,
  type EntreeDimensionnement,
  type Prix,
  type ProblemeSaisie,
} from './lib/solar/calc'

const PROFIL_INITIAL = PROFILS.find((p) => p.id === 'boutique')!

/** Message court pour un champ : retire le préfixe « Appareil : » du message complet. */
const court = (m: string) => (m.includes(' : ') ? m.slice(m.indexOf(' : ') + 3) : m)

function enErreurs(problemes: readonly ProblemeSaisie[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of problemes) if (!(p.cle in out)) out[p.cle] = court(p.message)
  return out
}

const nettoyer = (v: number | null): number | null => (v === null || !Number.isFinite(v) || v < 0 ? null : v)

export default function App() {
  const [villeId, setVilleId] = useState(VILLES[0].id)
  const [hspManuel, setHspManuel] = useState('')
  const [profilId, setProfilId] = useState<string | null>(PROFIL_INITIAL.id)
  const [lignes, setLignes] = useState<LigneUI[]>(() => lignesDepuisProfil(PROFIL_INITIAL))

  const [batterie, setBatterie] = useState<TypeBatterie>(HYPOTHESES_DEFAUT.batterie)
  const [rendement, setRendement] = useState(String(HYPOTHESES_DEFAUT.rendement))
  const [autonomie, setAutonomie] = useState(String(HYPOTHESES_DEFAUT.autonomieJours))
  const [moduleWc, setModuleWc] = useState(String(HYPOTHESES_DEFAUT.puissanceModuleWc))
  const [dodLithium, setDodLithium] = useState(String(BATTERIES.lithium.dod))
  const [dodPlomb, setDodPlomb] = useState(String(BATTERIES.plomb.dod))

  const [prixTexte, setPrixTexte] = useState<PrixTexte>(PRIX_TEXTE_VIDES)

  const ville = VILLES.find((v) => v.id === villeId)
  const hsp = ville?.hsp ?? lireNombre(hspManuel)

  const entree: EntreeDimensionnement = {
    appareils: lignes.map(appareilDepuisLigne),
    hsp,
    batterie,
    autonomieJours: lireNombre(autonomie),
    rendement: lireNombre(rendement),
    puissanceModuleWc: lireNombre(moduleWc),
    dod: { lithium: lireNombre(dodLithium), plomb: lireNombre(dodPlomb) },
  }

  const problemes = validerEntree(entree)
  const erreurs = enErreurs(problemes)
  const resultat = problemes.length === 0 ? dimensionner(entree) : null

  // Prix, cycles et CO₂ : toute valeur invalide est signalée et ignorée.
  const prixBrut: Prix = {
    panneauFcfaParWc: lireNombreOptionnel(prixTexte.panneau),
    batterieFcfaParWh: { lithium: lireNombreOptionnel(prixTexte.lithium), plomb: lireNombreOptionnel(prixTexte.plomb) },
    onduleurFcfa: lireNombreOptionnel(prixTexte.onduleur),
    regulateurFcfa: lireNombreOptionnel(prixTexte.regulateur),
  }
  const cyclesBruts = { lithium: lireNombreOptionnel(prixTexte.cyclesLithium), plomb: lireNombreOptionnel(prixTexte.cyclesPlomb) }
  const co2Brut = lireNombreOptionnel(prixTexte.co2)

  const problemesPrix: ProblemeSaisie[] = [...validerPrix(prixBrut)]
  for (const t of ['lithium', 'plomb'] as const) {
    const c = cyclesBruts[t]
    if (c !== null && (!Number.isFinite(c) || c <= 0))
      problemesPrix.push({ cle: `cycles.${t}`, message: `Durée de vie : saisissez un nombre de cycles strictement positif.` })
  }
  if (co2Brut !== null && (!Number.isFinite(co2Brut) || co2Brut < 0))
    problemesPrix.push({ cle: 'co2', message: 'Facteur CO₂ : saisissez un nombre positif.' })
  const erreursPrix = enErreurs(problemesPrix)

  const prix: Prix = {
    panneauFcfaParWc: nettoyer(prixBrut.panneauFcfaParWc),
    batterieFcfaParWh: { lithium: nettoyer(prixBrut.batterieFcfaParWh.lithium), plomb: nettoyer(prixBrut.batterieFcfaParWh.plomb) },
    onduleurFcfa: nettoyer(prixBrut.onduleurFcfa),
    regulateurFcfa: nettoyer(prixBrut.regulateurFcfa),
  }
  const cout = resultat ? calculerCout(resultat, prix) : null
  const comparatif = resultat
    ? comparerBatteries(resultat, prix, { lithium: nettoyer(cyclesBruts.lithium), plomb: nettoyer(cyclesBruts.plomb) })
    : null
  const co2 = resultat ? co2EviteKgParAn(resultat.energieWhJour, nettoyer(co2Brut)) : null

  const appliquerProfil = (id: string) => {
    const p = PROFILS.find((x) => x.id === id)
    if (!p) return
    setProfilId(id)
    setLignes(lignesDepuisProfil(p))
  }
  const modifierLignes = (l: LigneUI[]) => {
    setProfilId(null)
    setLignes(l)
  }

  const erreursAppareils = Object.fromEntries(Object.entries(erreurs).filter(([k]) => k.startsWith('appareil.')))
  const messagesBloquants = problemes.map((p) => p.message)

  return (
    <div className="min-h-screen bg-paper font-sans text-carbon print:bg-white">
      <header className="bg-forest-800 text-white print:bg-forest-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
            <circle cx="16" cy="16" r="6" fill="#D9A441" />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4
              return <line key={i} x1={16 + 10 * Math.cos(a)} y1={16 + 10 * Math.sin(a)} x2={16 + 13.5 * Math.cos(a)} y2={16 + 13.5 * Math.sin(a)} stroke="#E4B45C" strokeWidth="2" strokeLinecap="round" />
            })}
          </svg>
          <div>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">
              SOLVÉA <span className="font-medium text-solar-400">Dimensionneur</span>
            </h1>
            <p className="text-xs text-white/70 sm:text-sm">Kit solaire pour ménages et petits commerces — Bénin / Togo</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <Card title="1. Lieu et profil" className="print:hidden">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ville" className="mb-1 block text-sm font-medium">
                Ville
              </label>
              <select
                id="ville"
                value={villeId}
                onChange={(e) => setVilleId(e.target.value)}
                className="w-full rounded-lg border border-paper-dark bg-white px-3 py-2 text-base focus:border-energy focus:outline-none focus:ring-2 focus:ring-energy-400/40"
              >
                {VILLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom}
                  </option>
                ))}
              </select>
              {villeId === VILLE_AUTRE ? (
                <div className="mt-2">
                  <Champ id="hsp" label="HSP du site" suffixe="h/j" value={hspManuel} onChange={setHspManuel} erreur={erreurs['hsp']} aide="Heures de soleil pic, à lire sur PVGIS ou Global Solar Atlas." />
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  HSP = {decimal1(ville?.hsp ?? 0)} h/j — <strong>provisoire, {ville?.statut}</strong>.
                </p>
              )}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Profil type (pré-remplit le tableau)</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Profils types">
                {PROFILS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={profilId === p.id}
                    onClick={() => appliquerProfil(p.id)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      profilId === p.id ? 'border-forest-800 bg-forest-800 text-white' : 'border-paper-dark bg-white text-forest-800 hover:border-energy'
                    }`}
                  >
                    {p.nom}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">{PROFILS.find((p) => p.id === profilId)?.description ?? 'Tableau modifié : ajustez librement ci-dessous.'}</p>
            </div>
          </div>
        </Card>

        <Card title="2. Appareils" className="print:hidden">
          <Appareils lignes={lignes} onChange={modifierLignes} erreurs={erreursAppareils} />

          <details className="mt-5 rounded-lg border border-paper-dark">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-forest-800">Hypothèses avancées</summary>
            <div className="space-y-3 border-t border-paper-dark p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Champ id="rendement" label="Rendement global η" value={rendement} onChange={setRendement} erreur={erreurs['rendement']} aide="Entre 0 et 1 (défaut 0,70)." />
                <Champ id="autonomie" label="Jours d’autonomie N" suffixe="j" value={autonomie} onChange={setAutonomie} erreur={erreurs['autonomieJours']} />
                <Champ id="module" label="Puissance d’un module" suffixe="Wc" value={moduleWc} onChange={setModuleWc} erreur={erreurs['puissanceModuleWc']} />
                <Champ id="dod-lithium" label="DoD lithium LiFePO4" value={dodLithium} onChange={setDodLithium} erreur={erreurs['dod.lithium']} aide="Défaut 0,8." />
                <Champ id="dod-plomb" label="DoD plomb-acide" value={dodPlomb} onChange={setDodPlomb} erreur={erreurs['dod.plomb']} aide="Défaut 0,5." />
              </div>
              <p className="text-xs text-muted">Valeurs de départ du cahier des charges SOLVÉA : hypothèses modifiables, à valider avec un installateur.</p>
            </div>
          </details>
        </Card>

        <Card title="3. Résultats">
          {messagesBloquants.length > 0 ? (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-800 ring-1 ring-red-200">
              <p className="font-semibold">Corrigez les saisies pour obtenir le dimensionnement :</p>
              <ul className="mt-1 list-disc pl-5">
                {messagesBloquants.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            resultat &&
            cout && (
              <div className="space-y-3">
                <PrintRecap ville={ville?.nom ?? ''} hsp={hsp} lignes={lignes} rendement={entree.rendement} autonomie={entree.autonomieJours} module={entree.puissanceModuleWc} />
                <Resultats r={resultat} cout={cout} batterie={batterie} onBatterie={setBatterie} puissanceModuleWc={entree.puissanceModuleWc} />
                <ComparatifResultat c={comparatif} />
                <Co2Resultat kgParAn={co2} />
              </div>
            )
          )}

          <div className="no-print mt-4 flex flex-wrap items-center gap-3 print:hidden">
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-solar px-4 py-2.5 text-sm font-semibold text-forest-900 shadow-card hover:bg-solar-400">
              Imprimer / enregistrer en PDF
            </button>
            <span className="text-xs text-muted">Calcul 100 % local : aucune donnée n’est envoyée.</span>
          </div>
        </Card>

        <details className="rounded-xl bg-white shadow-card ring-1 ring-paper-dark print:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-base font-semibold text-forest-800">Prix, comparatif batteries et CO₂ (facultatif)</summary>
          <div className="border-t border-paper-dark p-4">
            <PrixFormulaire valeurs={prixTexte} onChange={setPrixTexte} erreurs={erreursPrix} />
          </div>
        </details>

        <Card title="Comment c’est calculé">
          <Explications
            r={resultat}
            ville={ville}
            hsp={Number.isFinite(hsp) ? hsp : 0}
            rendement={Number.isFinite(entree.rendement) ? entree.rendement : 0}
            autonomieJours={Number.isFinite(entree.autonomieJours) ? entree.autonomieJours : 0}
            puissanceModuleWc={Number.isFinite(entree.puissanceModuleWc) ? entree.puissanceModuleWc : 0}
          />
        </Card>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-muted">
        SOLVÉA Dimensionneur — Hackathon FIA 2026, Lomé. Estimation indicative, à valider avec un installateur.
      </footer>
    </div>
  )
}

/** Récapitulatif des données d'entrée, visible uniquement à l'impression. */
function PrintRecap({ ville, hsp, lignes, rendement, autonomie, module }: { ville: string; hsp: number; lignes: LigneUI[]; rendement: number; autonomie: number; module: number }) {
  return (
    <div className="hidden break-inside-avoid text-sm print:block">
      <p className="text-xs text-muted">Étude du {new Date().toLocaleDateString('fr-FR')}</p>
      <p>
        <strong>{ville}</strong> — HSP {decimal1(hsp)} h/j (à vérifier) · η {decimal2(rendement)} · N {decimal1(autonomie)} j · module {entier(module)} Wc
      </p>
      <table className="mt-2 w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-carbon/30">
            <th className="py-1">Appareil</th>
            <th>P (W)</th>
            <th>Qté</th>
            <th>h/j</th>
            <th>Taux</th>
            <th>Simultané</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.uid} className="border-b border-carbon/10">
              <td className="py-0.5">{l.nom || '—'}</td>
              <td>{l.puissanceW}</td>
              <td>{l.quantite}</td>
              <td>{l.heuresParJour}</td>
              <td>{l.tauxMarche}</td>
              <td>{l.simultane ? 'oui' : 'non'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
