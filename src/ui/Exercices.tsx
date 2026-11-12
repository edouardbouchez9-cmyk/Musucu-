import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { nouvelId } from '../db/depot'
import { MUSCLES, type Exercice, type Muscle } from '../db/schema'
import { depot } from '../donnees'
import { ecrireNombre, Entete, lireNombre, Puces, Segments } from './commun'

const OPTIONS_MUSCLES = MUSCLES.map((m) => ({ valeur: m.id, texte: m.nom }))

function nouvelExercice(): Exercice {
  return {
    id: nouvelId(),
    nom: '',
    type: 'poly',
    zone: 'haut',
    repsMin: 8,
    repsMax: 12,
    rirCible: 2,
    incrementKg: 2.5,
    musclesDirects: [],
    musclesIndirects: [],
    variantes: [],
    archive: false,
    creeLe: new Date().toISOString(),
  }
}

function FormulaireExercice(props: { initial: Exercice; nouveau: boolean; onFermer: () => void }) {
  const [e, setE] = useState(props.initial)
  const [champs, setChamps] = useState({
    repsMin: String(props.initial.repsMin),
    repsMax: String(props.initial.repsMax),
    rirCible: String(props.initial.rirCible),
    incrementKg: ecrireNombre(props.initial.incrementKg),
  })
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmerArchive, setConfirmerArchive] = useState(false)

  const enregistrer = async () => {
    const repsMin = lireNombre(champs.repsMin)
    const repsMax = lireNombre(champs.repsMax)
    const rirCible = lireNombre(champs.rirCible)
    const incrementKg = lireNombre(champs.incrementKg)
    if (e.nom.trim() === '') return setErreur('Donne un nom à l’exercice.')
    if (repsMin === null || repsMax === null || repsMin < 1 || repsMax < repsMin)
      return setErreur('La fourchette doit aller d’au moins 1 rep à un maximum supérieur ou égal au minimum.')
    if (rirCible === null || rirCible < 0 || rirCible > 5) return setErreur('Le RIR cible doit être entre 0 et 5.')
    if (incrementKg === null || incrementKg <= 0) return setErreur('L’incrément doit être supérieur à 0 kg.')
    await depot.enregistrerExercice({
      ...e,
      nom: e.nom.trim(),
      repsMin: Math.round(repsMin),
      repsMax: Math.round(repsMax),
      rirCible: Math.round(rirCible),
      incrementKg,
    })
    props.onFermer()
  }

  const champ = (cle: keyof typeof champs) => ({
    value: champs[cle],
    onChange: (ev: { target: { value: string } }) => setChamps({ ...champs, [cle]: ev.target.value }),
  })

  return (
    <form
      className="formulaire"
      onSubmit={(ev) => {
        ev.preventDefault()
        void enregistrer()
      }}
    >
      <Entete titre={props.nouveau ? 'Nouvel exercice' : e.nom || 'Exercice'} />
      <label>
        <span className="etiquette">Nom</span>
        <input type="text" value={e.nom} onChange={(ev) => setE({ ...e, nom: ev.target.value })} autoFocus={props.nouveau} />
      </label>
      <fieldset>
        <legend>Type</legend>
        <Segments
          etiquette="Type"
          valeur={e.type}
          options={[
            { valeur: 'poly', texte: 'Polyarticulaire' },
            { valeur: 'isolation', texte: 'Isolation' },
          ]}
          onChange={(type) => setE({ ...e, type })}
        />
      </fieldset>
      <fieldset>
        <legend>Zone</legend>
        <Segments
          etiquette="Zone"
          valeur={e.zone}
          options={[
            { valeur: 'haut', texte: 'Haut du corps' },
            { valeur: 'bas', texte: 'Bas du corps' },
          ]}
          onChange={(zone) => setE({ ...e, zone })}
        />
      </fieldset>
      <fieldset>
        <legend>Muscles travaillés directement</legend>
        <Puces<Muscle>
          etiquette="Muscles directs"
          selection={e.musclesDirects}
          options={OPTIONS_MUSCLES}
          desactivees={e.musclesIndirects}
          onChange={(musclesDirects) => setE({ ...e, musclesDirects })}
        />
      </fieldset>
      <fieldset>
        <legend>Muscles travaillés indirectement</legend>
        <Puces<Muscle>
          etiquette="Muscles indirects"
          selection={e.musclesIndirects}
          options={OPTIONS_MUSCLES}
          desactivees={e.musclesDirects}
          onChange={(musclesIndirects) => setE({ ...e, musclesIndirects })}
        />
      </fieldset>
      <div className="deux-colonnes">
        <label>
          <span className="etiquette">Reps minimum</span>
          <input inputMode="numeric" {...champ('repsMin')} />
        </label>
        <label>
          <span className="etiquette">Reps maximum</span>
          <input inputMode="numeric" {...champ('repsMax')} />
        </label>
      </div>
      <div className="deux-colonnes">
        <label>
          <span className="etiquette">RIR cible</span>
          <input inputMode="numeric" {...champ('rirCible')} />
          <span className="aide">Reps gardées en réserve à chaque série.</span>
        </label>
        <label>
          <span className="etiquette">Plus petit incrément</span>
          <input inputMode="decimal" {...champ('incrementKg')} />
          <span className="aide">En kg : 2,5 pour une barre, 2 pour des haltères.</span>
        </label>
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <div className="rangee-boutons">
        <button type="submit" className="bouton principal">
          Enregistrer
        </button>
        <button type="button" className="bouton" onClick={props.onFermer}>
          Annuler
        </button>
      </div>
      {!props.nouveau && (
        <div className="section">
          {confirmerArchive ? (
            <>
              <p>L’exercice disparaît de tes programmes. Son historique reste dans tes données.</p>
              <button
                type="button"
                className="bouton danger"
                onClick={() => void depot.archiverExercice(e.id).then(props.onFermer)}
              >
                Supprimer l’exercice
              </button>
            </>
          ) : (
            <button type="button" className="lien danger" onClick={() => setConfirmerArchive(true)}>
              Supprimer l’exercice
            </button>
          )}
        </div>
      )}
    </form>
  )
}

export function Exercices() {
  const exercices = useLiveQuery(() => depot.listerExercices())
  const [edition, setEdition] = useState<{ exercice: Exercice; nouveau: boolean } | null>(null)

  if (edition) {
    return (
      <FormulaireExercice
        key={edition.exercice.id}
        initial={edition.exercice}
        nouveau={edition.nouveau}
        onFermer={() => setEdition(null)}
      />
    )
  }
  if (!exercices) return null

  return (
    <>
      <Entete titre="Exercices">
        <button className="bouton principal petit" onClick={() => setEdition({ exercice: nouvelExercice(), nouveau: true })}>
          Nouvel exercice
        </button>
      </Entete>
      {exercices.length === 0 ? (
        <p className="vide">Aucun exercice pour l’instant. Crée le premier avec le bouton ci-dessus.</p>
      ) : (
        <ul className="liste">
          {exercices.map((x) => (
            <li key={x.id}>
              <button className="ligne" onClick={() => setEdition({ exercice: x, nouveau: false })}>
                <span>
                  <span className="principal">{x.nom}</span>
                  <br />
                  <span className="discret">
                    {x.type === 'poly' ? 'Polyarticulaire' : 'Isolation'}, {x.repsMin} à {x.repsMax} reps, RIR{' '}
                    {x.rirCible}
                  </span>
                </span>
                <span className="discret" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
