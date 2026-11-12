import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useState } from 'react'
import { depot } from './donnees'
import { Accueil } from './ui/Accueil'
import { Exercices } from './ui/Exercices'
import { Programmes } from './ui/Programmes'
import { Reglages } from './ui/Reglages'
import { FinSeance, SeanceEnCours } from './ui/Seance'

// Le graphique (Recharts) est chargé seulement à l'ouverture de l'onglet Progrès.
const Progres = lazy(() => import('./ui/Progres').then((m) => ({ default: m.Progres })))

const ONGLETS = [
  { id: 'seance', texte: 'Séance' },
  { id: 'exercices', texte: 'Exercices' },
  { id: 'programmes', texte: 'Programmes' },
  { id: 'progres', texte: 'Progrès' },
  { id: 'reglages', texte: 'Réglages' },
] as const

type Onglet = (typeof ONGLETS)[number]['id']

function ongletDepuisAdresse(): Onglet {
  const h = window.location.hash.replace(/^#\/?/, '')
  return ONGLETS.some((o) => o.id === h) ? (h as Onglet) : 'seance'
}

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>(ongletDepuisAdresse)
  const [finDe, setFinDe] = useState<string | null>(null)
  // `null` = pas de séance en cours ; `undefined` = chargement.
  const enCours = useLiveQuery(async () => (await depot.seanceEnCours()) ?? null)

  useEffect(() => {
    const surHash = () => setOnglet(ongletDepuisAdresse())
    window.addEventListener('hashchange', surHash)
    return () => window.removeEventListener('hashchange', surHash)
  }, [])

  const aller = (o: Onglet) => {
    window.location.hash = o
    setOnglet(o)
    window.scrollTo(0, 0)
  }

  let contenu = null
  if (onglet === 'seance') {
    if (enCours === undefined) contenu = null
    else if (enCours)
      contenu = (
        <SeanceEnCours
          key={enCours.id}
          seance={enCours}
          onTerminee={(programmeId, gardee) => {
            setFinDe(gardee ? programmeId : null)
            window.scrollTo(0, 0)
          }}
        />
      )
    else if (finDe) contenu = <FinSeance programmeId={finDe} onRetour={() => setFinDe(null)} />
    else
      contenu = (
        <Accueil
          allerA={aller}
          onDemarrer={(id) => {
            void depot.demarrerSeance(id)
            window.scrollTo(0, 0)
          }}
        />
      )
  } else if (onglet === 'exercices') contenu = <Exercices />
  else if (onglet === 'programmes') contenu = <Programmes />
  else if (onglet === 'progres') contenu = <Progres />
  else contenu = <Reglages />

  return (
    <>
      <main className="app">
        <Suspense fallback={null}>{contenu}</Suspense>
      </main>
      <nav className="onglets" aria-label="Navigation">
        {ONGLETS.map((o) => (
          <button key={o.id} aria-current={onglet === o.id ? 'page' : undefined} onClick={() => aller(o.id)}>
            {o.texte}
          </button>
        ))}
      </nav>
    </>
  )
}
