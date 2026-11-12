import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { SerieCible } from '../engine'
import type { Decision, Exercice, ExerciceDeSeance, Seance, Serie } from '../db/schema'
import { depot } from '../donnees'
import { ecrireNombre, genreDecision, lireNombre, resumeObjectif } from './commun'

interface Saisie {
  charge: number
  reps: number
  rir: number | null
}

function LigneSerie(props: {
  numero: number
  cible: SerieCible
  faite?: Serie
  chargeSuggeree: number | null
  onValider: (s: Saisie) => void
  onAnnuler: () => void
}) {
  const { cible, faite } = props
  const [charge, setCharge] = useState(ecrireNombre(faite?.charge ?? cible.charge))
  const [reps, setReps] = useState(String(faite?.reps ?? cible.reps))
  const [rir, setRir] = useState(faite?.rir === null || faite?.rir === undefined ? '' : String(faite.rir))
  const [erreur, setErreur] = useState(false)

  const valider = () => {
    const c = lireNombre(charge) ?? props.chargeSuggeree
    const r = lireNombre(reps)
    if (c === null || c < 0 || r === null || r < 0) {
      setErreur(true)
      return
    }
    setErreur(false)
    setCharge(ecrireNombre(c))
    props.onValider({ charge: c, reps: Math.round(r), rir: rir === '' ? null : Number(rir) })
  }

  const sousObjectif =
    faite && ((cible.charge !== null && faite.charge < cible.charge) || faite.reps < cible.reps)
  const verrou = Boolean(faite)

  return (
    <div className={`serie${faite ? ' faite' : ''}`}>
      <span className="numero" aria-label={`Série ${props.numero}`}>
        {props.numero}
      </span>
      <label className="champ">
        <input
          inputMode="decimal"
          aria-label={`Charge de la série ${props.numero}`}
          value={charge}
          placeholder={ecrireNombre(props.chargeSuggeree)}
          disabled={verrou}
          aria-invalid={erreur}
          onChange={(e) => setCharge(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        <span className="unite">kg</span>
      </label>
      <div className="reps">
        <button
          type="button"
          aria-label="Une rep de moins"
          disabled={verrou}
          onClick={() => setReps(String(Math.max(0, (lireNombre(reps) ?? 0) - 1)))}
        >
          −
        </button>
        <label className="champ">
          <input
            inputMode="numeric"
            aria-label={`Répétitions de la série ${props.numero}`}
            value={reps}
            disabled={verrou}
            onChange={(e) => setReps(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <span className="unite">reps</span>
        </label>
        <button
          type="button"
          aria-label="Une rep de plus"
          disabled={verrou}
          onClick={() => setReps(String((lireNombre(reps) ?? 0) + 1))}
        >
          +
        </button>
      </div>
      <label className="champ">
        <select
          aria-label={`RIR de la série ${props.numero} (facultatif)`}
          value={rir}
          disabled={verrou}
          onChange={(e) => setRir(e.target.value)}
        >
          <option value="">RIR</option>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              RIR {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="valider"
        aria-pressed={verrou}
        aria-label={faite ? `Annuler la validation de la série ${props.numero}` : `Valider la série ${props.numero}`}
        onClick={faite ? props.onAnnuler : valider}
      >
        ✓
      </button>
      {sousObjectif && (
        <span className="ecart">
          Objectif : {cible.charge === null ? '' : `${ecrireNombre(cible.charge)} kg × `}
          {cible.reps}
        </span>
      )}
      {erreur && <span className="ecart">Saisis une charge et un nombre de reps.</span>}
    </div>
  )
}

function BlocExercice(props: {
  seanceId: string
  config: ExerciceDeSeance
  exercice: Exercice
  decision: Decision
  series: Serie[]
}) {
  const { config, exercice, decision, series } = props
  const [supplementaires, setSupplementaires] = useState(0)
  const cibles = decision.sortie
  const derniereOrdre = series.reduce((m, s) => Math.max(m, s.ordre), -1)
  const nbLignes = Math.max(config.nbSeries, derniereOrdre + 1) + supplementaires
  const resume = resumeObjectif(cibles)

  return (
    <article className="exercice" data-decision={genreDecision(decision.regle)} aria-label={exercice.nom}>
      <h2>{exercice.nom}</h2>
      <p className="objectif">
        {resume.charge} <small>{resume.reps}</small>
      </p>
      <p className="explication">{decision.explication}</p>
      {Array.from({ length: nbLignes }, (_, i) => {
        const faite = series.find((s) => s.ordre === i)
        const cible: SerieCible = cibles[i] ??
          cibles[cibles.length - 1] ?? { charge: null, reps: config.repsMin, rirCible: config.rirCible }
        const precedente = [...series].filter((s) => s.ordre < i).sort((a, b) => b.ordre - a.ordre)[0]
        return (
          <LigneSerie
            key={i}
            numero={i + 1}
            cible={cible}
            faite={faite}
            chargeSuggeree={cible.charge ?? precedente?.charge ?? null}
            onValider={(s) =>
              void depot.enregistrerSerie({
                seanceId: props.seanceId,
                exerciceId: exercice.id,
                ordre: i,
                type: 'normale',
                ...s,
              })
            }
            onAnnuler={() => faite && void depot.supprimerSerie(faite.id)}
          />
        )
      })}
      <div className="actions-exercice">
        <button type="button" className="lien" onClick={() => setSupplementaires((n) => n + 1)}>
          Ajouter une série
        </button>
      </div>
    </article>
  )
}

export function SeanceEnCours(props: { seance: Seance; onTerminee: (programmeId: string, gardee: boolean) => void }) {
  const { seance } = props
  const programme = useLiveQuery(() => depot.programme(seance.programmeId), [seance.programmeId])
  const decisions = useLiveQuery(() => depot.decisionsDeSeance(seance.id), [seance.id])
  const series = useLiveQuery(() => depot.seriesDeSeance(seance.id), [seance.id])
  const exercices = useLiveQuery(
    () => Promise.all(seance.exercices.map((e) => depot.exercice(e.exerciceId))),
    [seance.id],
  )
  const [confirmation, setConfirmation] = useState<'aucune' | 'terminer' | 'abandonner'>('aucune')

  if (!decisions || !series || !exercices) return null

  const prevues = seance.exercices.reduce((n, e) => n + e.nbSeries, 0)
  const restantes = Math.max(0, prevues - series.length)
  const heure = new Date(seance.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const terminer = async () => {
    const resultat = await depot.terminerSeance(seance.id)
    props.onTerminee(seance.programmeId, resultat === 'terminee')
  }

  return (
    <>
      <header className="entete">
        <h1>{programme?.nom ?? 'Séance'}</h1>
        <span className="discret">
          Commencée à {heure}, {series.length} série{series.length > 1 ? 's' : ''} sur {prevues}
        </span>
      </header>

      {seance.exercices.map((config, i) => {
        const exercice = exercices[i]
        const decision = decisions.find((d) => d.id === config.decisionId)
        if (!exercice || !decision) return null
        return (
          <BlocExercice
            key={config.exerciceId}
            seanceId={seance.id}
            config={config}
            exercice={exercice}
            decision={decision}
            series={series.filter((s) => s.exerciceId === config.exerciceId)}
          />
        )
      })}

      {confirmation === 'aucune' && (
        <div className="barre-seance">
          <button className="bouton danger" onClick={() => setConfirmation('abandonner')}>
            Abandonner
          </button>
          <button className="bouton principal" onClick={() => setConfirmation('terminer')}>
            Terminer la séance
          </button>
        </div>
      )}
      {confirmation === 'terminer' && (
        <div className="section">
          <p>
            {restantes > 0
              ? `Il reste ${restantes} série${restantes > 1 ? 's' : ''} non validée${restantes > 1 ? 's' : ''}. Elles ne compteront pas.`
              : 'Toutes les séries sont validées.'}
          </p>
          <div className="barre-seance">
            <button className="bouton" onClick={() => setConfirmation('aucune')}>
              Continuer
            </button>
            <button className="bouton principal" onClick={() => void terminer()}>
              Terminer la séance
            </button>
          </div>
        </div>
      )}
      {confirmation === 'abandonner' && (
        <div className="section">
          <p>La séance et ses {series.length} séries seront supprimées.</p>
          <div className="barre-seance">
            <button className="bouton" onClick={() => setConfirmation('aucune')}>
              Continuer
            </button>
            <button
              className="bouton danger"
              onClick={() => void depot.annulerSeance(seance.id).then(() => props.onTerminee(seance.programmeId, false))}
            >
              Supprimer la séance
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function FinSeance(props: { programmeId: string; onRetour: () => void }) {
  const programme = useLiveQuery(() => depot.programme(props.programmeId), [props.programmeId])
  const objectifs = useLiveQuery(() => depot.objectifsProgramme(props.programmeId), [props.programmeId])
  if (!programme || !objectifs) return null

  return (
    <>
      <header className="entete">
        <h1>Séance enregistrée</h1>
      </header>
      <p>Tes objectifs pour le prochain {programme.nom} :</p>
      {objectifs.map(({ exercice, prescription }) => {
        const r = resumeObjectif(prescription.series)
        return (
          <article
            key={exercice.id}
            className="exercice"
            data-decision={genreDecision(prescription.regle)}
            aria-label={exercice.nom}
          >
            <h2>{exercice.nom}</h2>
            <p className="objectif">
              {r.charge} <small>{r.reps}</small>
            </p>
            <p className="explication">{prescription.explication}</p>
          </article>
        )
      })}
      <button className="bouton principal large" onClick={props.onRetour}>
        Retour à l’accueil
      </button>
    </>
  )
}
