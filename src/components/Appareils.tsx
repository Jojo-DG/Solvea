import { APPAREILS } from '../data/solar-config'
import { ligneDepuisCatalogue, ligneVide, type LigneUI } from '../lib/etat'
import { Champ } from './ui'

interface Props {
  lignes: LigneUI[]
  onChange: (l: LigneUI[]) => void
  /** Messages d'erreur indexés par clé (`appareil.<i>.<champ>`). */
  erreurs: Record<string, string>
}

const CHAMPS = [
  ['puissanceW', 'Puissance', 'W'],
  ['quantite', 'Quantité', ''],
  ['heuresParJour', 'Heures par jour', 'h'],
  ['tauxMarche', 'Taux de marche', '0–1'],
] as const

export default function Appareils({ lignes, onChange, erreurs }: Props) {
  const maj = (uid: number, patch: Partial<LigneUI>) => onChange(lignes.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))

  const ajouter = (valeur: string) => {
    if (valeur === '') return
    if (valeur === '__perso') return onChange([...lignes, ligneVide()])
    const cat = APPAREILS.find((a) => a.id === valeur)
    if (cat) onChange([...lignes, ligneDepuisCatalogue(cat)])
  }

  return (
    <div>
      {lignes.length === 0 ? (
        <p className="rounded-lg bg-paper px-3 py-4 text-sm text-muted">
          Aucun appareil. Choisissez un profil type ci-dessus ou ajoutez un appareil ci-dessous.
        </p>
      ) : (
        <>
          <div className="hidden grid-cols-[1.8fr_repeat(4,0.8fr)_auto_auto_auto] gap-2 px-1 pb-1 text-xs font-medium text-muted md:grid">
            <span>Appareil</span>
            {CHAMPS.map(([, lib, suf]) => (
              <span key={lib}>
                {lib}
                {suf && ` (${suf})`}
              </span>
            ))}
            <span title="Fonctionne en même temps que les autres : dimensionne l’onduleur">Simultané</span>
            <span title="Réfrigérateur ou congélateur : ajoute le courant de démarrage">Froid</span>
            <span className="sr-only">Retirer</span>
          </div>
          <ul className="space-y-3 md:space-y-2">
            {lignes.map((l, i) => {
              const k = (c: string) => `appareil.${i}.${c}`
              return (
                <li
                  key={l.uid}
                  className="grid grid-cols-2 gap-2 rounded-lg border border-paper-dark bg-paper/60 p-3 md:grid-cols-[1.8fr_repeat(4,0.8fr)_auto_auto_auto] md:items-start md:border-0 md:bg-transparent md:p-0"
                >
                  <div className="col-span-2 md:col-span-1">
                    <Champ id={`nom-${l.uid}`} label="Appareil" labelMasque value={l.nom} onChange={(v) => maj(l.uid, { nom: v })} placeholder="Nom de l’appareil" />
                  </div>
                  {CHAMPS.map(([champ, lib, suf]) => (
                    <Champ
                      key={champ}
                      id={`${champ}-${l.uid}`}
                      label={`${lib}${suf ? ` (${suf})` : ''}`}
                      labelMasque
                      value={l[champ]}
                      onChange={(v) => maj(l.uid, { [champ]: v })}
                      erreur={erreurs[k(champ)]}
                    />
                  ))}
                  <label className="flex items-center gap-2 text-sm md:justify-center md:pt-2">
                    <input type="checkbox" checked={l.simultane} onChange={(e) => maj(l.uid, { simultane: e.target.checked })} className="h-5 w-5 accent-energy" />
                    <span className="md:sr-only">Simultané</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm md:justify-center md:pt-2">
                    <input type="checkbox" checked={l.froid} onChange={(e) => maj(l.uid, { froid: e.target.checked })} className="h-5 w-5 accent-energy" />
                    <span className="md:sr-only">Appareil de froid</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onChange(lignes.filter((x) => x.uid !== l.uid))}
                    className="col-span-2 rounded-lg border border-paper-dark px-3 py-2 text-sm text-muted hover:border-red-600 hover:text-red-700 md:col-span-1"
                    aria-label={`Retirer ${l.nom || 'cet appareil'}`}
                  >
                    Retirer
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className="mt-4">
        <label htmlFor="ajout-appareil" className="mb-1 block text-sm font-medium">
          Ajouter un appareil
        </label>
        <select
          id="ajout-appareil"
          value=""
          onChange={(e) => ajouter(e.target.value)}
          className="w-full rounded-lg border border-paper-dark bg-white px-3 py-2 text-base focus:border-energy focus:outline-none focus:ring-2 focus:ring-energy-400/40 sm:w-80"
        >
          <option value="">Choisir…</option>
          {APPAREILS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom} ({a.puissanceW} W)
            </option>
          ))}
          <option value="__perso">Autre appareil (à saisir)</option>
        </select>
      </div>
      <p className="mt-3 text-xs text-muted">
        Valeurs du catalogue : <strong>ordre de grandeur à vérifier</strong>. Taux de marche : part du temps où l’appareil consomme sa puissance
        (0,4 pour un frigo). « Simultané » : l’appareil peut fonctionner en même temps que les autres.
      </p>
    </div>
  )
}
