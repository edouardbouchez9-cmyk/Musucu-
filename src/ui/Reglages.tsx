import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { creerExemple } from '../db/exemple'
import type { Sauvegarde } from '../db/depot'
import type { Reglages as ReglagesEnregistres } from '../db/schema'
import { completerParametres, PARAMETRES_PAR_DEFAUT, type ParametresMoteur } from '../engine'
import { depot } from '../donnees'
import { ecrireNombre, Entete, lireNombre } from './commun'

type Champ = {
  regle: 'r1' | 'r5'
  cle: string
  texte: string
  aide?: string
  /** Affiche la valeur en pourcentage. */
  pourcent?: boolean
}

const CHAMPS: Champ[] = [
  { regle: 'r1', cle: 'incrementDefautPolyHaut', texte: 'Hausse d’un polyarticulaire du haut (kg)' },
  { regle: 'r1', cle: 'incrementDefautBas', texte: 'Hausse d’un exercice du bas (kg)' },
  { regle: 'r1', cle: 'incrementPctMin', texte: 'Hausse minimale (%)', pourcent: true },
  { regle: 'r1', cle: 'incrementPctMax', texte: 'Hausse maximale (%)', pourcent: true },
  {
    regle: 'r1',
    cle: 'seuilIncrementTropGros',
    texte: 'Incrément jugé trop gros (%)',
    aide: 'Au-delà, l’exercice progresse en reps dans une fourchette élargie.',
    pourcent: true,
  },
  { regle: 'r1', cle: 'elargissementFourchette', texte: 'Reps ajoutées à la fourchette élargie' },
  { regle: 'r5', cle: 'repsPlusRirMax', texte: 'Reps + RIR maximum pour estimer le 1RM' },
  { regle: 'r5', cle: 'seancesLissage', texte: 'Séances pour lisser le 1RM' },
  { regle: 'r5', cle: 'diviseur', texte: 'Diviseur de la formule du 1RM' },
]

function lire(p: ParametresMoteur, c: Champ): string {
  const v = (p[c.regle] as Record<string, number>)[c.cle]
  return ecrireNombre(c.pourcent ? Math.round(v * 1000) / 10 : v)
}

function Seuils() {
  const reglages = useLiveQuery(() => depot.reglages())
  return reglages ? <FormulaireSeuils reglages={reglages} /> : null
}

function FormulaireSeuils({ reglages }: { reglages: ReglagesEnregistres }) {
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAMPS.map((c) => [`${c.regle}.${c.cle}`, lire(reglages.parametres, c)])),
  )
  const [message, setMessage] = useState<string | null>(null)

  const enregistrer = async () => {
    const r1: Record<string, number> = {}
    const r5: Record<string, number> = {}
    for (const c of CHAMPS) {
      const n = lireNombre(valeurs[`${c.regle}.${c.cle}`])
      if (n === null || n < 0) return setMessage(`Valeur invalide : ${c.texte}.`)
      ;(c.regle === 'r1' ? r1 : r5)[c.cle] = c.pourcent ? n / 100 : n
    }
    await depot.enregistrerReglages({ ...reglages, parametres: completerParametres({ r1, r5 }) })
    setMessage('Seuils enregistrés. Ils s’appliquent à la prochaine séance.')
  }

  const reinitialiser = async () => {
    await depot.enregistrerReglages({ ...reglages, parametres: PARAMETRES_PAR_DEFAUT })
    setValeurs(Object.fromEntries(CHAMPS.map((c) => [`${c.regle}.${c.cle}`, lire(PARAMETRES_PAR_DEFAUT, c)])))
    setMessage('Valeurs par défaut rétablies.')
  }

  return (
    <details>
      <summary>Seuils des règles de progression</summary>
      <div className="formulaire">
        {CHAMPS.map((c) => {
          const k = `${c.regle}.${c.cle}`
          return (
            <label key={k}>
              <span className="etiquette">{c.texte}</span>
              <input inputMode="decimal" value={valeurs[k]} onChange={(e) => setValeurs({ ...valeurs, [k]: e.target.value })} />
              {c.aide && <span className="aide">{c.aide}</span>}
            </label>
          )
        })}
        {message && <p className="discret" role="status">{message}</p>}
        <div className="rangee-boutons">
          <button className="bouton principal" onClick={() => void enregistrer()}>
            Enregistrer les seuils
          </button>
          <button className="bouton" onClick={() => void reinitialiser()}>
            Rétablir les valeurs par défaut
          </button>
        </div>
      </div>
    </details>
  )
}

async function partagerFichier(nom: string, contenu: string) {
  const fichier = new File([contenu], nom, { type: 'application/json' })
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(fichier)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Sauvegardes() {
  const [message, setMessage] = useState<string | null>(null)
  const [persistant, setPersistant] = useState<boolean | null>(null)

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersistant)
  }, [])

  const exporter = async () => {
    const donnees = await depot.exporter()
    const jour = new Date().toISOString().slice(0, 10)
    await partagerFichier(`muscu-sauvegarde-${jour}.json`, JSON.stringify(donnees))
  }

  const importer = async (fichier: File) => {
    try {
      const donnees = JSON.parse(await fichier.text()) as Sauvegarde
      await depot.importer(donnees)
      setMessage(`Sauvegarde du ${new Date(donnees.exporteLe).toLocaleDateString('fr-FR')} importée.`)
    } catch (e) {
      setMessage(`Import impossible : ${(e as Error).message}`)
    }
  }

  return (
    <section className="section">
      <h2>Sauvegarde</h2>
      <p className="discret">
        Tes données restent sur ce téléphone. Exporte-les régulièrement : si tu supprimes l’app de l’écran d’accueil,
        elles disparaissent.
        {persistant === true && ' Le stockage est protégé contre le nettoyage automatique.'}
      </p>
      <div className="rangee-boutons">
        <button className="bouton" onClick={() => void exporter()}>
          Exporter mes données
        </button>
        <label className="bouton">
          Importer une sauvegarde
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importer(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {message && <p className="discret" role="status">{message}</p>}
    </section>
  )
}

export function Reglages() {
  const [exemple, setExemple] = useState(false)
  return (
    <>
      <Entete titre="Réglages" />
      <Seuils />
      <Sauvegardes />
      <section className="section">
        <h2>Programme d’exemple</h2>
        <p className="discret">Ajoute 5 exercices à Push et 5 à Pull, que tu pourras modifier ensuite.</p>
        <button
          className="bouton"
          disabled={exemple}
          onClick={() => void creerExemple(depot).then(() => setExemple(true))}
        >
          {exemple ? 'Exemple ajouté' : 'Ajouter l’exemple'}
        </button>
      </section>
    </>
  )
}
