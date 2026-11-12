import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { Programme } from '../db/schema'
import { depot } from '../donnees'
import { Compteur, Entete } from './commun'

function EditeurProgramme(props: { programme: Programme; nomsExercices: Map<string, string>; disponibles: { id: string; nom: string }[] }) {
  const { programme } = props
  const [ajout, setAjout] = useState('')

  const modifier = (items: Programme['items']) => void depot.enregistrerProgramme({ ...programme, items })
  const deplacer = (i: number, sens: -1 | 1) => {
    const items = [...programme.items]
    const [x] = items.splice(i, 1)
    items.splice(i + sens, 0, x)
    modifier(items)
  }
  const restants = props.disponibles.filter((e) => !programme.items.some((i) => i.exerciceId === e.id))

  return (
    <section className="section" aria-label={programme.nom}>
      <h2>{programme.nom}</h2>
      {programme.items.length === 0 && <p className="discret">Aucun exercice dans ce programme.</p>}
      <ul className="liste">
        {programme.items.map((item, i) => (
          <li key={item.exerciceId} className="ligne-programme">
            <span>{props.nomsExercices.get(item.exerciceId) ?? 'Exercice supprimé'}</span>
            <Compteur
              etiquette="Nombre de séries"
              valeur={item.nbSeries}
              min={1}
              max={10}
              libelle={(n) => `${n} série${n > 1 ? 's' : ''}`}
              onChange={(nbSeries) => modifier(programme.items.map((x, j) => (j === i ? { ...x, nbSeries } : x)))}
            />
            <span>
              <button className="icone" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(i, -1)}>
                ↑
              </button>
              <button
                className="icone"
                aria-label="Descendre"
                disabled={i === programme.items.length - 1}
                onClick={() => deplacer(i, 1)}
              >
                ↓
              </button>
              <button
                className="icone"
                aria-label="Retirer du programme"
                onClick={() => modifier(programme.items.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      {restants.length > 0 && (
        <div className="formulaire" style={{ marginTop: 12 }}>
          <label>
            <span className="etiquette">Ajouter un exercice à {programme.nom}</span>
            <select
              value={ajout}
              onChange={(e) => {
                const id = e.target.value
                setAjout('')
                if (id) modifier([...programme.items, { exerciceId: id, nbSeries: 3 }])
              }}
            >
              <option value="">Choisir un exercice</option>
              {restants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </section>
  )
}

export function Programmes() {
  const programmes = useLiveQuery(() => depot.listerProgrammes())
  const exercices = useLiveQuery(() => depot.listerExercices())
  if (!programmes || !exercices) return null
  const noms = new Map(exercices.map((e) => [e.id, e.nom]))

  return (
    <>
      <Entete titre="Programmes" />
      {exercices.length === 0 && (
        <p className="discret">Crée d’abord tes exercices dans l’onglet Exercices.</p>
      )}
      {programmes.map((p) => (
        <EditeurProgramme key={p.id} programme={p} nomsExercices={noms} disponibles={exercices} />
      ))}
    </>
  )
}
