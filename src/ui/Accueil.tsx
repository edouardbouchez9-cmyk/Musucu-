import { useLiveQuery } from 'dexie-react-hooks'
import { chargerMonProgramme } from '../db/mon-programme'
import type { Programme, Seance } from '../db/schema'
import { depot } from '../donnees'
import { cibleCompacte, dateRelative, Entete } from './commun'

function CarteProgramme(props: {
  programme: Programme
  derniere?: Seance
  suivant: boolean
  onDemarrer: () => void
}) {
  const { programme, derniere, suivant } = props
  const objectifs = useLiveQuery(() => depot.objectifsProgramme(programme.id), [programme.id])

  return (
    <section className={`programme${suivant ? ' suivant' : ''}`} aria-label={programme.nom}>
      <div className="titre">
        <span className="nom">{programme.nom}</span>
        <span className="discret">
          {suivant ? 'À faire ensuite' : derniere ? `Fait ${dateRelative(derniere.debut)}` : 'Jamais fait'}
        </span>
      </div>
      {programme.items.length === 0 ? (
        <p className="discret">Aucun exercice. Ajoute-en dans l’onglet Programmes.</p>
      ) : (
        <>
          <ul className="apercu">
            {objectifs?.map(({ exercice, prescription }) => {
              return (
                <li key={exercice.id}>
                  <span>{exercice.nom}</span>
                  <span className="cible">{cibleCompacte(prescription.series)}</span>
                </li>
              )
            })}
          </ul>
          <button className={`bouton large${suivant ? ' principal' : ''}`} onClick={props.onDemarrer}>
            Démarrer {programme.nom}
          </button>
        </>
      )}
    </section>
  )
}

export function Accueil(props: { onDemarrer: (programmeId: string) => void; allerA: (onglet: 'exercices') => void }) {
  const programmes = useLiveQuery(() => depot.listerProgrammes())
  const dernieres = useLiveQuery(() => depot.dernieresSeances(50))
  if (!programmes || !dernieres) return null

  const derniereDe = (id: string) => dernieres.find((s) => s.programmeId === id)
  const avecExercices = programmes.filter((p) => p.items.length > 0)

  if (avecExercices.length === 0) {
    return (
      <>
        <Entete titre="Séance" />
        <div className="vide">
          <p>
            Ajoute tes exercices, puis range-les dans Push et Pull. L’app calculera ensuite tes objectifs à chaque
            séance.
          </p>
          <div className="rangee-boutons">
            <button className="bouton principal" onClick={() => props.allerA('exercices')}>
              Ajouter un exercice
            </button>
            <button className="bouton" onClick={() => void chargerMonProgramme(depot)}>
              Charger mon programme Hevy
            </button>
          </div>
        </div>
      </>
    )
  }

  // Le programme à faire ensuite est celui fait le moins récemment.
  const suivant = [...avecExercices].sort((a, b) =>
    (derniereDe(a.id)?.debut ?? '').localeCompare(derniereDe(b.id)?.debut ?? ''),
  )[0]

  return (
    <>
      <Entete titre="Séance" />
      <div className="pile">
        {programmes.map((p) => (
          <CarteProgramme
            key={p.id}
            programme={p}
            derniere={derniereDe(p.id)}
            suivant={p.id === suivant.id}
            onDemarrer={() => props.onDemarrer(p.id)}
          />
        ))}
      </div>
    </>
  )
}
